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
} from '../concurrency.core'; // Adjust path as needed
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

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
const scrapeSingleProduct: TaskFunction<ProductData> = async (
    browser: Browser,
    url: string,
    options: TaskOptions
): Promise<ProductData[]> => {
    let page: Page | null = null;
    try {
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

        await page.setViewport({ width: 1280, height: 800 });
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 90000,
        });

        // Wait for a key element
        await page.waitForFunction(() => {
            return document.querySelector('h1.parts__Title-sc-9f9a7c18-4') ||
                   document.querySelector('h1[data-name="productTitle"]');
        }, { timeout: 60000 });
        
        // Get the name using the available selector
        const name = await page.evaluate(() => {
            const el = document.querySelector('h1.parts__Title-sc-9f9a7c18-4') ||
                       document.querySelector('h1[data-name="productTitle"]');
            return el?.textContent?.trim() || '';
        });

        const articleNumber = await page.evaluate(() => {
            const wrapper = document.querySelector('span.parts__ShopCodeWrapper-sc-9f9a7c18-8');
            if (!wrapper) return "none";
            const match = wrapper.textContent?.match(/x-kom.*?:\s*(\d+)/);
            return match ? match[1] : "none";
        });

        // --- Image Extraction Logic (simplified, use previous version's if needed) ---
        const imageSelector = '.parts__Img-sc-563da1c5-1';
        let images: string[] = [];
        const thumbnails = await page.$$(imageSelector);
        for (const thumbnail of thumbnails) {
             const { src, alt } = await page.evaluate(img => ({
                    src: img.getAttribute('src') || '',
                    alt: img.getAttribute('alt') || ''
                }), thumbnail);
              
            if (src && alt && alt.slice(0, name.length).replace(/\s+/g, '') === name.replace(/\s+/g, '')) {
                const updatedImageUrl = src.replace('product-small', 'product-new-big');
                if (updatedImageUrl.startsWith('http') && updatedImageUrl.includes('product-new-big')) {
                    images.push(updatedImageUrl);
                }
            }
        }
        if (images.length === 0) {
             console.warn(`[Task Worker] Could not extract images for ${name}. URL: ${url}`);
        }

        images = [...new Set(images)]
        // --- End Image Extraction ---


        // --- Description Extraction Logic (simplified, use previous version's if needed) ---
        let description = '';
        try {
            const descHandle = await page.$('.desc_section.head_desc p');
            
            if (descHandle) {
                description = await page.evaluate(el => el.textContent?.trim(), descHandle) || "";
                console.log(`📄 Extracted short description.`);
            } else {
                console.log(`📄 No short description found.`);
            }
        
            const blocks = await page.$$eval('div.full_row', (rows) =>
                rows.map(row => {
                    const header = row.querySelector('h3')?.textContent?.trim() || '';
                    const paragraph = row.querySelector('p')?.textContent?.trim() || '';
                    return `${header} \n ${paragraph}`;
                })
            );
        
            if (blocks && blocks.length) {
                description += "\n\n" + blocks.join("\n\n");
            } else {
                console.warn(`[Task Worker] Primary description not found. URL: ${url}`);
            }
        
            // Clean known marketing paragraph
            description = description.replace(/[\n\s]+$/g, '\n').replace(`Zadbaj o eXtra ochronę swojego urządzenia 
                Zalany laptop? Zbity ekran? Tego nikt nie planuje, ale każdemu może się zdarzyć. Jednak z eXtra ochroną unikniesz stresu i dodatkowych kosztów. Ubezpieczyciel naprawi Twój sprzęt za darmo i w krótkim czasie. Natomiast w przypadku kradzieży z rabunkiem lub włamania, dostaniesz voucher na zakup nowego urządzenia. Możesz też wykupić ochronę na wypadek awarii po gwarancji producenta. Poznaj więcej szczegółów na temat eXtra ochrony.`, "").replace(
                    `

Zadbaj o eXtra ochronę swojego urządzenia 
 Zalany laptop? Zbity ekran? Tego nikt nie planuje, ale każdemu może się zdarzyć. Jednak z eXtra ochroną unikniesz stresu i dodatkowych kosztów. Ubezpieczyciel naprawi Twój sprzęt za darmo i w krótkim czasie. Natomiast w przypadku kradzieży z rabunkiem lub włamania, dostaniesz voucher na zakup nowego urządzenia. Możesz też wykupić ochronę na wypadek awarii po gwarancji producenta. Poznaj więcej szczegółów na temat eXtra ochrony.`
                , "");
        
            // Remove trailing newlines and spaces
            description = description.replace(/[\n\s]+$/g, '\n');
        
        } catch (error) {
            console.warn(`[Task Worker] Error extracting description for ${url}: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // ⛑ Fallback to extracting from `.content` if description is still empty
        if (description.trim() === "") {
            const contentHandle = await page.$('div.content');
            if (contentHandle) {
                description = await page.evaluate((el) => {
                    const result: string[] = [];
        
                    // Get all h2s
                    el.querySelectorAll('h2').forEach(h2 => {
                        const text = h2.textContent?.trim();
                        if (text) result.push(text);
                    });
        
                    // Get all p tags with no class
                    el.querySelectorAll('p').forEach(p => {
                        const text = p.textContent?.trim();
                        if (text && p.classList.length === 0) result.push(text);
                    });
        
                    return result.join('\n\n');
                }, contentHandle);
        
                console.log("🧩 Fallback description extracted from .content");
            } else {
                console.warn("🛑 Fallback .content container not found.");
            }
        }
        
        if(description.trim() === "") {
            const contentHandle = await page.$('div.content');
            if (contentHandle) {
                description = await page.evaluate((el) => {
                    const result: string[] = [];
        
                    // Get all h2s
                    el.querySelectorAll('h3').forEach(h3 => {
                        const text = h3.textContent?.trim();
                        if (text) result.push(text);
                    });
        
                    // Get all p tags with no class
                    el.querySelectorAll('div.content1').forEach(div => {
                        const text = div.textContent?.trim();
                        if (text) result.push(text);
                    });
        
                    return result.join('\n\n');
                }, contentHandle);
        
                console.log("🧩 Fallback description extracted from .content");
            } else {
                console.warn("🛑 Fallback .content container not found.");
            }
        }

        if(description === "") {
            description = "Not found"
        }
        // Optionally clean duplicates here
        // description = removeDuplicateSentences(description);
        
        const category = await page.$$eval('div.parts__Label-sc-45237132-9 a.parts__LinkOrSpan-sc-45237132-5', links =>
            links
                //@ts-ignore
                .filter(link => link.parentElement?.tagName !== 'SPAN')
                .slice(1)
                .map(link => link.textContent?.trim())
                .filter(Boolean)
                .join(', ')
        );

        const isAvailable = await page.evaluate(() => {
            const stockElement = document.querySelector('span.sectionParts__Text-sc-54a676c-1');
            const _1perPerson = document.querySelector('div.parts__Wrapper-sc-aebf06df-0')
            return stockElement ? (stockElement.classList.contains('fIzMoT') || stockElement.classList.contains('SimtZ') || _1perPerson?.textContent === "Możesz kupić maks. 1 szt. na osobę") : false;
        });

        // --- Parameters Extraction Logic (simplified, use previous version's if needed) ---
        const parameters: Record<string, string[]> = {};
         try {
             const parameterRows = await page.$$('div.parts__RowFeaturesTable-sc-ba807a3-0');
             for (const row of parameterRows) {
                 const paramName = await row.$eval('div.parts__Key-sc-ba807a3-1', el => el.textContent?.trim().replace(":", "") || '');
                 const values = await row.$$eval('div.parts__Cell-sc-ba807a3-3', items => items.map(item => item.textContent?.trim() || '').filter(Boolean));
                 if (paramName && values.length > 0) parameters[paramName] = values;
             }
        } catch (error) {
              console.warn(`[Task Worker] Error extracting parameters for ${url}: ${error instanceof Error ? error.message : String(error)}`);
        }
        // --- End Parameters ---
        const priceDetails = await page.evaluate(() => {
          const buybox = document.querySelector('div[data-name="buybox"]');
          if (!buybox) return { price: '', discountPrice: '' };
      
          const priceElement = buybox.querySelector('span[aria-label^="Aktualna cena:"]');
          const discountPriceElement = buybox.querySelector('p.parts__PriceInfoSection-sc-c296db28-0 span.parts__Price-sc-c296db28-1');
      
          // Helper function to clean the price text
          const cleanPrice = (text: string) => {
              if (!text) return '';
              return text.trim().replace(/\s*zł$/, '').replace(/\s/g, '');
          };
      
          const findFirstZlotySpan = () => {
              const spans = Array.from(buybox.querySelectorAll('span'));
              return spans.find(span => span.textContent?.includes('zł'));
          };
      
          const currentPriceText = priceElement?.textContent || findFirstZlotySpan()?.textContent || '';
          const discountPriceText = discountPriceElement?.textContent || '';
      
          return {
              discountPrice: cleanPrice(currentPriceText || ''),
              price: cleanPrice(discountPriceText || '') // "Najniższa cena..." or similar
          };
      });
      
      const brand = await page.evaluate(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        for (const div of divs) {
            if (div.textContent?.includes("od:")) {
                const link = div.querySelector('a');
                return link?.textContent?.trim() || "none";
            }
        }
        return "none";
    });
    
        
        
        const price = priceDetails.price; // Current selling price (e.g., '3999,00')
        const discountPrice = priceDetails.discountPrice; // Reference price / "Lowest price in 30 days" (e.g., '4199,00') 

        const characteristics: Record<string, string> = {};
        const currentParams: Record<string, string> = {};
        

        const productData: ProductData = {
            url,
            name,
            images,
            description,
            parameters,
            characteristics,
            currentParams,
            category,
            articleNumber,
            isAvailable,
            price: price ? price : discountPrice,
            discountPrice: price ? discountPrice : "",
            brand
        };

        return [productData]; // Return as array

    } catch (error) {
        throw error; // Re-throw for concurrency handler
    } finally {
        if (page) {
            try { await page.close(); } catch (e) { /* ignore */ }
        }
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
        browser = await puppeteer.launch({ headless: true, args: ['--window-size=1280,800']});

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

        // console.log("LENGTHS: ", uniqueLinks.length, links.length)
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