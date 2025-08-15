import type { GetCatalogLinksResult, GetCatalogPagesResult } from "@/lib/scraper/cataog.actions"
import type { ScrapeProductsResult } from "@/lib/scraper/product.actions"

export type ScraperResult = (GetCatalogLinksResult | GetCatalogPagesResult | ScrapeProductsResult) & {
  // Add properties added by the frontend
  functionName: "getCatalogLinks" | "getCatalogPagesLinks" | "scrapeProductLinks"
  timestamp: Date
  source: string
}

