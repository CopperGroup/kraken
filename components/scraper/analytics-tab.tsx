"use client"

import { useState, useMemo } from "react"
import { BarChart4, TrendingUp, AlertCircle, Clock, FileText, Filter, HelpCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDuration } from "@/lib/utils/format"
import type { ScraperResult } from "@/lib/types/scraper"
import PerformanceMetricsChart from "./analytics/performance-metrics-chart"
import ErrorDistributionChart from "./analytics/error-distribution-chart"
import DataQualityTrends from "./analytics/data-quality-trends"
import LogAnalysisPanel from "./analytics/log-analysis-panel"
import RunComparisonTool from "./analytics/run-comparison-tool"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type AnalyticsTabProps = {
  results: ScraperResult[]
}

export default function AnalyticsTab({ results }: AnalyticsTabProps) {
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState("performance")
  const [timeRange, setTimeRange] = useState("all")
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null)

  // Filter results based on selected filters
  const filteredResults = useMemo(() => {
    let filtered = [...results]

    // Filter by source
    if (selectedSource && selectedSource !== "all") {
      filtered = filtered.filter((result) => result.source === selectedSource)
    }

    // Filter by function
    if (selectedFunction && selectedFunction !== "all") {
      filtered = filtered.filter((result) => result.functionName === selectedFunction)
    }

    // Filter by time range
    if (timeRange !== "all") {
      const now = new Date()
      const cutoffDate = new Date()

      switch (timeRange) {
        case "day":
          cutoffDate.setDate(now.getDate() - 1)
          break
        case "week":
          cutoffDate.setDate(now.getDate() - 7)
          break
        case "month":
          cutoffDate.setMonth(now.getMonth() - 1)
          break
      }

      filtered = filtered.filter((result) => result.timestamp > cutoffDate)
    }

    return filtered
  }, [results, selectedSource, selectedFunction, timeRange])

  // Extract unique sources and functions for filters
  const sources = useMemo(() => {
    return [...new Set(results.map((result) => result.source))]
  }, [results])

  const functions = useMemo(() => {
    return [...new Set(results.map((result) => result.functionName))]
  }, [results])

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (filteredResults.length === 0) return null

    const totalRuns = filteredResults.length
    const totalDuration = filteredResults.reduce((sum, result) => sum + result.stats.durationMs, 0)
    const avgDuration = totalDuration / totalRuns

    const totalSuccess = filteredResults.reduce((sum, result) => sum + result.stats.totalSuccess, 0)
    const totalAttempted = filteredResults.reduce((sum, result) => sum + result.stats.totalUrlsAttempted, 0)
    const successRate = totalAttempted > 0 ? (totalSuccess / totalAttempted) * 100 : 0

    const totalErrors = filteredResults.reduce((sum, result) => sum + result.stats.totalFailed, 0)
    const totalRetries = filteredResults.reduce((sum, result) => sum + result.stats.totalRetriesMade, 0)

    const firstRun = new Date(Math.min(...filteredResults.map((r) => r.timestamp.getTime())))
    const lastRun = new Date(Math.max(...filteredResults.map((r) => r.timestamp.getTime())))

    return {
      totalRuns,
      avgDuration,
      successRate,
      totalErrors,
      totalRetries,
      firstRun,
      lastRun,
      totalSuccess,
      totalAttempted,
    }
  }, [filteredResults])

  // If no data, show a message
  if (results.length === 0) {
    return (
      <div className="text-center text-[#666] py-10">
        No data available for analysis. Run some scraping operations to collect data.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-[#111] border-[#333]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-green-500 flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Analytics Filters
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <HelpCircle className="h-4 w-4 text-[#666]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm">
                  Filter analytics data by time range, source, and function type. All charts and statistics will update
                  based on your selection.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-[#888]">Filter the data to analyze specific runs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#ccc]">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333] text-white">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="day">Last 24 Hours</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#ccc]">Source</label>
              <Select
                value={selectedSource || "all"}
                onValueChange={(val) => setSelectedSource(val === "all" ? null : val)}
              >
                <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333] text-white">
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#ccc]">Function</label>
              <Select
                value={selectedFunction || "all"}
                onValueChange={(val) => setSelectedFunction(val === "all" ? null : val)}
              >
                <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                  <SelectValue placeholder="All Functions" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333] text-white">
                  <SelectItem value="all">All Functions</SelectItem>
                  {functions.map((func) => (
                    <SelectItem key={func} value={func}>
                      {func === "getCatalogLinks" && "Get Catalog Links"}
                      {func === "getCatalogPagesLinks" && "Get Catalog Pages"}
                      {func === "scrapeProductLinks" && "Scrape Products"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary stats */}
          {overallStats && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#222] rounded-md p-3 border border-[#333]">
                <div className="text-xs text-[#888] mb-1">Total Runs</div>
                <div className="text-xl text-white font-mono">{overallStats.totalRuns}</div>
              </div>
              <div className="bg-[#222] rounded-md p-3 border border-[#333]">
                <div className="text-xs text-[#888] mb-1">Success Rate</div>
                <div className="text-xl text-white font-mono">{overallStats.successRate.toFixed(1)}%</div>
              </div>
              <div className="bg-[#222] rounded-md p-3 border border-[#333]">
                <div className="text-xs text-[#888] mb-1">Avg Duration</div>
                <div className="text-xl text-white font-mono">{formatDuration(overallStats.avgDuration)}</div>
              </div>
              <div className="bg-[#222] rounded-md p-3 border border-[#333]">
                <div className="text-xs text-[#888] mb-1">Total Errors</div>
                <div className="text-xl text-white font-mono">{overallStats.totalErrors}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs value={activeAnalyticsTab} onValueChange={setActiveAnalyticsTab}>
        <TabsList className="bg-[#222] border-[#333]">
          <TabsTrigger
            value="performance"
            className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger
            value="errors"
            className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Error Analysis
          </TabsTrigger>
          <TabsTrigger
            value="quality"
            className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
          >
            <BarChart4 className="h-4 w-4 mr-2" />
            Data Quality
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500">
            <FileText className="h-4 w-4 mr-2" />
            Log Analysis
          </TabsTrigger>
          <TabsTrigger
            value="comparison"
            className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
          >
            <Clock className="h-4 w-4 mr-2" />
            Run Comparison
          </TabsTrigger>
        </TabsList>

        {/* Performance Metrics Tab */}
        <TabsContent value="performance" className="mt-6">
          <PerformanceMetricsChart results={filteredResults} />
        </TabsContent>

        {/* Error Analysis Tab */}
        <TabsContent value="errors" className="mt-6">
          <ErrorDistributionChart results={filteredResults} />
        </TabsContent>

        {/* Data Quality Tab */}
        <TabsContent value="quality" className="mt-6">
          <DataQualityTrends results={filteredResults} />
        </TabsContent>

        {/* Log Analysis Tab */}
        <TabsContent value="logs" className="mt-6">
          <LogAnalysisPanel results={filteredResults} />
        </TabsContent>

        {/* Run Comparison Tab */}
        <TabsContent value="comparison" className="mt-6">
          <RunComparisonTool results={results} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
