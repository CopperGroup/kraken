import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Browser, Page, ResourceType } from 'puppeteer'; // Import necessary Puppeteer types

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface TaskOptions {
    /** Optional AbortSignal to allow cancelling the task. Uses built-in AbortSignal type. */
    signal?: AbortSignal;
    /** Optional array of resource types to block for this task. */
    blockResources?: ResourceType[];
}

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
    /** Optional callback executed after each task attempt (success or final failure): `(completedCount, totalCount) => void | Promise<void>`. */
    onProgress?: (completedCount: number, totalCount: number) => void | Promise<void>;
    /** Optional callback executed when a task fails its final retry: `(error, url) => void | Promise<void>`. */
    onError?: (error: Error, url: string) => void | Promise<void>;
}

export const processUrlsConcurrentlyInTabs = async <T>(
    browser: Browser,
    urls: string[],
    maxConcurrency: number,
    taskFunction: TaskFunction<T>,
    options: ProcessUrlsOptions = {} // Default options object
): Promise<ProcessUrlsResult<T>> => {

    // Destructure options with defaults
    const {
        mode = 'threads',
        maxRetries = 0,
        retryDelayMs = 500,
        signal,
        blockResources, // Get blockResources option
        onProgress,
        onError,
    } = options;

    const successfulResults: T[] = [];
    const failedTasks: { url: string; error: Error }[] = [];
    let completedCount = 0;

    // --- Helper function to execute task with retries ---
    const executeTaskWithRetries = async (url: string): Promise<void> => {
        let attempts = 0;
        let taskResult: T[] | null = null;
        let lastError: Error | null = null;
        // Prepare options object to pass to the task function
        const taskOptions: TaskOptions = { signal, blockResources };

        while (attempts <= maxRetries) {
            // Check for cancellation before starting/retrying an attempt
            // Use global AbortSignal type
            if (signal?.aborted) {
                console.log(`[CONCURRENT] Operation aborted for ${url}.`);
                lastError = new Error('Operation aborted');
                break; // Exit retry loop
            }

            try {
                // Pass down the task options (including signal and blockResources)
                taskResult = await taskFunction(browser, url, taskOptions);
                lastError = null; // Mark as success
                break; // Exit retry loop on success
            } catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                attempts++;
                console.warn(`[CONCURRENT] Attempt ${attempts}/${maxRetries + 1} failed for ${url}: ${lastError.message}`);
                if (attempts <= maxRetries) {
                    // Calculate delay
                    const delay = typeof retryDelayMs === 'function'
                        ? retryDelayMs(attempts)
                        : retryDelayMs * attempts; // Simple incremental backoff
                    if (delay > 0) {
                        console.log(`[CONCURRENT] Retrying ${url} in ${delay}ms...`);
                        try {
                            // Wait for delay, checking signal during wait
                            await new Promise((res, rej) => {
                                let timeoutId: NodeJS.Timeout;
                                const abortHandler = () => {
                                    clearTimeout(timeoutId);
                                    rej(new Error('Operation aborted during retry delay'));
                                };
                                // Use global AbortSignal type
                                signal?.addEventListener('abort', abortHandler, { once: true });
                                timeoutId = setTimeout(() => {
                                    signal?.removeEventListener('abort', abortHandler);
                                    res(true);
                                }, delay);
                            });
                        } catch (abortError) {
                            lastError = abortError as Error; // Catch abortion during delay
                            console.log(`[CONCURRENT] Retry cancelled by abort signal for ${url}.`);
                            break; // Exit retry loop if aborted during delay
                        }
                    } // else delay is 0, retry immediately
                } else {
                    console.error(`[CONCURRENT] Final attempt failed for ${url} after ${maxRetries} retries.`);
                }
            }
        }

        // Process final result of attempts for this URL
        completedCount++; // Increment completed count regardless of outcome
        if (lastError) {
            // Don't record failure if it was due to abortion
            if (lastError.message !== 'Operation aborted') {
                failedTasks.push({ url, error: lastError });
                if (onError) {
                    try { await onError(lastError, url); } catch (e) { console.error("Error in onError handler:", e); }
                }
            }
        } else if (taskResult && Array.isArray(taskResult) && taskResult.length > 0) {
            successfulResults.push(...taskResult);
        }
        // Call progress callback if not aborted
        // Use global AbortSignal type
        if (onProgress && lastError?.message !== 'Operation aborted') {
            try { await onProgress(completedCount, totalUrlsToProcess); } catch (e) { console.error("Error in onProgress handler:", e); }
        }
    }; // End of executeTaskWithRetries

    // --- Determine URLs to process ---
    const uniqueUrls = [...new Set(urls)];
    const urlsToProcess = (mode === 'threads') ? uniqueUrls : urls;
    const totalUrlsToProcess = urlsToProcess.length;
    const initialUrlCount = urls.length;

    console.log(`\n--- Starting Concurrent Processing (Mode: ${mode}) ---`);
    console.log(`🏎️ Processing ${totalUrlsToProcess} URLs (${initialUrlCount !== totalUrlsToProcess ? `from ${initialUrlCount} total after deduplication` : 'total'}) with max concurrency: ${maxConcurrency}, retries: ${maxRetries}`);
    if (blockResources && blockResources.length > 0) {
        console.log(`   Blocking resources: ${blockResources.join(', ')}`);
    }

    // Check for immediate cancellation
    // Use global AbortSignal type
    if (signal?.aborted) {
        console.warn("[CONCURRENT] Operation aborted before starting.");
        return { successfulResults: [], failedTasks: [{ url: 'N/A', error: new Error('Operation aborted before starting') }] };
    }

    // --- Concurrency Logic ---
    if (mode === 'threads') {
        const urlQueue = [...urlsToProcess];
        const workerPromises: Promise<void>[] = [];

        const startWorker = async (): Promise<void> => {
            while (urlQueue.length > 0) {
                // Check for cancellation before taking next URL
                // Use global AbortSignal type
                if (signal?.aborted) { break; }

                const url = urlQueue.shift();
                if (!url) break;

                await executeTaskWithRetries(url); // Execute task with retry logic
            }
        };

        const actualWorkersToLaunch = Math.min(maxConcurrency, totalUrlsToProcess);
        for (let i = 0; i < actualWorkersToLaunch; i++) {
            workerPromises.push(startWorker());
        }
        await Promise.all(workerPromises);

    } else { // Portions mode
        for (let i = 0; i < totalUrlsToProcess; i += maxConcurrency) {
             // Check for cancellation before starting next chunk
             // Use global AbortSignal type
             if (signal?.aborted) {
                 console.log(`[CONCURRENT] Operation aborted before processing chunk at index ${i}.`);
                 break;
             }
            const chunk = urlsToProcess.slice(i, i + maxConcurrency);
            // console.log(`   Processing chunk starting at index ${i}, size: ${chunk.length}`); // Reduce noise
            // Map chunk URLs to promises executing the task with retries
            const promises = chunk.map(url => executeTaskWithRetries(url));
            try {
                await Promise.all(promises); // Wait for tasks in chunk (including retries)
            } catch (chunkError) {
                 // Individual errors are handled by executeTaskWithRetries, this shouldn't normally be hit
                 console.error(`❌ Unexpected error processing chunk starting at index ${i}:`, chunkError);
            }
        }
    }

    if (signal?.aborted) {
         console.log(`--- Concurrent Processing Aborted. Partial results: Success: ${successfulResults.length}, Failed (before abort): ${failedTasks.length} ---`);
    } else {
        console.log(`--- Finished Concurrent Processing. Success: ${successfulResults.length}, Failed: ${failedTasks.length} ---`);
    }
    return { successfulResults, failedTasks };
};


