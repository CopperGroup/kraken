import type { ScraperResult } from "@/lib/types/scraper"
import type { GetCatalogLinksResult, GetCatalogPagesResult } from "@/lib/scraper/cataog.actions"
import type { ScrapeProductsResult } from "@/lib/scraper/product.actions"

// Helper to determine if result is GetCatalogPagesResult
export function isGetCatalogPagesResult(result: ScraperResult): result is ScraperResult & GetCatalogPagesResult {
  return result.functionName === "getCatalogPagesLinks"
}

// Helper to determine if result is GetCatalogLinksResult
export function isGetCatalogLinksResult(result: ScraperResult): result is ScraperResult & GetCatalogLinksResult {
  return result.functionName === "getCatalogLinks"
}

// Helper to determine if result is ScrapeProductsResult
export function isScrapeProductsResult(result: ScraperResult): result is ScraperResult & ScrapeProductsResult {
  return result.functionName === "scrapeProductLinks"
}
