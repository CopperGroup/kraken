// pages/ScraperDashboard.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import Sidebar from "@/components/scraper/sidebar"
import Header from "@/components/scraper/header"
import LaunchTab from "@/components/scraper/launch-tab"
import StatsTab from "@/components/scraper/stats-tab"
import LogsTab from "@/components/scraper/logs-tab"
import ResultsTab from "@/components/scraper/results-tab"
import AnalyticsTab from "@/components/scraper/analytics-tab"
import ProductComparisonTab from "@/components/scraper/product-comparison-tab"
import FilesTab from "@/components/scraper/files-tab"

// --- Import NEW file-based database functions ---
import {
  requestDirHandle,
  initFilesystem,
  getScraperResults,
  addScraperResult,
  deleteScraperResult,
  clearScraperResults,
} from "@/lib/db/json-file-db" // Changed import

import {
  getCatalogLinks as getXKomCatalogLinks,
  getCatalogPagesLinks as getXKomCatalogPagesLinks,
} from "@/lib/scraper/cataog.actions"
import { scrapeProductLinks as scrapeXKomProductLinks } from "@/lib/scraper/product.actions"

import {
  getCatalogLinks as getVevorCatalogLinks,
  getCatalogPagesLinks as getVevorCatalogPagesLinks,
} from "@/lib/scraper/vevor/catalog.actions"
import { scrapeProductLinks as scrapeVevorProductLinks } from "@/lib/scraper/vevor/product.actions"

import { fetchAndParseSitemap } from "@/lib/scraper/vevor/sitemap.products"

import type { ScraperResult } from "@/lib/types/scraper"
import { launchBot } from "@/lib/actions/bot.actions"
import { parseGeekXML } from "@/lib/xml-scraper/geek"

// No need for FileGroup interface or related state/logic since we are replacing it
// The fileGroups state is completely separate as per your instruction.
// The file download logic will be handled differently.
// Therefore, we can remove the FileGroup interface and all related state and functions.

const PREDEFINED_URLS: Record<string, string> = {
  vevor: "https://www.vevor.pl",
  xkom: "https://www.x-kom.pl",
}

export default function ScraperDashboard() {
  const [activeTab, setActiveTab] = useState("launch")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isRunning, setIsRunning] = useState(false)
  const [runProgress, setRunProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [results, setResults] = useState<ScraperResult[]>([])
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(-1)
  const [error, setError] = useState<string | null>(null)
  const [currentFunction, setCurrentFunction] = useState<string>("")
  // The fileGroups state is kept as per instruction
  const [fileGroups, setFileGroups] = useState<any[]>([]) 
  const cancelRef = useRef(false)
  const [launchConfig, setLaunchConfig] = useState({
    target: "xkom",
    threads: 5,
    retries: 1,
    timeout: 30000,
  })
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false)
  const [websiteSettings, setWebsiteSettings] = useState<
    Record<
      string,
      {
        scrapingMode: "complete" | "specific" | "specific-product"
        specificCategoryUrl: string
        specificProductUrl: string
      }
    >
  >({
    xkom: {
      scrapingMode: "complete",
      specificCategoryUrl: "",
      specificProductUrl: "",
    },
    vevor: {
      scrapingMode: "complete",
      specificCategoryUrl: "",
      specificProductUrl: "",
    },
  })
  const [xmlSettings, setXmlSettings] = useState<
    Record<
      string,
      {
        xmlLink: string
      }
    >
  >({
    geek: {
      xmlLink: "",
    },
  })

  const updateWebsiteSettings = (website: string, field: string, value: any) => {
    setWebsiteSettings((prev) => ({
      ...prev,
      [website]: {
        ...(prev[website] || { scrapingMode: "complete", specificCategoryUrl: "", specificProductUrl: "" }),
        [field]: value,
      },
    }))
  }

  const updateXmlSettings = (source: string, field: string, value: any) => {
    setXmlSettings((prev) => ({
      ...prev,
      [source]: {
        ...(prev[source] || { xmlLink: "" }),
        [field]: value,
      },
    }))
  }

  const selectedResult =
    selectedResultIndex >= 0 && selectedResultIndex < results.length ? results[selectedResultIndex] : null

  const handleConfigChange = (field: string, value: string | number) => {
    setLaunchConfig({
      ...launchConfig,
      [field]: value,
    })
  }

  useEffect(() => {
    const handleCancel = () => {
      cancelRef.current = true
      setCurrentStep("Cancelling operation...")
    }
    window.addEventListener("cancel-scraper", handleCancel)
    return () => {
      window.removeEventListener("cancel-scraper", handleCancel)
    }
  }, [])

  // --- REVISED useEffect to load data from JSON files using File System API ---
  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      try {
        const hasPermission = await requestDirHandle();
        if (!hasPermission) {
          setError("Permission to access file system not granted. Please click 'Launch Scraper' to select a folder.");
          return;
        }

        await initFilesystem();
        const savedResults = await getScraperResults();

        if (mounted) {
          const sortedResults = savedResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setResults(sortedResults);
          // fileGroups is a separate state and should be handled by its own logic,
          // as per the user's instructions.
          if (sortedResults.length > 0) {
            setSelectedResultIndex(0);
          }
        }
      } catch (err) {
        console.error("Error loading data from File System:", err);
        setError(`Error loading data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        if (mounted) {
          setIsInitialLoadComplete(true);
        }
      }
    };
    loadData();
    return () => { mounted = false };
  }, []);
  // --- END of REVISED useEffect ---

  const formatDate = (date: Date): string => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  const launchScraper = async () => {
    cancelRef.current = false
    setIsRunning(true)
    setError(null)
    setRunProgress(0)
    setCurrentStep("Initializing scraper...")
    setCurrentFunction("")

    // Request file system access before anything else
    try {
      const hasPermission = await requestDirHandle();
      if (!hasPermission) {
        setError("Permission to access file system not granted. Please grant permission to continue.");
        setIsRunning(false);
        return;
      }
      await initFilesystem();
    } catch (e) {
      setError("Failed to initialize file system. Check browser permissions.");
      setIsRunning(false);
      return;
    }

    let bot = null
    try {
      bot = JSON.parse(await launchBot()); console.log(bot)
    } catch (error) {
      setError("Failed to launch bot. Check bot server."); setIsRunning(false);
      return;
    }
    if (!bot.available || !bot) {
      setError("Bot not available.");
      setIsRunning(false);
      return;
    }

    try {
      if (launchConfig.target === "geek_xml") {
        if (!xmlSettings.geek?.xmlLink) throw new Error("XML feed URL is not configured for Geek")
        setCurrentFunction("parseGeekXml"); setCurrentStep(`[geek.com] Parsing XML feed...`); setRunProgress(50)
        try {
          const productsString = await parseGeekXML(xmlSettings.geek.xmlLink)
          const timestamp = new Date(); let productCount = 0
          try { const products = JSON.parse(productsString); productCount = Array.isArray(products) ? products.length : 0 }
          catch (e) { console.warn("Could not parse products to get count:", e) }
          const runId = `geek-${timestamp.getTime()}`;
          const geekResult: ScraperResult = { id: runId, functionName: "parseGeekXml", timestamp, source: "geek", productsData: productsString, productCount }

          // --- REVISED: Add result to JSON file and update state ---
          await addScraperResult(geekResult as any);
          setResults((prev) => [geekResult, ...prev]);
          // --- END of REVISED ---

          setSelectedResultIndex(0)
          // File group logic is separate as per instructions.
          // The code block for file groups should remain unchanged here.
          const groupId = `group-${Date.now()}`
          const newFileGroup = { id: groupId, runId, source: "geek", timestamp, productCount, functionName: "parseGeekXml", files: [{ id: `${groupId}-xlsx`, runId, type: "xlsx", name: `geek_products_${formatDate(timestamp)}.xlsx`, source: "geek", timestamp, productCount, functionName: "parseGeekXml" }] }
          // The file group logic is for a separate process and should be handled here if needed.
          // For now, let's just add it to the state.
          setFileGroups((prev) => [newFileGroup, ...prev]);

          setRunProgress(100); setCurrentStep("XML feed processed successfully!"); setActiveTab("files")
        } catch (err: any) { console.error("Error parsing Geek XML:", err); throw new Error(`Error parsing Geek XML: ${err?.message || "Unknown error"}`) }
        finally { setIsRunning(false); setCurrentFunction("") }
        return
      }

      const targets = launchConfig.target === "all"
        ? [{ url: PREDEFINED_URLS.vevor, name: "vevor" }, { url: PREDEFINED_URLS.xkom, name: "xkom" }]
        : [{ url: PREDEFINED_URLS[launchConfig.target], name: launchConfig.target }]
      if (!targets[0]?.url) throw new Error(`Invalid target selected: ${launchConfig.target}`)

      for (const target of targets) {
        if (cancelRef.current) throw new Error("Operation cancelled by user")
        const siteSettings = websiteSettings[target.name] || { scrapingMode: "complete", specificCategoryUrl: "", specificProductUrl: "" }

        let productLinksToScrape: string[] = [];
        let catalogPagesDataForMerging: ScraperResult | null = null;
        const runId = `${target.name}-${new Date().getTime()}`;

        if (target.name === "vevor") {
          if (siteSettings.scrapingMode === "complete") {
            setCurrentFunction("getVevorCatalogLinks"); setCurrentStep(`[vevor] Fetching initial catalog links (method 1)...`); setRunProgress(5);
            const vevorCatalogLinksRaw = await getVevorCatalogLinks(target.url, launchConfig.threads);
            if (cancelRef.current) throw new Error("Operation cancelled by user");
            const vevorCatalogLinksResult: ScraperResult = { id: `${runId}-catalog-links-1`, ...vevorCatalogLinksRaw, functionName: "getVevorCatalogLinks", timestamp: new Date(), source: target.name };

            // --- REVISED: Add result to JSON file and update state ---
            await addScraperResult(vevorCatalogLinksResult as any);
            setResults((prev) => [vevorCatalogLinksResult, ...prev]);
            // --- END of REVISED ---

            setSelectedResultIndex(0);
            const m1Links = vevorCatalogLinksResult.subCategoryLinks || [];

            setCurrentFunction("fetchAndParseSitemap (Vevor Categories)"); setCurrentStep(`[vevor] Fetching supplemental catalog links from sitemap (method 2)...`); setRunProgress(10);
            const sitemapCategoryLinks = await fetchAndParseSitemap();
            if (cancelRef.current) throw new Error("Operation cancelled by user");
            const sitemapCategoriesResult: ScraperResult = { id: `${runId}-sitemap`, functionName: "fetchAndParseSitemapCategories", subCategoryLinks: sitemapCategoryLinks, timestamp: new Date(), source: target.name, productCount: sitemapCategoryLinks.length };

            // --- REVISED: Add result to JSON file and update state ---
            await addScraperResult(sitemapCategoriesResult as any);
            setResults((prev) => [sitemapCategoriesResult, ...prev]);
            // --- END of REVISED ---

            setSelectedResultIndex(0);

            setCurrentStep(`[vevor] Combining and deduplicating ${m1Links.length + sitemapCategoryLinks.length} category links...`);
            const combinedCategoryLinks = Array.from(new Set([...m1Links, ...sitemapCategoryLinks]));
            setRunProgress(15);
            if (cancelRef.current) throw new Error("Operation cancelled by user");

            const combinedCategoriesResult: ScraperResult = { id: `${runId}-combined`, functionName: "combineVevorCategories", subCategoryLinks: combinedCategoryLinks, timestamp: new Date(), source: target.name, productCount: combinedCategoryLinks.length };

            // --- REVISED: Add result to JSON file and update state ---
            await addScraperResult(combinedCategoriesResult as any);
            setResults((prev) => [combinedCategoriesResult, ...prev]);
            // --- END of REVISED ---

            setSelectedResultIndex(0);

            if (!combinedCategoryLinks || combinedCategoryLinks.length === 0) {
              setCurrentStep(`[vevor] No category links found from any method. Skipping product link scraping.`); setRunProgress(100); continue;
            }

            setCurrentFunction("getVevorCatalogPagesLinks"); setCurrentStep(`[vevor] Scraping product links from ${combinedCategoryLinks.length} combined categories...`); setRunProgress(20);
            const vevorCatalogPagesRaw = await getVevorCatalogPagesLinks(combinedCategoryLinks, launchConfig.threads);
            if (cancelRef.current) throw new Error("Operation cancelled by user");
            const vevorCatalogPagesResult: ScraperResult = { id: `${runId}-catalog-pages`, ...vevorCatalogPagesRaw, functionName: "getVevorCatalogPagesLinks", timestamp: new Date(), source: target.name };

            // --- REVISED: Add result to JSON file and update state ---
            await addScraperResult(vevorCatalogPagesResult as any);
            setResults((prev) => [vevorCatalogPagesResult, ...prev]);
            // --- END of REVISED ---

            setSelectedResultIndex(0); setRunProgress(50);

            if (!vevorCatalogPagesResult.links || vevorCatalogPagesResult.links.length === 0) {
              setCurrentStep(`[vevor] No product links found from categories. Skipping product detail scraping.`); setRunProgress(100); continue;
            }
            productLinksToScrape = vevorCatalogPagesResult.links;
            catalogPagesDataForMerging = vevorCatalogPagesResult;

          } else if (siteSettings.scrapingMode === "specific") {
            if (!siteSettings.specificCategoryUrl) throw new Error("Vevor specific category URL is not set.");
            setCurrentFunction("getVevorCatalogPagesLinks"); setCurrentStep(`[vevor] Scraping product links from specific category: ${siteSettings.specificCategoryUrl}`); setRunProgress(30);
            const vevorCatalogPagesRaw = await getVevorCatalogPagesLinks([siteSettings.specificCategoryUrl], launchConfig.threads);
            if (cancelRef.current) throw new Error("Operation cancelled by user");
            const vevorCatalogPagesResult: ScraperResult = { id: `${runId}-specific-catalog`, ...vevorCatalogPagesRaw, functionName: "getVevorCatalogPagesLinks", timestamp: new Date(), source: target.name };

            // --- REVISED: Add result to JSON file and update state ---
            await addScraperResult(vevorCatalogPagesResult as any);
            setResults((prev) => [vevorCatalogPagesResult, ...prev]);
            // --- END of REVISED ---

            setSelectedResultIndex(0); setRunProgress(60);
            if (!vevorCatalogPagesResult.links || vevorCatalogPagesResult.links.length === 0) {
              setCurrentStep(`[vevor] No product links found in specific category. Skipping product detail scraping.`); setRunProgress(100); continue;
            }
            productLinksToScrape = vevorCatalogPagesResult.links;
            catalogPagesDataForMerging = vevorCatalogPagesResult;

          } else if (siteSettings.scrapingMode === "specific-product") {
            if (!siteSettings.specificProductUrl) throw new Error("Vevor specific product URL is not set.");
            productLinksToScrape = [siteSettings.specificProductUrl];
          }
        }
        else {
          const getCatalogLinksFunc = target.name === "xkom" ? getXKomCatalogLinks : getVevorCatalogLinks;
          const getCatalogPagesLinksFunc = target.name === "xkom" ? getXKomCatalogPagesLinks : getVevorCatalogPagesLinks;

          if (siteSettings.scrapingMode === "complete") {
            setCurrentFunction("getCatalogLinks"); setCurrentStep(`[${target.name}] Fetching initial catalog links...`); setRunProgress(10);
            const catalogLinksResultRaw = await getCatalogLinksFunc(target.url, launchConfig.threads);
            if (cancelRef.current) throw new Error("Operation cancelled by user");
            const catalogLinksResult: ScraperResult = { id: `${runId}-catalog-links`, ...catalogLinksResultRaw, functionName: "getCatalogLinks", timestamp: new Date(), source: target.name };

            // --- REVISED: Add result to JSON file and update state ---
            await addScraperResult(catalogLinksResult as any);
            setResults((prev) => [catalogLinksResult, ...prev]);
            // --- END of REVISED ---

            setSelectedResultIndex(0); setRunProgress(30);
            if (!catalogLinksResult.subCategoryLinks || catalogLinksResult.subCategoryLinks.length === 0) {
              setCurrentStep(`[${target.name}] No sub-category links found. Skipping.`); continue;
            }
            setCurrentFunction("getCatalogPagesLinks"); setCurrentStep(`[${target.name}] Scraping product links from ${catalogLinksResult.subCategoryLinks.length} categories...`); setRunProgress(40);
            const catalogPagesResultRaw = await getCatalogPagesLinksFunc(catalogLinksResult.subCategoryLinks, launchConfig.threads);
            if (cancelRef.current) throw new Error("Operation cancelled by user");
            const catalogPagesResult: ScraperResult = { id: `${runId}-catalog-pages`, ...catalogPagesResultRaw, functionName: "getCatalogPagesLinks", timestamp: new Date(), source: target.name };

            // --- REVISED: Add result to JSON file and update state ---
            await addScraperResult(catalogPagesResult as any);
            setResults((prev) => [catalogPagesResult, ...prev]);
            // --- END of REVISED ---

            setSelectedResultIndex(0); setRunProgress(60);
            if (!catalogPagesResult.links || catalogPagesResult.links.length === 0) {
              setCurrentStep(`[${target.name}] No product links found. Skipping.`); continue;
            }
            productLinksToScrape = catalogPagesResult.links;
            catalogPagesDataForMerging = catalogPagesResult;
          } else if (siteSettings.scrapingMode === "specific") {
            if (!siteSettings.specificCategoryUrl) throw new Error(`${target.name} specific category URL is not set.`);
            setCurrentFunction("getCatalogPagesLinks"); setCurrentStep(`[${target.name}] Scraping product links from specific category: ${siteSettings.specificCategoryUrl}`); setRunProgress(30);
            const catalogPagesResultRaw = await getCatalogPagesLinksFunc([siteSettings.specificCategoryUrl], launchConfig.threads);
            if (cancelRef.current) throw new Error("Operation cancelled by user");
            const catalogPagesResult: ScraperResult = { id: `${runId}-specific-catalog`, ...catalogPagesResultRaw, functionName: "getCatalogPagesLinks", timestamp: new Date(), source: target.name };

            // --- REVISED: Add result to JSON file and update state ---
            await addScraperResult(catalogPagesResult as any);
            setResults((prev) => [catalogPagesResult, ...prev]);
            // --- END of REVISED ---

            setSelectedResultIndex(0); setRunProgress(60);
            if (!catalogPagesResult.links || catalogPagesResult.links.length === 0) {
              setCurrentStep(`[${target.name}] No product links found in specific category.`); continue;
            }
            productLinksToScrape = catalogPagesResult.links;
            catalogPagesDataForMerging = catalogPagesResult;
          } else if (siteSettings.scrapingMode === "specific-product") {
            if (!siteSettings.specificProductUrl) throw new Error(`${target.name} specific product URL is not set.`);
            productLinksToScrape = [siteSettings.specificProductUrl];
          }
        }

        if (productLinksToScrape.length > 0) {
          if (cancelRef.current) throw new Error("Operation cancelled by user");
          const scrapeProductLinksFunc = target.name === "vevor" ? scrapeVevorProductLinks : (target.name === "xkom" ? scrapeXKomProductLinks : scrapeVevorProductLinks);

          setCurrentFunction("scrapeProductLinks"); setCurrentStep(`[${target.name}] Scraping details for ${productLinksToScrape.length} products...`); setRunProgress(target.name === "vevor" && siteSettings.scrapingMode !== "specific-product" ? 70 : 50);

          const scrapeProductLinksResultRaw = await scrapeProductLinksFunc(productLinksToScrape, launchConfig.threads);
          if (cancelRef.current) throw new Error("Operation cancelled by user");

          if (catalogPagesDataForMerging && catalogPagesDataForMerging.details && target.name !== "xkom") {
            scrapeProductLinksResultRaw.products = (scrapeProductLinksResultRaw.products || []).map((p: any) => ({
              ...p,
              ...(catalogPagesDataForMerging.details![p.url] || {}),
            }));
          }

          const timestamp = new Date();
          const scrapeProductLinksResult: ScraperResult = { id: `${runId}-products`, ...scrapeProductLinksResultRaw, functionName: "scrapeProductLinks", timestamp, source: target.name };

          // --- REVISED: Add result to JSON file and update state ---
          await addScraperResult(scrapeProductLinksResult as any);
          setResults((prev) => [scrapeProductLinksResult, ...prev]);
          // --- END of REVISED ---

          setSelectedResultIndex(0);

          // File group logic remains unchanged here as per your instruction.
          const groupId = `group-${Date.now()}`;
          const newFileGroup = {
            id: groupId, runId, source: target.name, timestamp,
            productCount: scrapeProductLinksResult.products?.length || 0,
            functionName: "scrapeProductLinks",
            files: [
              { id: `${groupId}-xml`, runId, type: "xml", name: `${target.name}_products_${formatDate(timestamp)}.xml`, source: target.name, timestamp, productCount: scrapeProductLinksResult.products?.length || 0, functionName: "scrapeProductLinks" },
              { id: `${groupId}-xlsx`, runId, type: "xlsx", name: `${target.name}_products_${formatDate(timestamp)}.xlsx`, source: target.name, timestamp, productCount: scrapeProductLinksResult.products?.length || 0, functionName: "scrapeProductLinks" },
            ],
          };
          // The file group logic is for a separate process and should be handled here if needed.
          // For now, let's just add it to the state.
          setFileGroups((prev) => [newFileGroup, ...prev]);
          
          setRunProgress(95);
        } else if (siteSettings.scrapingMode !== "specific-product") {
          setCurrentStep(`[${target.name}] No product links were found to scrape details.`);
          setRunProgress(100)
        }
      }

      setRunProgress(100)
      setCurrentStep("Scraping process completed successfully!")
      setActiveTab("files")
    } catch (err: any) {
      if (err.message === "Operation cancelled by user") {
        setError("Operation cancelled by user"); setCurrentStep("Scraping cancelled.")
      } else {
        setError(`An error occurred: ${err?.message || "Unknown error"}. Check console for details.`);
        console.error("Scraper execution error:", err); setCurrentStep("Scraping failed.")
      }
    } finally {
      setIsRunning(false); setCurrentFunction(""); cancelRef.current = false
    }
  }

  // --- REVISED: Clear all results from JSON files and state ---
  const clearAllResults = async () => {
    try {
      await clearScraperResults();
      // fileGroups is a separate state and should be handled by its own logic, as per the user's instructions.
      // So, we'll only clear the results state here.
      setResults([]);
      setSelectedResultIndex(-1);
    } catch (e) {
      setError(`Failed to clear results: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
  // --- END of REVISED ---

  // --- REVISED: Delete a specific result from JSON file and state ---
  const deleteResult = async (index: number) => {
    try {
      const resultToDelete = results[index]
      if (resultToDelete) {
        await deleteScraperResult(resultToDelete.id)

        // fileGroups is a separate state and should be handled by its own logic, as per the user's instructions.
        // We will leave the original file group logic here.
        setFileGroups((prev) => {
          if (resultToDelete) {
            const expectedRunId = `${resultToDelete.source}-${resultToDelete.timestamp.getTime()}`;
            return prev.filter((group: any) => group.runId !== expectedRunId && group.runId !== resultToDelete.id);
          }
          return prev;
        });
      }

      setResults((prev) => { const newResults = [...prev]; newResults.splice(index, 1); return newResults })
      if (selectedResultIndex === index) setSelectedResultIndex(results.length > 1 ? Math.max(0, index - 1) : -1)
      else if (selectedResultIndex > index) setSelectedResultIndex(selectedResultIndex - 1)
    } catch (e) {
      setError(`Failed to delete result: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
  // --- END of REVISED ---

  useEffect(() => {
    if (results.length === 0 && activeTab !== "launch") setActiveTab("launch")
  }, [results, activeTab])

  return (
    <div className="flex h-screen bg-black text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} results={results} selectedResultIndex={selectedResultIndex} setSelectedResultIndex={setSelectedResultIndex} deleteResult={deleteResult} clearAllResults={clearAllResults} />
      <div className="flex-1 overflow-hidden flex flex-col">
        <Header activeTab={activeTab} selectedResult={selectedResult} />
        <main className="p-6 flex-1 overflow-auto">
          {activeTab === "launch" && (
            <LaunchTab launchConfig={launchConfig} handleConfigChange={handleConfigChange} websiteSettings={websiteSettings} updateWebsiteSettings={updateWebsiteSettings} xmlSettings={xmlSettings} updateXmlSettings={updateXmlSettings} isRunning={isRunning} error={error} runProgress={runProgress} currentStep={currentStep} currentFunction={currentFunction} launchScraper={launchScraper} />
          )}
          {activeTab === "stats" && (<StatsTab results={results} selectedResultIndex={selectedResultIndex} setSelectedResultIndex={setSelectedResultIndex} />)}
          {activeTab === "logs" && <LogsTab selectedResult={selectedResult} />}
          {activeTab === "results" && (<ResultsTab selectedResult={selectedResult} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} setItemsPerPage={setItemsPerPage} />)}
          {activeTab === "files" && (<FilesTab results={results} fileGroups={fileGroups} setFileGroups={setFileGroups} />)}
          {activeTab === "comparison" && <ProductComparisonTab results={results} />}
          {activeTab === "analytics" && <AnalyticsTab results={results} />}
        </main>
      </div>
    </div>
  )
}