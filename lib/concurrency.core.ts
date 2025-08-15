import { Browser, Page, ResourceType } from 'puppeteer'; // Import necessary Puppeteer types
// AbortSignal is globally available in Node v16.14+

// --- Type Definitions ---

/** Log entry structure */
export interface LogEntry {
    timestamp: Date;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';
    message: string;
    url?: string;
    attempt?: number; // Include attempt number for retries
}

/** Statistics collected during the run */
export interface RunStats {
    startTime: Date;
    endTime: Date;
    durationMs: number;
    totalUrlsProvided: number;
    totalUrlsAttempted: number; // Unique URLs attempted
    totalSuccess: number; // Count of URLs that succeeded eventually
    totalFailed: number; // Count of URLs that failed all attempts
    totalRetriesMade: number; // Total retry attempts made across all URLs
}

/** Options for individual tasks run by the concurrent processor. */
export interface TaskOptions {
    /** Optional AbortSignal to allow cancelling the task. Uses built-in AbortSignal type. */
    signal?: AbortSignal;
    /** Optional array of resource types to block for this task. */
    blockResources?: ResourceType[];
}

/**
 * Defines the signature for a task function that processes a single URL in a browser tab.
 * This function should THROW errors that are meant to be retried (e.g., TimeoutError).
 * @template T The type of item expected in the result array from processing one URL.
 * @param browser The Puppeteer Browser instance.
 * @param url The URL to process.
 * @param options Optional configuration for the task, including signal and resource blocking.
 * @returns A Promise resolving to an array of results of type T.
 * @throws {Error} Should throw errors (e.g., TimeoutError) if the operation fails and should be retried.
 */
export type TaskFunction<T> = (
    browser: Browser,
    url: string,
    options: TaskOptions // Pass options object
) => Promise<T[]>;

/**
 * Defines the structure for the results returned by the concurrent processor.
 * @template T The type of item collected by the task function.
 */
export interface ProcessUrlsResult<T> {
    /** Array of results collected from successful task executions. */
    successfulResults: T[];
    /** Array of tasks that failed even after retries. */
    failedTasks: { url: string; error: Error }[];
    /** Detailed log history of the execution. */
    logHistory: LogEntry[];
    /** Summary statistics of the execution run. */
    stats: RunStats;
}

/**
 * Configuration options for the processUrlsConcurrentlyInTabs function.
 */
export interface ProcessUrlsOptions {
     /** The concurrency mode ('portions' or 'threads'). Defaults to 'threads'. */
    mode?: 'portions' | 'threads';
     /** Max number of retries for a failed task. Defaults to 0. */
    maxRetries?: number;
    /** Delay in milliseconds before retrying. Defaults to 500ms. Can be a function receiving attempt number: `(attempt) => delay`. */
    retryDelayMs?: number | ((attempt: number) => number);
    /** Optional AbortSignal to cancel the entire operation. Uses built-in AbortSignal type. */
    signal?: AbortSignal;
    /** Optional array of resource types (e.g., 'image', 'stylesheet', 'script', 'font') to block for all tasks run by this processor. The taskFunction needs to implement the blocking logic based on this. */
    blockResources?: ResourceType[];
    /** Optional callback executed after each task attempt (success or final failure): `(completedCount, totalCount, stats) => void | Promise<void>`. */
    onProgress?: (completedCount: number, totalCount: number, stats: RunStats) => void | Promise<void>;
    /** Optional callback executed when a task fails its final retry: `(error, url, attempt) => void | Promise<void>`. */
    onError?: (error: Error, url: string, attempt: number) => void | Promise<void>; // Pass attempt number
    /** Optional function to determine if an error is retryable. Defaults to checking for TimeoutError. */
    isRetryable?: (error: Error) => boolean;
    /** If true, logs messages directly to console during execution. Defaults to true. */
    logToConsole?: boolean;
}


// --- Reusable Concurrency Function ---

/**
 * Processes a list of URLs concurrently by opening tabs in a single browser instance.
 * Enhanced with retries, progress/error callbacks, structured results (incl. logs/stats), cancellation and resource blocking options.
 * Supports two modes: "portions" and "threads".
 * NOTE: For retries to work on specific errors (like TimeoutError), the provided `taskFunction` MUST throw those errors instead of catching them internally.
 *
 * @template T The type of item expected from the task function.
 * @param browser Puppeteer Browser instance.
 * @param urls Array of URLs to process.
 * @param maxConcurrency Max concurrent tabs/workers.
 * @param taskFunction Async function to execute for each URL.
 * @param options Optional configuration object.
 * @returns Promise resolving to a ProcessUrlsResult<T> object.
 */
export const processUrlsConcurrentlyInTabs = async <T>(
    browser: Browser,
    urls: string[],
    maxConcurrency: number,
    taskFunction: TaskFunction<T>,
    options: ProcessUrlsOptions = {}
): Promise<ProcessUrlsResult<T>> => {

    const {
        mode = 'threads',
        maxRetries = 0,
        retryDelayMs = 500,
        signal,
        blockResources,
        onProgress,
        onError,
        isRetryable = (error: Error) => error.name === 'TimeoutError',
        logToConsole = true,
    } = options;

    const logHistory: LogEntry[] = [];
    const successfulResults: T[] = [];
    const failedTasks: { url: string; error: Error }[] = [];
    let completedCount = 0;
    let totalRetriesMade = 0;
    const startTime = new Date();

    const log = (level: LogEntry['level'], message: string, url?: string, attempt?: number) => {
        const entry: LogEntry = { timestamp: new Date(), level, message, url, attempt };
        logHistory.push(entry);
        if (logToConsole) {
            const parts = [ `[${level}]`, message ];
            if (url) parts.push(`(URL: ${url})`);
            if (attempt !== undefined) parts.push(`(Attempt: ${attempt})`);
            switch(level) {
                case 'ERROR': console.error(...parts); break;
                case 'WARN': console.warn(...parts); break;
                case 'SUCCESS': console.log(...parts); break;
                case 'INFO':
                case 'DEBUG':
                default: console.log(...parts); break;
            }
        }
    };

    const executeTaskWithRetries = async (url: string): Promise<void> => {
        let attempts = 0;
        let taskResult: T[] | null = null;
        let lastError: Error | null = null;
        const taskOptions: TaskOptions = { signal, blockResources };

        log('DEBUG', `Starting task`, url, attempts + 1);

        while (attempts <= maxRetries) {
            if (signal?.aborted) {
                log('WARN', `Operation aborted`, url, attempts + 1);
                lastError = new Error('Operation aborted');
                break;
            }

            try {
                taskResult = await taskFunction(browser, url, taskOptions);
                lastError = null;
                log('SUCCESS', `Task completed successfully`, url, attempts + 1);
                break;
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                const currentAttempt = attempts + 1;
                attempts++; // Increment only on actual error

                if (isRetryable(lastError) && attempts <= maxRetries) {
                    totalRetriesMade++;
                    log('WARN', `Retryable error (${lastError.name}): ${lastError.message}`, url, currentAttempt);
                    const delay = typeof retryDelayMs === 'function' ? retryDelayMs(attempts) : retryDelayMs * attempts;
                    if (delay > 0) {
                        log('INFO', `Retrying in ${delay}ms...`, url, currentAttempt);
                        try {
                            await new Promise((res, rej) => {
                                let timeoutId: NodeJS.Timeout;
                                const abortHandler = () => { clearTimeout(timeoutId); rej(new Error('Operation aborted during retry delay')); };
                                signal?.addEventListener('abort', abortHandler, { once: true });
                                timeoutId = setTimeout(() => { signal?.removeEventListener('abort', abortHandler); res(true); }, delay);
                            });
                        } catch (abortError) {
                            lastError = abortError as Error;
                            log('WARN', `Retry cancelled by abort signal`, url, currentAttempt);
                            break;
                        }
                    }
                } else {
                    if (!isRetryable(lastError)) {
                         log('ERROR', `Non-retryable error: ${lastError.message}`, url, currentAttempt);
                    } else {
                         log('ERROR', `Final attempt failed after ${maxRetries} retries (Retryable: ${lastError.name}): ${lastError.message}`, url, currentAttempt);
                    }
                    break;
                }
            } // end catch
        } // end while

        completedCount++;
        let successCount = successfulResults.length;
        let failureCount = failedTasks.length;

        if (lastError) {
            if (lastError.message !== 'Operation aborted') {
                failedTasks.push({ url, error: lastError });
                failureCount++;
                if (onError) {
                    try { await onError(lastError, url, attempts); } catch (e) { console.error("Error in onError handler:", e); }
                }
            }
        } else if (taskResult && Array.isArray(taskResult)) {
             successCount++;
             if (taskResult.length > 0) {
                 successfulResults.push(...taskResult);
             }
        }

        if (onProgress && lastError?.message !== 'Operation aborted') {
            const statsNow: RunStats = {
                 startTime, endTime: new Date(), durationMs: 0, totalUrlsProvided: initialUrlCount,
                 totalUrlsAttempted: totalUrlsToProcess, totalSuccess: successCount,
                 totalFailed: failureCount, totalRetriesMade
            };
            try { await onProgress(completedCount, totalUrlsToProcess, statsNow); } catch (e) { console.error("Error in onProgress handler:", e); }
        }
    }; // End of executeTaskWithRetries

    const uniqueUrls = [...new Set(urls)];
    const urlsToProcess = (mode === 'threads') ? uniqueUrls : urls;
    const totalUrlsToProcess = urlsToProcess.length;
    const initialUrlCount = urls.length;

    log('INFO', `Starting Concurrent Processing (Mode: ${mode})`);
    log('INFO', `Processing ${totalUrlsToProcess} URLs (${initialUrlCount !== totalUrlsToProcess ? `from ${initialUrlCount} total after deduplication` : 'total'}) with max concurrency: ${maxConcurrency}, retries: ${maxRetries}`);
    if (blockResources && blockResources.length > 0) { log('INFO', `Blocking resources: ${blockResources.join(', ')}`); }
    if (signal?.aborted) { log('WARN', "Operation aborted before starting."); const endTime = new Date(); const stats = { startTime, endTime, durationMs: endTime.getTime() - startTime.getTime(), totalUrlsProvided: initialUrlCount, totalUrlsAttempted: 0, totalSuccess: 0, totalFailed: 0, totalRetriesMade: 0 }; return { successfulResults: [], failedTasks: [{ url: 'N/A', error: new Error('Operation aborted before starting') }], logHistory, stats }; }

    if (mode === 'threads') {
        const urlQueue = [...urlsToProcess];
        const workerPromises: Promise<void>[] = [];
        const startWorker = async (workerId: number): Promise<void> => {
             log('DEBUG', `Worker ${workerId} starting...`);
            while (urlQueue.length > 0) {
                if (signal?.aborted) { log('DEBUG', `Worker ${workerId} aborting.`); break; }
                const url = urlQueue.shift();
                if (!url) break;
                log('DEBUG', `Worker ${workerId} processing URL: ${url} (Queue size: ${urlQueue.length})`);
                await executeTaskWithRetries(url);
            }
             log('DEBUG', `Worker ${workerId} finished.`);
        };
        const actualWorkersToLaunch = Math.min(maxConcurrency, totalUrlsToProcess);
         log('INFO', `Launching ${actualWorkersToLaunch} workers...`);
        for (let i = 0; i < actualWorkersToLaunch; i++) { workerPromises.push(startWorker(i + 1)); }
        await Promise.all(workerPromises);
         log('INFO', `All "Threads" Mode workers finished.`);
    } else { // Portions mode
        for (let i = 0; i < totalUrlsToProcess; i += maxConcurrency) {
             if (signal?.aborted) { log('WARN', `Operation aborted before processing chunk at index ${i}.`); break; }
            const chunk = urlsToProcess.slice(i, i + maxConcurrency);
            log('INFO', `Processing chunk starting at index ${i}, size: ${chunk.length}`);
            const promises = chunk.map(url => executeTaskWithRetries(url));
            try { await Promise.all(promises); }
            catch (chunkError) { log('ERROR', `Unexpected error processing chunk starting at index ${i}: ${chunkError}`); }
            log('INFO', `Finished chunk starting at index ${i}.`);
        }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const finalStats: RunStats = {
        startTime, endTime, durationMs,
        totalUrlsProvided: initialUrlCount,
        totalUrlsAttempted: totalUrlsToProcess,
        totalSuccess: completedCount - failedTasks.length,
        totalFailed: failedTasks.length,
        totalRetriesMade
    };

    if (signal?.aborted) { log('WARN', `Concurrent Processing Aborted. Partial results collected.`); }
    else { log('INFO', `Finished Concurrent Processing. Success: ${finalStats.totalSuccess}, Failed: ${finalStats.totalFailed}`); }

    return { successfulResults, failedTasks, logHistory, stats: finalStats };
};


// --- Log Formatting Utility (Optional - Copied from previous context) ---

/** ANSI escape codes for terminal colors */
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    dim: "\x1b[2m",
    bold: "\x1b[1m",
};

/**
 * Formats the log history and run statistics for styled terminal output.
 * @param logHistory Array of LogEntry objects.
 * @param stats RunStats object.
 * @returns A formatted string suitable for console logging.
 */
export const formatRunLogForTerminal = (logHistory: LogEntry[], stats: RunStats): string => {
    let output = "";
    const pad = (num: number): string => num.toString().padStart(2, '0');
    const formatTime = (date: Date): string => `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${date.getMilliseconds().toString().padStart(3, '0')}`;

    output += `${colors.bold}${colors.cyan}--- Execution Log ---${colors.reset}\n`;
    logHistory.forEach(entry => {
        let levelColor = colors.reset;
        switch (entry.level) {
            case 'ERROR': levelColor = colors.red; break;
            case 'WARN': levelColor = colors.yellow; break;
            case 'SUCCESS': levelColor = colors.green; break;
            case 'INFO': levelColor = colors.blue; break;
            case 'DEBUG': levelColor = colors.dim; break;
        }
        output += `${colors.dim}${formatTime(entry.timestamp)}${colors.reset} `;
        output += `${levelColor}[${entry.level.padEnd(7, ' ')}]${colors.reset} `; // Padded level
        output += `${entry.message}`;
        if (entry.url) output += ` ${colors.dim}(${entry.url})${colors.reset}`;
        if (entry.attempt !== undefined) output += ` ${colors.dim}[Attempt: ${entry.attempt}]${colors.reset}`;
        output += `\n`;
    });

    output += `\n${colors.bold}${colors.cyan}--- Run Statistics ---${colors.reset}\n`;
    output += `Start Time:       ${stats.startTime.toLocaleString()}\n`;
    output += `End Time:         ${stats.endTime.toLocaleString()}\n`;
    output += `Duration:         ${(stats.durationMs / 1000).toFixed(2)}s\n`;
    output += `URLs Provided:    ${stats.totalUrlsProvided}\n`;
    output += `URLs Attempted:   ${stats.totalUrlsAttempted}\n`;
    output += `${colors.green}Successful Tasks: ${stats.totalSuccess}${colors.reset}\n`;
    output += `${colors.red}Failed Tasks:     ${stats.totalFailed}${colors.reset}\n`;
    output += `${colors.yellow}Total Retries:    ${stats.totalRetriesMade}${colors.reset}\n`;
    output += `${colors.bold}${colors.cyan}----------------------${colors.reset}\n`;

    return output;
};
