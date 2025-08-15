"use client"

import { useMemo } from "react"
import { Clock, BarChart4, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatDate, formatDuration } from "@/lib/utils/format"
import { isGetCatalogLinksResult, isGetCatalogPagesResult, isScrapeProductsResult } from "@/lib/utils/type-guards"
import type { ScraperResult } from "@/lib/types/scraper"

type StatsTabProps = {
  results: ScraperResult[]
  selectedResultIndex: number
  setSelectedResultIndex: (index: number) => void
}

export default function StatsTab({ results, selectedResultIndex, setSelectedResultIndex }: StatsTabProps) {
  const selectedResult =
    selectedResultIndex >= 0 && selectedResultIndex < results.length ? results[selectedResultIndex] : null

  // Success rate calculation
  const successRate = useMemo(() => {
    if (!selectedResult || !selectedResult.stats) return 0
    const { totalSuccess, totalUrlsAttempted } = selectedResult.stats
    return totalUrlsAttempted > 0 ? (totalSuccess / totalUrlsAttempted) * 100 : 0
  }, [selectedResult])

  return (
    <div className="space-y-6">
      {/* Function selector */}
      <Card className="bg-[#111] border-[#333]">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {results.map((result, index) => (
              <Button
                key={index}
                variant={selectedResultIndex === index ? "default" : "outline"}
                onClick={() => setSelectedResultIndex(index)}
                className={
                  selectedResultIndex === index
                    ? "bg-green-900/30 text-green-500 border-green-500/30"
                    : "bg-[#222] border-[#333] hover:bg-[#333]"
                }
              >
                <Badge
                  variant="outline"
                  className={`mr-1.5 ${result.source === "vevor" ? "bg-orange-900/20 text-orange-400 border-orange-800" : "bg-blue-900/20 text-blue-400 border-blue-800"}`}
                >
                  {result.source}
                </Badge>
                {result.functionName === "getCatalogLinks" && "Get Catalog Links"}
                {result.functionName === "getCatalogPagesLinks" && "Get Catalog Pages"}
                {result.functionName === "scrapeProductLinks" && "Scrape Products"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedResult ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stat Cards */}
            <Card className="bg-[#111] border-[#333]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[#888]">Duration</CardDescription>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-green-500" />
                  {formatDuration(selectedResult.stats.durationMs)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#666]">
                  {formatDate(selectedResult.stats.startTime)} - {formatDate(selectedResult.stats.endTime)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#111] border-[#333]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[#888]">Success Rate</CardDescription>
                <CardTitle className="text-2xl text-white">{successRate.toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress
                  value={successRate}
                  className="h-2 bg-[#222]"
                  indicatorClassName={
                    successRate > 90 ? "bg-green-500" : successRate > 70 ? "bg-orange-500" : "bg-red-500"
                  }
                />
              </CardContent>
            </Card>
            <Card className="bg-[#111] border-[#333]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[#888]">URLs Processed</CardDescription>
                <CardTitle className="text-2xl text-white">{selectedResult.stats.totalUrlsAttempted}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#666] flex justify-between">
                  <span>Provided: {selectedResult.stats.totalUrlsProvided}</span>
                  <span>Attempted: {selectedResult.stats.totalUrlsAttempted}</span>
                </div>
              </CardContent>
            </Card>
            {/* Results Card */}
            <Card className="bg-[#111] border-[#333]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[#888]">Results</CardDescription>
                <CardTitle className="text-2xl text-white">
                  {isGetCatalogLinksResult(selectedResult)
                    ? (selectedResult.subCategoryLinks || []).length
                    : isGetCatalogPagesResult(selectedResult)
                      ? (selectedResult.links || []).length
                      : isScrapeProductsResult(selectedResult)
                        ? (selectedResult.products || []).length
                        : 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#666]">
                  {isGetCatalogLinksResult(selectedResult)
                    ? "Subcategory links collected"
                    : isGetCatalogPagesResult(selectedResult)
                      ? "Product links collected"
                      : isScrapeProductsResult(selectedResult)
                        ? "Products scraped"
                        : "Items collected"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Task Results & Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#111] border-[#333]">
              <CardHeader>
                <CardTitle className="text-green-500 flex items-center">
                  <BarChart4 className="mr-2 h-5 w-5" />
                  Task Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-[#ccc]">Successful</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-500 font-mono">{selectedResult.stats.totalSuccess}</span>
                      <span className="text-[#666] ml-1 text-xs">
                        (
                        {(selectedResult.stats.totalUrlsAttempted > 0
                          ? (selectedResult.stats.totalSuccess / selectedResult.stats.totalUrlsAttempted) * 100
                          : 0
                        ).toFixed(1)}
                        %)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                      <span className="text-sm text-[#ccc]">Failed</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-red-500 font-mono">{selectedResult.stats.totalFailed}</span>
                      <span className="text-[#666] ml-1 text-xs">
                        (
                        {(selectedResult.stats.totalUrlsAttempted > 0
                          ? (selectedResult.stats.totalFailed / selectedResult.stats.totalUrlsAttempted) * 100
                          : 0
                        ).toFixed(1)}
                        %)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                      <span className="text-sm text-[#ccc]">Retries</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-orange-500 font-mono">{selectedResult.stats.totalRetriesMade}</span>
                    </div>
                  </div>
                  <div className="h-4"></div>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block text-[#ccc]">Success/Failure Ratio</span>
                      </div>
                    </div>
                    <div className="flex h-2 overflow-hidden text-xs rounded bg-[#222]">
                      <div style={{ width: `${successRate}%` }} className="bg-green-500"></div>
                      <div style={{ width: `${100 - successRate}%` }} className="bg-red-500"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#111] border-[#333]">
              <CardHeader>
                <CardTitle className="text-green-500 flex items-center">
                  <Info className="mr-2 h-5 w-5" />
                  Execution Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-y-2">
                    <div className="text-[#888]">Function:</div>
                    <div className="text-white font-mono">
                      {selectedResult.functionName === "getCatalogLinks" && "getCatalogLinks"}
                      {selectedResult.functionName === "getCatalogPagesLinks" && "getCatalogPagesLinks"}
                      {selectedResult.functionName === "scrapeProductLinks" && "Scrape Products"}
                    </div>
                    <div className="text-[#888]">Source:</div>
                    <div
                      className={`font-mono ${selectedResult.source === "vevor" ? "text-orange-500" : "text-blue-500"}`}
                    >
                      {selectedResult.source}
                    </div>
                    <div className="text-[#888]">Start Time:</div>
                    <div className="text-white font-mono">{formatDate(selectedResult.stats.startTime)}</div>
                    <div className="text-[#888]">End Time:</div>
                    <div className="text-white font-mono">{formatDate(selectedResult.stats.endTime)}</div>
                    <div className="text-[#888]">Duration:</div>
                    <div className="text-white font-mono">{formatDuration(selectedResult.stats.durationMs)}</div>
                    <div className="text-[#888]">URLs Provided:</div>
                    <div className="text-white font-mono">{selectedResult.stats.totalUrlsProvided}</div>
                    <div className="text-[#888]">URLs Attempted:</div>
                    <div className="text-white font-mono">{selectedResult.stats.totalUrlsAttempted}</div>
                    <div className="text-[#888]">Success Count:</div>
                    <div className="text-green-500 font-mono">{selectedResult.stats.totalSuccess}</div>
                    <div className="text-[#888]">Failure Count:</div>
                    <div className="text-red-500 font-mono">{selectedResult.stats.totalFailed}</div>
                    <div className="text-[#888]">Retry Count:</div>
                    <div className="text-orange-500 font-mono">{selectedResult.stats.totalRetriesMade}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center text-[#666] py-10">
          Select an execution from the history sidebar to view its statistics.
        </div>
      )}
    </div>
  )
}
