"use server"

import puppeteer from 'puppeteer-extra'; // Assuming you still want stealth/plugins
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { URL } from 'url';
// Import Browser, Page, and ResourceType types from puppeteer
import { Browser, Page, ResourceType, TimeoutError } from 'puppeteer';
// AbortSignal is globally available in Node v16.14+

// Assuming these types are imported or defined in '../concurrency.core'
// or included via the processUrlsConcurrentlyInTabs definition below
// Make sure these types and the processUrlsConcurrentlyInTabs function are accessible
import {
    processUrlsConcurrentlyInTabs,
    ProcessUrlsOptions,
    TaskFunction,
    TaskOptions,
    LogEntry, // Make sure LogEntry is exported/available
    RunStats,  // Make sure RunStats is exported/available
    ProcessUrlsResult // Make sure ProcessUrlsResult is exported/available
} from '../../concurrency.core'; // Adjust import path as needed
import ProxyPlugin   from 'puppeteer-extra-plugin-proxy';
// Apply the stealth plugin (optional, but kept from previous context)
puppeteer.use(StealthPlugin());

const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
const PROXY_PORT = process.env.PROXY_PORT || '8080';
puppeteer.use(
    ProxyPlugin({
      address: PROXY_HOST,
      port:    Number(PROXY_PORT),
      credentials: { username: '', password: '' },
    })
  );
// --- Specific Task Function Definitions ---

// Define the structure for the data scraped from a single product page
interface ProductPageData {
    link: string;
    price: string;
    discountPrice: string;
}

// Define the structure for the result of getting max page number
interface MaxPageResult {
    url: string;
    maxPage: number;
}

/**
 * Specific Task Function: Gets the maximum pagination number for a given catalog URL.
 * Optionally blocks resources.
 */
const getMaxPageTask: TaskFunction<MaxPageResult> = async (browser: Browser, catalogUrl: string, options: TaskOptions): Promise<MaxPageResult[]> => {
    let page: Page | null = null;
    const { blockResources, signal } = options;
    // console.log(`[MaxPage Task] Checking ${catalogUrl}...`); // Reduce noise

    const requestHandler = (request: import('puppeteer').HTTPRequest) => {
        if (blockResources?.includes(request.resourceType())) {
            request.abort().catch(e => console.error(`[MaxPage Task] Failed to abort request: ${e.message}`));
        } else {
            request.continue().catch(e => console.error(`[MaxPage Task] Failed to continue request: ${e.message}`));
        }
    };

    try {
        page = await browser.newPage();

        if (blockResources && blockResources.length > 0) {
            await page.setRequestInterception(true);
            page.on('request', requestHandler);
        }

        if (signal?.aborted) throw new Error('Operation aborted');

        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(catalogUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });

        if (signal?.aborted) throw new Error('Operation aborted');
        // Use a robust selector for pagination numbers
        const maxPage = await page.$$eval('.gPage_item', elements => {
            const pageNumbers = elements
              .map(el => parseInt(el.textContent || '', 10))
              .filter(num => !isNaN(num));
            return pageNumbers.length ? Math.max(...pageNumbers) : 1;
        });
        // console.log(`[MaxPage Task] -> Max page for ${catalogUrl}: ${maxPage}`); // Reduce noise
        return [{ url: catalogUrl, maxPage: maxPage }];
    } catch (error) {
         if (!(error instanceof Error && error.message.includes('aborted'))) {
            console.warn(`[MaxPage Task] -> Could not determine max page for ${catalogUrl}, assuming 1. Error: ${error.message}`);
         }
         // Re-throw retryable errors if needed by processUrlsConcurrentlyInTabs' retry logic
         if (error instanceof Error && error.name === 'TimeoutError') {
             throw error; // Allow retry mechanism to catch it
         }
         return (error instanceof Error && error.message.includes('aborted')) ? [] : [{ url: catalogUrl, maxPage: 1 }];
    } finally {
        if (page) {
            if (blockResources && blockResources.length > 0) {
                 try { page.off('request', requestHandler); } catch(e) {}
            }
            // Adding extra try-catch for close as it can sometimes fail
            try { await page.close(); } catch(e) { console.error(`Error closing page for ${catalogUrl} in getMaxPageTask: ${e.message}`); }
        }
    }
};


/**
 * Specific Task Function: Scrapes product links and prices from a single catalog pagination URL.
 * Optionally blocks resources.
 */
const scrapeCatalogPageTask: TaskFunction<ProductPageData> = async (browser: Browser, pageUrl: string, options: TaskOptions): Promise<ProductPageData[]> => {
    let page: Page | null = null;
    const pageResults: ProductPageData[] = [];
    const { blockResources, signal } = options;

    const requestHandler = (request: import('puppeteer').HTTPRequest) => {
        if (blockResources?.includes(request.resourceType())) {
            request.abort().catch(e => console.error(`[Scrape Task] Failed to abort request: ${e.message}`));
        } else {
            request.continue().catch(e => console.error(`[Scrape Task] Failed to continue request: ${e.message}`));
        }
    };

    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        if (blockResources && blockResources.length > 0) {
            await page.setRequestInterception(true);
            page.on('request', requestHandler);
        }

        if (signal?.aborted) throw new Error('Operation aborted');
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

        const linksSelector = '.compItem_titleWrap2 a';
        const priceSelector = '.parts__ListingPriceWrapper-sc-155b566e-0';

        if (signal?.aborted) throw new Error('Operation aborted');

        await page.waitForSelector(linksSelector, { timeout: 50000 });

        if (signal?.aborted) throw new Error('Operation aborted');

        let  links = await page.$$eval(linksSelector, elements =>
            elements.map(el => (el as HTMLAnchorElement).href)
        );

        links = [...new Set(links)];

        // links = [...new Set(links)];

        if (signal?.aborted) throw new Error('Operation aborted');

        const prices = await page.$$eval('.compItem_priceWrap', elements =>
            elements.map(el => {
              const priceElement = el.querySelector('.compItem_shopPrice');
              const discountElement = el.querySelector('.compItem_marketPrice');
    
              return {
                price: discountElement?.getAttribute('data-currency') || '',
                discountPrice: priceElement?.getAttribute('data-currency') || ''
              };
            })
          );
        // console.log(`[Scrape Task] Counts on ${pageUrl} - Links: ${links.length}, Prices: ${prices.length}`); // Add counts log

        links.forEach((link, index) => {
            if (link) {
                 pageResults.push({ link: link, ...prices[index] });
            } else {
                 console.warn(`[Scrape Task] Mismatch or missing data for index ${index} on ${pageUrl}`);
            }
        });

        // console.log(`[Scrape Task] Added ${pageResults.length} products from ${pageUrl}`); // Reduce noise
        return pageResults;

    } catch (error) {
         if (signal?.aborted) {
             console.log(`[Scrape Task] Aborted during processing of ${pageUrl}.`);
         } else if (error instanceof Error && error.name === 'TimeoutError') {
             console.warn(`[Scrape Task TIMEOUT] Timed out waiting for elements on ${pageUrl}`);
             throw error; // Re-throw TimeoutError to allow retry
        } else {
            console.error(`[Scrape Task ERROR] Error scraping ${pageUrl}:`, error);
            // Optionally re-throw other errors if they should stop the process or be logged centrally
        }
        return [];
    } finally {
        if (page) {
             if (blockResources && blockResources.length > 0) {
                 try { page.off('request', requestHandler); } catch(e) {}
             }
            try {
                await page.close();
            } catch (closeError) {
                console.error(`[Scrape Task WARN] Failed to close page for ${pageUrl}: ${closeError.message}`);
            }
        }
    }
};

/**
 * Specific Task Function: Scrapes sub-category links (those with images) from a category page.
 * @param browser The Puppeteer Browser instance.
 * @param url The category URL to scrape.
 * @param options Task options including signal and blockResources.
 * @returns A promise resolving to an array of found absolute sub-category links (strings).
 */
const scrapeUrlInNewTab: TaskFunction<string> = async (browser: Browser, url: string, options: TaskOptions): Promise<string[]> => {
    let page: Page | null = null;
    const { blockResources, signal } = options;
    // console.log(`[SubCat Task START] Opening tab for ${url}`); // Reduce noise

    const requestHandler = (request: import('puppeteer').HTTPRequest) => {
        if (blockResources?.includes(request.resourceType())) {
            request.abort().catch(e => console.error(`[SubCat Task] Failed to abort request: ${e.message}`));
        } else {
            request.continue().catch(e => console.error(`[SubCat Task] Failed to continue request: ${e.message}`));
        }
    };

    const subCategorySelector = 'a[href^="/g-"]';
    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        if (blockResources && blockResources.length > 0) {
            await page.setRequestInterception(true);
            page.on('request', requestHandler);
        }

        if (signal?.aborted) throw new Error('Operation aborted');
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

        if (signal?.aborted) throw new Error('Operation aborted');
        await page.waitForSelector(subCategorySelector, { timeout: 40000 });

        if (signal?.aborted) throw new Error('Operation aborted');
        const relativeHrefsWithImage = await page.$$eval(
            subCategorySelector,
            (links) => links
                .filter(a => a.querySelector('img') !== null)
                .map(a => (a as HTMLAnchorElement).getAttribute('href') || '')
        );

        const absoluteHrefs = relativeHrefsWithImage
            .filter(href => href)
            .map(relativeHref => new URL(relativeHref, url).toString());

        // console.log(`[SubCat Task SUCCESS] ${url} - Found ${absoluteHrefs.length} links.`); // Reduce noise
        return absoluteHrefs;

    } catch (tabError) {
        if (signal?.aborted) {
             console.log(`[SubCat Task] Aborted during processing of ${url}.`);
        } else if (tabError instanceof Error && tabError.name === 'TimeoutError') {
             console.warn(`[SubCat Task TIMEOUT] Selector "${subCategorySelector}" not found on ${url} within timeout.`);
             throw tabError; // Re-throw TimeoutError to allow retry
        } else {
            console.error(`[SubCat Task ERROR] Error processing ${url}:`, tabError);
        }
        return [];
    } finally {
        if (page) {
             if (blockResources && blockResources.length > 0) {
                 try { page.off('request', requestHandler); } catch(e) {}
             }
            try {
                await page.close();
            } catch (closeError) {
                console.error(`[SubCat Task WARN] Failed to close page for ${url}: ${closeError.message}`);
            }
        }
    }
};


// --- Main Functions ---

/** Define the return structure for getCatalogLinks including logs/stats */
export interface GetCatalogLinksResult {
    subCategoryLinks: string[];
    logHistory: LogEntry[];
    stats: RunStats;
}

const extractCatalogLinksTask: TaskFunction<string> = async (
    browser: Browser,
    url: string,
    options: TaskOptions
): Promise<string[]> => {
    let page: Page | null = null;
    // console.log(`[Task Worker] Starting link extraction from: ${url}`);
    try {
        page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);

        if (options.blockResources && options.blockResources.length > 0) {
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (options.blockResources?.includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
        }

        // console.log(`[Task Worker] Navigating to: ${url}`);
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // console.log('[Task Worker] Waiting for selector: .headerCate_blockItem a');
        await page.waitForSelector('.headerCate_blockItem a', { timeout: 30000 });

        const relativeLinks = await page.$$eval('.headerCate_blockItem a', elements =>
            elements
                .map(el => (el as HTMLAnchorElement).getAttribute('href'))
                .filter((href): href is string => !!href)
        );

        const fullLinks = relativeLinks.map(link => {
            try {
                return new URL(link, page!.url()).toString();
            } catch (e) {
                 console.warn(`[Task Worker] Failed to resolve link "${link}" relative to "${page!.url()}":`, e instanceof Error ? e.message : String(e));
                return null;
            }
        }).filter((link): link is string => !!link);

        // console.log(`[Task Worker] Found ${fullLinks.length} links on ${url}.`);
        return fullLinks;

    } catch (error) {
        console.error(`[Task Worker] FAILED extracting links from ${url}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    } finally {
        if (page) {
            try { await page.close(); } catch (closeError) {
                 console.error(`[Task Worker] Error closing page for ${url}: ${closeError instanceof Error ? closeError.message : String(closeError)}`);
            }
        }
    }
};


// --- Main Function Refactored to Use Concurrency Handler ---
// Returns the GetCatalogLinksResult type as specified by the user.
export const getCatalogLinks = async (
    baseUrl: string,
    threads: number = 1,
    resourcesToBlock?: ResourceType[]
): Promise<GetCatalogLinksResult> => {

    console.log(`🚀 Starting Catalog Link Extraction using concurrency handler for: ${baseUrl}`);
    const overallStartTime = new Date();
    let browser: Browser | null = null;

    // Helper for creating a default error result structure (updated)
    const createDefaultErrorResult = (errorMsg: string): GetCatalogLinksResult => {
        const endTime = new Date();
        const error = new Error(errorMsg);
        const stats: RunStats = {
             startTime: overallStartTime, endTime, durationMs: endTime.getTime() - overallStartTime.getTime(),
             totalUrlsProvided: 1, totalUrlsAttempted: 0, totalSuccess: 0, totalFailed: 1, totalRetriesMade: 0
         };
        // Mimic a failed task entry in logs if needed for consistency, or just log the main error
        const logHistory: LogEntry[] = [
             { timestamp: new Date(), level: 'ERROR', message: `Critical error during execution: ${errorMsg}`, url: baseUrl }
         ];
        // If processUrlsConcurrentlyInTabs itself fails, we might not have detailed stats/logs yet.
        // We add a basic error log.

        // Construct result matching the required interface
        return {
            subCategoryLinks: [],
            // No failedTasks field here
            logHistory: logHistory,
            stats: stats
        };
    };

    try {
        const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
        const PROXY_PORT = process.env.PROXY_PORT || '8080';
        browser = await puppeteer.launch({ headless: true, args: ['--window-size=1280,800', `--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`] });

        const options: ProcessUrlsOptions = {
            maxRetries: 2,
            retryDelayMs: 1000,
            logToConsole: true,
            mode: 'threads',
            blockResources: resourcesToBlock,
            isRetryable: (error: Error) => error instanceof TimeoutError || error.message.includes('Navigation timeout') || error.message.includes('net::ERR_'),
        };

        // Use the concurrency handler
        const result = await processUrlsConcurrentlyInTabs<string>(
            browser,
            [baseUrl],
            1, // Concurrency of 1
            extractCatalogLinksTask,
            options
        );

        // Process results
        const extractedLinks = result.successfulResults.flat();

        // --- Construct the final result matching the USER-PROVIDED interface ---
        return {
            subCategoryLinks: [...new Set(extractedLinks)], // Unique links
            // No failedTasks field here
            logHistory: result.logHistory,
            stats: result.stats
        };

    } catch (error) {
        console.error(`💥 Critical error during getCatalogLinks execution: ${error instanceof Error ? error.message : String(error)}`);
        return createDefaultErrorResult(error instanceof Error ? error.message : String(error));
    } finally {
        if (browser) {
            await browser.close();
            console.log("🚪 Browser closed for getCatalogLinks.");
        }
    }
};

/** Define the final return structure including logs and stats */
export interface GetCatalogPagesResult {
    links: string[];
    details: Record<string, { price: string; discountPrice: string }>;
    logHistory: LogEntry[];
    stats: RunStats;
}

/**
 * Main function to get all product links and details from paginated catalog URLs.
 * Uses the reusable concurrent function to process pagination pages.
 */
export const getCatalogPagesLinks = async (
    catalogUrls: string[],
    pageConcurrency: number = 4,
    resourcesToBlock?: ResourceType[]
): Promise<GetCatalogPagesResult> => {

    let browser: Browser | null = null;
    const allProductLinksSet = new Set<string>();
    const allProductDetails: Record<string, { price: string; discountPrice: string }> = {};
    const combinedLogHistory: LogEntry[] = [];
    let combinedStats: RunStats | null = null;

    // Helper for default return
    const defaultReturn = (startTime: Date = new Date()): GetCatalogPagesResult => {
        const finalStats = combinedStats || { startTime, endTime: new Date(), durationMs: new Date().getTime() - startTime.getTime(), totalUrlsProvided: catalogUrls.length, totalUrlsAttempted: 0, totalSuccess: 0, totalFailed: 0, totalRetriesMade: 0 };
        if (combinedStats) { // Ensure end time and duration are updated if process failed partway
             finalStats.endTime = new Date();
             finalStats.durationMs = finalStats.endTime.getTime() - finalStats.startTime.getTime();
        }
        return { links: [...allProductLinksSet], details: allProductDetails, logHistory: combinedLogHistory, stats: finalStats };
    };


    const overallStartTime = new Date(); // For accurate duration if errors occur early
    try {
        browser = await puppeteer.launch({ headless: true, args: ['--window-size=1280,800', `--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`]});

        // --- Step 1: Determine all pagination URLs ---
        console.log("--- Step 1 (CatalogPages): Determining all pagination URLs ---");
        const allPageUrlsToScrape: string[] = [];
        const catalogPageMap: Record<string, number> = {};

        console.log(" -> Fetching max page numbers concurrently...");
        const maxPageOptions: ProcessUrlsOptions = {
             mode: 'threads',
             blockResources: resourcesToBlock,
             maxRetries: 1,
             onError: (err, url, attempt) => console.error(` -> Final error fetching max page for ${url} on attempt ${attempt}: ${err.message}`)
        };
        const maxPageRunResult = await processUrlsConcurrentlyInTabs<MaxPageResult>(
            browser!,
            catalogUrls,
            pageConcurrency,
            getMaxPageTask,
            maxPageOptions
        );
        combinedLogHistory.push(...maxPageRunResult.logHistory);
        combinedStats = maxPageRunResult.stats; // Initialize combined stats

        maxPageRunResult.successfulResults.forEach(result => {
            catalogPageMap[result.url] = result.maxPage;
        });
        console.log(" -> Determined Max Pages:", catalogPageMap);
        if (maxPageRunResult.failedTasks.length > 0) {
             console.warn(` -> Failed to get max pages for ${maxPageRunResult.failedTasks.length} catalogs.`);
        }
        console.log(" -> Finished fetching max page numbers.");

        for (const catalogUrl of catalogUrls) {
            const maxPage = catalogPageMap[catalogUrl] || 1;
            for (let pageNum = 1; pageNum <= maxPage; pageNum++) {
                const pageUrl = pageNum === 1 ? catalogUrl : `${catalogUrl}?page=${pageNum}`;
                allPageUrlsToScrape.push(pageUrl);
            }
        }
        console.log(`✅ Determined ${allPageUrlsToScrape.length} total pagination URLs to scrape.`);


        // --- Step 2: Process all pagination URLs concurrently ---
        if (allPageUrlsToScrape.length > 0) {
             const scrapeOptions: ProcessUrlsOptions = {
                 mode: 'threads',
                 maxRetries: 1,
                 retryDelayMs: (attempt) => attempt * 1000,
                 blockResources: resourcesToBlock,
                 onProgress: (completed, total, currentStats) => {
                     const percentage = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
                     process.stdout.write(`   Scraping Progress: ${completed}/${total} (${percentage}%) | Retries: ${currentStats.totalRetriesMade} | Failed: ${currentStats.totalFailed} \r`);
                 },
                 onError: (error, url, attempt) => {
                     // Error already logged internally
                 }
             };
            const scrapeRunResult = await processUrlsConcurrentlyInTabs<ProductPageData>(
                browser!,
                allPageUrlsToScrape,
                pageConcurrency,
                scrapeCatalogPageTask,
                scrapeOptions
            );
            process.stdout.write('\n');

            combinedLogHistory.push(...scrapeRunResult.logHistory);
             if (combinedStats) { // Should always be true here
                 // Combine stats
                 combinedStats.totalSuccess += scrapeRunResult.stats.totalSuccess;
                 combinedStats.totalFailed += scrapeRunResult.stats.totalFailed;
                 combinedStats.totalRetriesMade += scrapeRunResult.stats.totalRetriesMade;
                 combinedStats.endTime = scrapeRunResult.stats.endTime; // Use the latest end time
                 combinedStats.durationMs = combinedStats.endTime.getTime() - combinedStats.startTime.getTime(); // Recalculate duration
                 combinedStats.totalUrlsAttempted += scrapeRunResult.stats.totalUrlsAttempted; // Sum attempts from both phases
             } else { // Fallback just in case
                 combinedStats = scrapeRunResult.stats;
             }

            console.log(`\n--- Processing ${scrapeRunResult.successfulResults.length} collected product entries ---`);
            scrapeRunResult.successfulResults.forEach(item => {
                const clearLink = item.link.replace("#Opinie", "");

                allProductLinksSet.add(clearLink);
                if (!allProductDetails[clearLink]) {
                     allProductDetails[clearLink] = {
                         price: item.price,
                         discountPrice: item.discountPrice
                     };
                }
            });
            if (scrapeRunResult.failedTasks.length > 0) {
                 console.warn(` -> Failed to scrape data from ${scrapeRunResult.failedTasks.length} pages.`);
            }
        } else {
            console.log("🤷 No pagination URLs to process.");
            if (combinedStats) { // Update end time if step 2 was skipped
                combinedStats.endTime = new Date();
                combinedStats.durationMs = combinedStats.endTime.getTime() - combinedStats.startTime.getTime();
            } else { // If step 1 also failed/returned no stats
                 combinedStats = defaultReturn(overallStartTime).stats;
            }
        }

        // --- Final Result ---
        const finalLinks = [...allProductLinksSet];
        console.log(`📊 Returning ${finalLinks.length} unique product links.`);
        const finalStats = combinedStats as RunStats; // Assert as non-null after checks

        return { // Return structured object
            links: finalLinks,
            details: allProductDetails,
            logHistory: combinedLogHistory,
            stats: finalStats
        };

    } catch (error) {
        console.error("❌ Error during catalog page link processing:", error);
        return defaultReturn(overallStartTime); // Return default structure on major error
    } finally {
        if (browser) {
            await browser.close();
            console.log("🚪 Main browser closed.");
        }
    }
};
