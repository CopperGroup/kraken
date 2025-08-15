"use client"
import {
  Terminal,
  Play,
  BarChart4,
  FileText,
  List,
  ChevronRight,
  Trash2,
  BarChart,
  Info,
  GitCompare,
  Files,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils/format"
import type { ScraperResult } from "@/lib/types/scraper"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type SidebarProps = {
  activeTab: string
  setActiveTab: (tab: string) => void
  results: ScraperResult[]
  selectedResultIndex: number
  setSelectedResultIndex: (index: number) => void
  deleteResult: (index: number) => void
  clearAllResults: () => void
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  results,
  selectedResultIndex,
  setSelectedResultIndex,
  deleteResult,
  clearAllResults,
}: SidebarProps) {
  const selectedResult =
    selectedResultIndex >= 0 && selectedResultIndex < results.length ? results[selectedResultIndex] : null

  return (
    <div className="w-64 border-r border-[#333] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#333] flex items-center space-x-2">
        <Terminal className="h-5 w-5 text-green-500" />
        <h1 className="font-mono text-lg font-bold">SCRAPER.DASH</h1>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-auto">
        <nav className="p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("launch")}
                  className={`w-full p-2 mb-1 text-left flex items-center space-x-2 rounded ${activeTab === "launch" ? "bg-green-900/30 text-green-500" : "hover:bg-[#222]"}`}
                >
                  <Play className="h-4 w-4" /> <span>Launch Scraper</span>
                  {activeTab === "launch" && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Configure and run scraping operations</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("stats")}
                  disabled={!selectedResult}
                  className={`w-full p-2 mb-1 text-left flex items-center space-x-2 rounded ${!selectedResult ? "opacity-50 cursor-not-allowed" : activeTab === "stats" ? "bg-green-900/30 text-green-500" : "hover:bg-[#222]"}`}
                >
                  <BarChart4 className="h-4 w-4" /> <span>Statistics</span>
                  {activeTab === "stats" && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">View performance statistics for selected run</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("logs")}
                  disabled={!selectedResult}
                  className={`w-full p-2 mb-1 text-left flex items-center space-x-2 rounded ${!selectedResult ? "opacity-50 cursor-not-allowed" : activeTab === "logs" ? "bg-green-900/30 text-green-500" : "hover:bg-[#222]"}`}
                >
                  <FileText className="h-4 w-4" /> <span>Logs</span>
                  {activeTab === "logs" && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">View detailed execution logs</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("results")}
                  disabled={!selectedResult}
                  className={`w-full p-2 mb-1 text-left flex items-center space-x-2 rounded ${!selectedResult ? "opacity-50 cursor-not-allowed" : activeTab === "results" ? "bg-green-900/30 text-green-500" : "hover:bg-[#222]"}`}
                >
                  <List className="h-4 w-4" /> <span>Results</span>
                  {activeTab === "results" && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">View scraped data and analyze quality</TooltipContent>
            </Tooltip>

            {/* New Files Tab */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("files")}
                  disabled={results.length === 0}
                  className={`w-full p-2 mb-1 text-left flex items-center space-x-2 rounded ${results.length === 0 ? "opacity-50 cursor-not-allowed" : activeTab === "files" ? "bg-green-900/30 text-green-500" : "hover:bg-[#222]"}`}
                >
                  <Files className="h-4 w-4" /> <span>Files</span>
                  {activeTab === "files" && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Manage and download generated files</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("comparison")}
                  disabled={results.length === 0}
                  className={`w-full p-2 mb-1 text-left flex items-center space-x-2 rounded ${results.length === 0 ? "opacity-50 cursor-not-allowed" : activeTab === "comparison" ? "bg-green-900/30 text-green-500" : "hover:bg-[#222]"}`}
                >
                  <GitCompare className="h-4 w-4" /> <span>Product Comparison</span>
                  {activeTab === "comparison" && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Compare products by property values</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("analytics")}
                  disabled={results.length === 0}
                  className={`w-full p-2 mb-1 text-left flex items-center space-x-2 rounded ${results.length === 0 ? "opacity-50 cursor-not-allowed" : activeTab === "analytics" ? "bg-green-900/30 text-green-500" : "hover:bg-[#222]"}`}
                >
                  <BarChart className="h-4 w-4" /> <span>Analytics</span>
                  {activeTab === "analytics" && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Advanced analytics across all runs</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>

        {/* Execution History List */}
        {results.length > 0 && (
          <>
            <Separator className="my-2 bg-[#333]" />
            <div className="px-2 py-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-[#888]">EXECUTION HISTORY</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllResults}
                        className="h-5 w-5 p-0 text-[#666] hover:text-red-500 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Clear all history</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-1 max-h-[calc(100vh-450px)] overflow-y-auto pr-1">
                {results.map((result, index) => (
                  <button
                    key={`${result.timestamp.toISOString()}-${index}`}
                    onClick={() => setSelectedResultIndex(index)}
                    className={`w-full text-left p-1.5 text-xs rounded flex items-center ${selectedResultIndex === index ? "bg-green-900/30 text-green-500" : "hover:bg-[#222] text-[#ccc]"}`}
                  >
                    <Badge
                      variant="outline"
                      className={`mr-1.5 ${result.source === "vevor" ? "bg-orange-900/20 text-orange-400 border-orange-800" : "bg-blue-900/20 text-blue-400 border-blue-800"}`}
                    >
                      {result.source}
                    </Badge>
                    <span className="flex-1 truncate">
                      {result.functionName}
                    </span>
                    <span className="text-[#666] ml-1">{formatDate(result.timestamp).split(",")[0]}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteResult(index)
                            }}
                            className="ml-1 text-[#666] hover:text-red-500"
                            aria-label={`Delete result ${index + 1}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Delete this result</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer with selected run info */}
      <div className="p-4 border-t border-[#333]">
        {selectedResult ? (
          <div className="text-xs text-[#888]">
            <div className="flex justify-between items-center">
              <span>Function:</span>
              <span className="text-green-500">
                {selectedResult.functionName === "getCatalogLinks" && "getCatalogLinks"}
                {selectedResult.functionName === "getCatalogPagesLinks" && "getCatalogPagesLinks"}
                {selectedResult.functionName === "scrapeProductLinks" && "Scrape Products"}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Source:</span>
              <span className={selectedResult.source === "vevor" ? "text-orange-500" : "text-blue-500"}>
                {selectedResult.source}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Run Time:</span>
              <span className="text-[#ccc]">{formatDate(selectedResult.timestamp)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-[#666] gap-1.5">
            <Info className="h-4 w-4" />
            <span>No execution selected</span>
          </div>
        )}
      </div>
    </div>
  )
}
