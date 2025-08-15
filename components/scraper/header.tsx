import type { ScraperResult } from "@/lib/types/scraper"
import { isGetCatalogLinksResult, isGetCatalogPagesResult } from "@/lib/utils/type-guards"

type HeaderProps = {
  activeTab: string
  selectedResult: ScraperResult | null
}

export default function Header({ activeTab, selectedResult }: HeaderProps) {
  return (
    <header className="bg-[#111] border-b border-[#333] p-4 sticky top-0 z-10">
      <h1 className="text-xl font-mono">
        {activeTab === "launch" && "Launch Scraper"}
        {activeTab === "stats" &&
          selectedResult &&
          `Statistics for ${selectedResult.functionName} (${selectedResult.source})`}
        {activeTab === "stats" && !selectedResult && "Statistics Overview"}
        {activeTab === "logs" && selectedResult && `Logs for ${selectedResult.functionName} (${selectedResult.source})`}
        {activeTab === "logs" && !selectedResult && "Execution Logs"}
        {activeTab === "results" &&
          selectedResult &&
          `${isGetCatalogLinksResult(selectedResult) ? "Subcategory Links" : isGetCatalogPagesResult(selectedResult) ? "Product Links" : "Scraped Products"} for ${selectedResult.functionName} (${selectedResult.source})`}
        {activeTab === "results" && !selectedResult && "Results"}
        {activeTab === "files" && "File Management"}
        {activeTab === "comparison" && "Product Data Comparison"}
        {activeTab === "analytics" && "Analytics Dashboard"}
      </h1>
    </header>
  )
}
