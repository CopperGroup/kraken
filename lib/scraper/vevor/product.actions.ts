"use server";

import { Browser, Page, ResourceType, TimeoutError } from 'puppeteer'; // Import necessary Puppeteer types, including TimeoutError
import puppeteer from 'puppeteer-extra';
// Assuming processUrlsConcurrentlyInTabs and its types are in a relative path like './concurrency'
import {
    processUrlsConcurrentlyInTabs,
    TaskFunction,
    ProcessUrlsOptions,
    TaskOptions,
    ProcessUrlsResult,
    LogEntry, // Make sure LogEntry is exported/imported
    RunStats, // Make sure RunStats is exported/imported
    formatRunLogForTerminal // Optional: If you want to use the log formatter
} from '../../concurrency.core'; // Adjust path as needed
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import ProxyPlugin   from 'puppeteer-extra-plugin-proxy';

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
// ProductData interface remains the same
export interface ProductData {
    url: string;
    name: string;
    images: string[];
    description: string;
    parameters: Record<string, string[]>;
    characteristics: Record<string, string>;
    currentParams: Record<string, string>;
    category: string;
    articleNumber: string;
    isAvailable: boolean;
    price: string;
    discountPrice: string;
    brand: string
}

// Define the structure for the return value of scrapeProductLinks
export interface ScrapeProductsResult {
    /** Array of successfully scraped and deduplicated product data objects. */
    products: ProductData[];
    /** Array of tasks (URL and Error) that failed even after retries. */
    failedTasks: { url: string; error: Error }[];
    /** Detailed log history of the execution. */
    logHistory: LogEntry[];
    /** Summary statistics of the execution run. */
    stats: RunStats;
}

// --- The Core Scraping Logic as a TaskFunction (scrapeSingleProduct) ---
// This function remains unchanged.
// --- MODIFIED Core Scraping Logic for VEVOR ---
const scrapeSingleProduct: TaskFunction<ProductData> = async (
    browser: Browser,
    url: string,
    options: TaskOptions
): Promise<ProductData[]> => {
    let page: Page | null = null;
    const MAX_IMAGE_ATTEMPTS = 5; // Define max attempts for image loop

    try {
        // console.log(`[Task Worker START] URL: ${url}`); // Added Log
        page = await browser.newPage();

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

        // console.log(`[Task Worker GOTO] URL: ${url}`); // Added Log
        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 90000, // Keep timeout reasonable
        });

        // console.log(`[Task Worker WAIT H1] URL: ${url}`); // Added Log
        // Wait for a key element like H1
        await page.waitForSelector('h1', { timeout: 60000 }); // Use a specific, reliable selector if H1 isn't always the best

        await page.evaluate(() => {
            const el = document.querySelector('.top-recom_LU11');
            if (el) {
              el.remove(); // remove the element
            }
          });
          
        // console.log(`[Task Worker GET NAME] URL: ${url}`); // Added Log
        const name = await page.$eval('h1', el => el.textContent?.trim() || '');
        let articleNumber = 'NOT_FOUND'; // Default value

        // console.log(`[Task Worker GET ARTICLE] URL: ${url}`); // Added Log
        try {
            // Try primary selector (be specific if possible)
            articleNumber = await page.$eval(
                'div[style*="margin-top: -20px; height: 20px; line-height: 20px; color: #fff; font-size: 18px;"]', // This style selector is brittle
                el => el.textContent?.trim() || 'NOT_FOUND'
            );
        } catch (err) {
             // console.log(`[Task Worker ARTICLE Primary Failed] URL: ${url}`); // Added Log
            try {
                // Try fallback selector
                articleNumber = await page.$eval(
                    'div.goodsSnOnly_QVBb', // This class seems more stable
                    el => el.textContent?.trim() || 'NOT_FOUND'
                );
            } catch (fallbackErr) {
                console.warn(`[Task Worker ARTICLE Both Failed] URL: ${url} - Error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
                // Keep articleNumber as 'NOT_FOUND'
            }
        }


        // --- Image Extraction Logic ---
        // console.log(`[Task Worker IMAGES START] URL: ${url}`); // Added Log
        let images: string[] = [];
        let imageAttempts = 0; // Initialize attempt counter
        const initialImages: Record<string, string> = {}
        // Check for "More Images" button
        const moreImagesButton = await page.$('a.detailImg_more.js-btnMoreImgVideo');
        if (moreImagesButton) {
             // console.log(`[Task Worker IMAGES Click More] URL: ${url}`); // Added Log
             try {
                 await page.evaluate(btn => (btn as HTMLElement).click(), moreImagesButton);
                 await page.waitForSelector('.imgOther_itemList', { timeout: 10000 }); // Wait briefly for modal
             } catch (e) {
                  console.warn(`[Task Worker IMAGES More Button Error] URL: ${url} - ${e instanceof Error ? e.message : String(e)}`)
             }
        }

        while (images.length === 0 && imageAttempts < MAX_IMAGE_ATTEMPTS) {
            imageAttempts++;
            try {
                // await page.waitForSelector('img[src*="goods_thumb"]', { timeout: 5000 }); // <-- wait for images to appear
                
                const thumbnails = await page.$$(`img[src*="goods_thumb"]`);
                for (const thumbnail of thumbnails) {
                    const imageUrl = await page.evaluate(img => (img as HTMLImageElement).src, thumbnail);
                    if (imageUrl) {
                        const updatedImageUrl = imageUrl.replace('goods_thumb', 'original_img').replace("original_img_220", "original_img");

                        initialImages[updatedImageUrl] = imageUrl
                        images.push(updatedImageUrl);
                    }
                }
            } catch (err) {
                console.warn(`[Image Error attempt ${imageAttempts}] URL: ${url} - ${err instanceof Error ? err.message : String(err)}`);
            }
        
            if (images.length === 0 && imageAttempts < MAX_IMAGE_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // wait before next attempt
            }
        }
        
        if (images.length === 0) {
            console.warn(`[Failed to fetch images after ${MAX_IMAGE_ATTEMPTS} attempts] URL: ${url}`);
        }
        
        images = [...new Set(images)];
        
         // Deduplicate
        // console.log(`[Task Worker IMAGES Found: ${images.length}] URL: ${url}`); // Added Log
        // --- End Image Extraction ---


        // --- Description Extraction ---
        // console.log(`[Task Worker GET DESC] URL: ${url}`); // Added Log
        let description = 'NOT_FOUND';
        try {
            // Prefer more specific selectors if possible
            description = await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('ul.ul_k4l8 li'));
                return items.map(li => li.textContent?.trim() || '').join(' ');
            });

            const fullDescription = await page.evaluate(() => {
                const container = document.querySelector('div.longText2_vwWK');
                if (!container) return '';
            
                const parts: string[] = [];
                
                container.querySelectorAll('h3, p').forEach(el => {
                    parts.push(el.textContent?.trim() || '');
                });
            
                return parts.join('\n\n'); // Separate sections with double newlines
            });

            description + fullDescription
        } catch (descError) {
             console.warn(`[Task Worker DESC Failed] URL: ${url} - Error: ${descError instanceof Error ? descError.message : String(descError)}`);
             description = 'NOT_FOUND';
        }
        // --- End Description ---

        // console.log(`[Task Worker GET CATEGORY] URL: ${url}`); // Added Log
        let category = 'NOT_FOUND';
        try {
             category = await page.$$eval('div.gPath_mid a', links =>
                links.map(link => link?.textContent?.trim()).filter(Boolean).join(', ')
            );
        } catch(catError) {
             console.warn(`[Task Worker CATEGORY Failed] URL: ${url} - Error: ${catError instanceof Error ? catError.message : String(catError)}`);
        }


        // console.log(`[Task Worker GET AVAILABILITY] URL: ${url}`); // Added Log
        let isAvailable = false;
        try {
            await page.waitForSelector('span', { timeout: 20000 }); // wait until at least one <span> shows up
            const availabilityHandle = await page.waitForFunction(() => {
                return Array.from(document.querySelectorAll('span')).some(span => span.textContent?.trim() === 'W Magazynie');
            }, { timeout: 20000 });
            isAvailable = await availabilityHandle.jsonValue();
        } catch (availError) {
            console.warn(`[Task Worker AVAILABILITY Failed] URL: ${url} - Error: ${availError instanceof Error ? availError.message : String(availError)}`);
        }            
        


        // --- Parameters Extraction ---
        // console.log(`[Task Worker GET PARAMS] URL: ${url}`); // Added Log
        let parameters: Record<string, string[]> = {};
        //  try {
        //     const parameterRows = await page.$$('.detailInfo_attr .detailAttr_row');
        //     for (const row of parameterRows) {
        //          try { // Add inner try-catch for robustness per row
        //              const paramName = await row.$eval('detailAttr_label_pYwz label', el =>
        //                  el.textContent?.trim().replace(":", "").replace(" ", "_") || ''
        //              );
        //              const values = await row.$$eval('.detailAttr_item .detailAttr_text', items =>
        //                  items.map(item => item.textContent?.trim() || '').filter(Boolean)
        //              );
        //              if (paramName && values.length > 0) {
        //                 parameters[paramName] = values;
        //              }
        //          } catch(paramRowError){
        //              console.warn(`[Task Worker PARAM Row Failed] URL: ${url} - Error: ${paramRowError instanceof Error ? paramRowError.message : String(paramRowError)}`);
        //          }
        //     }
        // } catch (paramsError) {
        //      console.warn(`[Task Worker PARAMS Section Failed] URL: ${url} - Error: ${paramsError instanceof Error ? paramsError.message : String(paramsError)}`);
        // }

        // --- End Parameters ---

        // --- Characteristics Extraction ---
        // console.log(`[Task Worker GET CHARS] URL: ${url}`); // Added Log
        let characteristics: Record<string, string> = {};
         try {
            const characteristicRows = await page.$$('.specificationBox dl');
            for (const row of characteristicRows) {
                 try { // Add inner try-catch
                     const key = await row.$eval('dt', el => el.textContent?.trim() || '');
                     const value = await row.$eval('dd', el => el.textContent?.trim() || '');
                     if(key && value) characteristics[key] = value;
                 } catch(charRowError) {
                      console.warn(`[Task Worker CHAR Row Failed] URL: ${url} - Error: ${charRowError instanceof Error ? charRowError.message : String(charRowError)}`);
                 }
            }
         } catch (charsError) {
              console.warn(`[Task Worker CHARS Section Failed] URL: ${url} - Error: ${charsError instanceof Error ? charsError.message : String(charsError)}`);
         }
        // --- End Characteristics ---


        const specifications = await page.evaluate(() => {
            const result: Record<string, string> = {};
            
            const specSection = Array.from(document.querySelectorAll('div.flex-item-txt-title'))
                .find(el => el.textContent?.trim() === 'Specyfikacje')?.closest('.flex-item');
        
            if (!specSection) return result;
        
            const items = specSection.querySelectorAll('ul.flex-item-uls-li li.flex-item-uls-lis');
        
            for (const item of items) {
                const text = item.querySelector('.flex-item-uls-lis-right span')?.textContent?.trim() || '';
                if (!text) continue;
        
                const [key, ...rest] = text.split(':');
                if (rest.length) {
                    result[key.trim()] = rest.join(':').trim();
                } else {
                    // If no colon, just use the value as both key and value
                    result[text] = text;
                }
            }
        
            return result;
        });
        
        // --- Current Params Extraction ---
        // console.log(`[Task Worker GET CURRENT PARAMS] URL: ${url}`); // Added Log
        let currentParams: Record<string, string> = {};
        characteristics = await page.evaluate(() => {
            const rows = document.querySelectorAll('div.detailAttr_row_V75H');
            const result: Record<string, string> = {};
          
            rows.forEach(row => {
              const label = row.querySelector('label')?.textContent?.trim().replace(/:$/, '') || '';
              const value = row.querySelector('strong')?.textContent?.trim() || '';
              if (label && value) {
                result[label] = value;
              }
            });
          
            return result;
          });
          
        characteristics = {...characteristics, ...specifications}
        // --- End Current Params ---


        // --- Price Extraction ---
        // console.log(`[Task Worker GET PRICE] URL: ${url}`); // Added Log
         let price = '';
         let discountPrice = '';
        // --- End Price ---


        console.log(initialImages)
        const productData: ProductData = {
            url,
            name: name || 'NOT_FOUND', // Use default if empty
            images,
            description,
            parameters,
            characteristics,
            currentParams,
            category: category,
            articleNumber,
            isAvailable,
            price, // Use extracted price
            discountPrice, // Use extracted discount price,
            brand: "Vevor"
        };

        // console.log(productData)
        // console.log(`[Task Worker SUCCESS] URL: ${url}`); // Added Log
        return [productData];
    } catch (error) {
         // Log error before throwing
         console.error(`[Task Worker FAILED] URL: ${url} - Error: ${error instanceof Error ? error.message : String(error)} - Stack: ${error instanceof Error ? error.stack : ''}`); // Log stack trace
         throw error; // Re-throw for concurrency handler
    } finally {
        if (page) {
            // console.log(`[Task Worker CLOSING] URL: ${url}`); // Added Log
            try { await page.close(); } catch (e) { console.error(`[Task Worker CLOSE FAILED] URL: ${url} - Error: ${e instanceof Error ? e.message : String(e)}`)}
        }
        // console.log(`[Task Worker END] URL: ${url}`); // Added Log
    }
};
// --- Main Scraping Function Using the Concurrency Handler ---
export async function scrapeProductLinks(links: string[], threads: number): Promise<ScrapeProductsResult> {
    console.log(`🚀 Starting product scraping for ${links.length} URLs...`);
    const recommendedThreads = 7;
    const maxThreads = threads > 0 ? threads : recommendedThreads;
    const overallStartTime = new Date();

    console.log(`⚙️ Using concurrency: ${maxThreads}`);

    let browser: Browser | null = null;
    let results: ProcessUrlsResult<ProductData> | null = null;
    // FIX: Declare uniqueLinks outside the try block
    let uniqueLinks: string[] = [];

    // Define a default return structure for error cases
    const createDefaultResult = (startTime: Date): ScrapeProductsResult => {
        const endTime = new Date();
        return {
            products: [],
            failedTasks: [{ url: 'N/A', error: new Error('Scraping process failed or was aborted early.') }],
            logHistory: [],
            stats: {
                startTime, endTime,
                durationMs: endTime.getTime() - startTime.getTime(),
                totalUrlsProvided: links.length, totalUrlsAttempted: 0,
                totalSuccess: 0, totalFailed: 0, totalRetriesMade: 0
            }
        };
    };

    try {
        const PROXY_HOST = process.env.PROXY_HOST || 'localhost';
        const PROXY_PORT = process.env.PROXY_PORT || '8080';
        browser = await puppeteer.launch({ headless: true, args: ['--window-size=1280,800', `--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`]});

        // FIX: Assign value inside the try block
        uniqueLinks = [...new Set(links)];
        if (uniqueLinks.length < links.length) {
            console.log(`ℹ️ Removed ${links.length - uniqueLinks.length} duplicate URLs.`);
        }

        const options: ProcessUrlsOptions = {
            maxRetries: 2,
            retryDelayMs: (attempt) => attempt * 1500,
            isRetryable: (error: Error) => error instanceof TimeoutError || error.message.includes('Navigation timeout') || error.message.includes('net::ERR_'),
            logToConsole: true,
            mode: 'threads',
            onProgress: (completed, total, stats) => {
                const percentage = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;
                console.log(`📊 Progress: ${completed}/${total} (${percentage}%) | Success: ${stats.totalSuccess}, Failed: ${stats.totalFailed}, Retries: ${stats.totalRetriesMade}`);
            },
            onError: (error, url, attempt) => {
                console.error(`Error (Final Failure) [Attempt ${attempt}] for ${url}: ${error.name} - ${error.message}`);
            }
        };

        console.log("LENGTHS: ", uniqueLinks.length, links.length)
        // Execute concurrent scraping
        results = await processUrlsConcurrentlyInTabs<ProductData>(
            browser,
            uniqueLinks, // Use the assigned uniqueLinks
            maxThreads,
            scrapeSingleProduct,
            options
        );

        // Display summary log if results were obtained
        console.log("\n" + formatRunLogForTerminal(results.logHistory, results.stats));

    } catch (error) {
        console.error(`💥 Critical error during concurrent processing setup or execution: ${error instanceof Error ? error.message : String(error)}`);
        // results will remain null or potentially incomplete
    } finally {
        if (browser) {
            await browser.close();
            console.log("🚪 Browser closed.");
        }
    }

    // --- Post-processing and constructing the final result ---
    if (!results) {
        console.error("❌ Scraping process failed to produce results object.");
        return createDefaultResult(overallStartTime); // Return default error structure
    }

    // Deduplicate successful results
    const successfulProducts = results.successfulResults;
    const uniqueProductsMap = new Map<string, ProductData>();
    successfulProducts.forEach(product => {
        if (product.articleNumber && product.articleNumber !== "none" && !uniqueProductsMap.has(product.articleNumber)) {
            uniqueProductsMap.set(product.articleNumber, product);
        } else if (!product.articleNumber || product.articleNumber === "none") {
            console.warn(`⚠️ Product scraped without valid article number, cannot deduplicate reliably: ${product.url}`);
            uniqueProductsMap.set(product.url, product); // Add using URL as key
        }
    });
    const finalDeduplicatedProducts = Array.from(uniqueProductsMap.values());

    if (finalDeduplicatedProducts.length < successfulProducts.length) {
        console.log(`ℹ️ Removed ${successfulProducts.length - finalDeduplicatedProducts.length} duplicates based on article number after scraping.`);
    }

    // Optional: Sort results based on the original input link order
    // FIX: uniqueLinks is now accessible here
    if (uniqueLinks.length > 0) { // Add check to prevent sorting if uniqueLinks is empty (e.g., early error)
        finalDeduplicatedProducts.sort((a, b) => uniqueLinks.indexOf(a.url) - uniqueLinks.indexOf(b.url));
    } else {
        console.warn("⚠️ Could not sort results by original order as uniqueLinks array is empty (likely due to an early error).");
    }


    console.log(`🎯 Scraping complete! Total unique products scraped: ${finalDeduplicatedProducts.length}`);
    if (results.failedTasks.length > 0) {
        console.warn(`⚠️ ${results.failedTasks.length} URLs failed all retry attempts.`);
    }

    // Construct the final result object matching ScrapeProductsResult
    const scrapeResult: ScrapeProductsResult = {
        products: finalDeduplicatedProducts,
        failedTasks: results.failedTasks,
        logHistory: results.logHistory,
        stats: results.stats
    };

    return scrapeResult;
}