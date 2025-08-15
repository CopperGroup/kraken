"use server"

import puppeteer from 'puppeteer-extra'; // Assuming you still want stealth/plugins
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { URL } from 'url';
// Import Browser, Page, and ResourceType types from puppeteer
import { Browser, Page, ResourceType } from 'puppeteer';
import ProxyPlugin   from 'puppeteer-extra-plugin-proxy';

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
} from '../concurrency.core'; // Adjust import path as needed
// Apply the stealth plugin (optional, but kept from previous context)
const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
const PROXY_PORT = process.env.PROXY_PORT || '8080';

puppeteer.use(StealthPlugin());
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
        const maxPage = await page.$$eval('.parts__PageWrapper-sc-c2fbbdee-7 > *', elements => {
          const pageNumbers = elements
            .map(el => el.textContent?.trim())
            .filter(text => /^\d+$/.test(text || '')) // keep only full numeric strings
            .map(num => parseInt(num || '', 10));
            
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

        const linksSelector = 'a[href^="/p/"]';
        const priceSelector = '.parts__ListingPriceWrapper-sc-155b566e-0';

        if (signal?.aborted) throw new Error('Operation aborted');
        await page.waitForSelector(linksSelector, { timeout: 50000 });

        if (signal?.aborted) throw new Error('Operation aborted');
        let links = await page.$$eval(linksSelector, elements =>
            elements.map(el => (el as HTMLAnchorElement).href.replace("?cid=api03&eid=lsp", "").replace("#Opinie", ""))
        );
        links = [...new Set(links)];

        if (signal?.aborted) throw new Error('Operation aborted');

        // console.log(`[Scrape Task] Counts on ${pageUrl} - Links: ${links.length}, Prices: ${prices.length}`); // Add counts log

        links.forEach((link, index) => {
            if (link) {
                 pageResults.push({ link: link, price: "", discountPrice: "" });
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

/**
 * Fetches initial category links, then uses the reusable concurrent
 * function to scrape sub-category links (those containing images).
 * @param baseUrl - The starting URL (e.g., the homepage).
 * @param maxConcurrency - The maximum number of concurrent tabs to open.
 * @param resourcesToBlock Optional array of resource types to block during scraping.
 * @returns A promise that resolves to a GetCatalogLinksResult object.
 */
export const getCatalogLinks = async (
    baseUrl: string,
    maxConcurrency: number = 5, // Default concurrency for tabs
    resourcesToBlock?: ResourceType[]
): Promise<GetCatalogLinksResult> => { // <-- MODIFIED Return Type

    let browser: Browser | null = null;
    const initialAbsoluteLinks: string[] = [];
    let uniqueSubCategoryLinks: string[] = [];
    let runLogHistory: LogEntry[] = []; // <-- To store logs
    let runStats: RunStats | null = null; // <-- To store stats

    // Helper to create default stats
    const defaultStats = (startTime: Date = new Date()): RunStats => ({
        startTime, endTime: new Date(), durationMs: 0, totalUrlsProvided: 0,
        totalUrlsAttempted: 0, totalSuccess: 0, totalFailed: 0, totalRetriesMade: 0
    });

    const step1StartTime = new Date(); // For potential error case stats
    try {
        
        // --- Step 1: Launch Browser and Fetch Initial Links ---
        console.log("--- Step 1 (CatalogLinks): Launching Browser & Fetching Initial Links ---");
        browser = await puppeteer.launch({ headless: true, args: ['--window-size=1280,800']});
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);

        console.log(`🚀 Fetching initial catalog page: ${baseUrl}`);
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

        // Handle Consent Button
        try {
            const consentButtonSelector = 'button[data-name="AcceptPermissionButton"]';
            console.log(`⏳ Waiting for consent button: ${consentButtonSelector}`);
            await page.waitForSelector(consentButtonSelector, { timeout: 20000 });
            console.log(`🖱️ Clicking consent button...`);
            await page.click(consentButtonSelector);
            console.log(`✅ Consent button clicked.`);
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log(`✅ Delay finished.`);
        } catch (e) {
            console.warn("⚠️ Consent button not found or timed out, proceeding...");
        }

        // Open Menu
        const menuButtonSelector = 'button[aria-label="menu"]';
        console.log(`⏳ Waiting for menu buttons: ${menuButtonSelector}`);
        await page.waitForSelector(menuButtonSelector, { timeout: 20000 });
        const buttons = await page.$$(menuButtonSelector);
        if (buttons.length > 1) {
            console.log(`🖱️ Clicking the second menu button...`);
            await buttons[1].evaluate(b => (b as HTMLElement).click());
            console.log(`✅ Menu opened.`);
        } else {
            await page.close();
            throw new Error("Could not find the second menu button.");
        }

        // Extract Links (/g/)
        const linkSelector = 'li a[href^="/g/"]';
        console.log(`⏳ Waiting for category links: ${linkSelector}`);
        await page.waitForSelector(linkSelector, { timeout: 30000 });

        console.log(`🔍 Extracting category links...`);
        const relativeLinks = await page.$$eval(
            linkSelector,
            (links, excludeText) =>
                links
                .filter(a => (a as HTMLElement).innerText.trim() !== excludeText)
                .map(a => (a as HTMLAnchorElement).getAttribute('href') || ''),
            'Pomoc i kontakt'
        );

        relativeLinks
            .filter(href => href)
            .forEach(relativeHref => initialAbsoluteLinks.push(new URL(relativeHref, baseUrl).toString()));

        console.log(`✅ Found ${initialAbsoluteLinks.length} initial catalog links.`);
        await page.close();
        console.log(`🚪 Initial setup page closed.`);


        // --- Step 2: Use Reusable Function for Concurrent Scraping ---
        if (initialAbsoluteLinks.length > 0) {
             const subCategoryOptions: ProcessUrlsOptions = {
                 mode: 'threads',
                 maxRetries: 1,
                 retryDelayMs: (attempt) => attempt * 1000,
                 blockResources: resourcesToBlock,
                 onError: (error, url, attempt) => {
                     console.error(` -> FINAL SUBCAT ERROR for ${url} on attempt ${attempt}: ${error.message}`);
                 }
                 // Add onProgress here if needed
             };
            // *** MODIFIED: Capture full result ***
            const subCategoryResult = await processUrlsConcurrentlyInTabs<string>(
                browser!,
                initialAbsoluteLinks,
                maxConcurrency,
                scrapeUrlInNewTab,
                subCategoryOptions
            );

            // *** MODIFIED: Store logs and stats ***
            runLogHistory = subCategoryResult.logHistory;
            runStats = subCategoryResult.stats;

            uniqueSubCategoryLinks = [...new Set(subCategoryResult.successfulResults)];

            if (subCategoryResult.failedTasks.length > 0) {
                 console.warn(` -> Failed to scrape sub-categories from ${subCategoryResult.failedTasks.length} pages:`);
                 // Details are in the log history now
                 // subCategoryResult.failedTasks.forEach(fail => console.warn(`    - ${fail.url}: ${fail.error.message}`));
            }

        } else {
            console.log("🤷 No initial links found, skipping concurrent scrape.");
            // Initialize stats if step 2 was skipped
            const endTime = new Date();
            // Use overall start time if step 1 succeeded but found no links
            const startTimeForStats = runStats?.startTime || step1StartTime;
            runStats = { startTime: startTimeForStats, endTime, durationMs: endTime.getTime() - startTimeForStats.getTime(), totalUrlsProvided: 0, totalUrlsAttempted: 0, totalSuccess: 0, totalFailed: 0, totalRetriesMade: 0 };
        }

        console.log(`📊 Returning ${uniqueSubCategoryLinks.length} unique sub-category links (containing images).`);
        // *** MODIFIED: Return structured object ***
        return {
            subCategoryLinks: uniqueSubCategoryLinks,
            logHistory: runLogHistory,
            stats: runStats || defaultStats(step1StartTime) // Ensure stats is not null
        };

    } catch (error) {
        console.error("❌ Error during catalog link processing:", error);
         // *** MODIFIED: Return structured object on error ***
         const finalStats = runStats || defaultStats();
         // Update end time on error if stats object exists
         if (runStats) {
             finalStats.endTime = new Date();
             finalStats.durationMs = finalStats.endTime.getTime() - finalStats.startTime.getTime();
         }
        return { subCategoryLinks: [], logHistory: runLogHistory, stats: finalStats };
    } finally {
        if (browser) {
            await browser.close();
            console.log("🚪 Main browser closed.");
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
        browser = await puppeteer.launch({ headless: true, args: ['--window-size=1280,800']});

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
