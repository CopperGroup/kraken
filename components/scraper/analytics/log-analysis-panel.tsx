"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, Database, Filter } from "lucide-react"
import PaginationControls from "../pagination-controls"
import LogVirtualizedTable from "../log-virtualized-table"
import LogExportButton from "../log-export-button"
import type { ScraperResult } from "@/lib/types/scraper"
import { LogManager } from "@/lib/utils/log-manager"

type LogAnalysisPanelProps = {
  results: ScraperResult[]
}

export default function LogAnalysisPanel({ results }: LogAnalysisPanelProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [logLevel, setLogLevel] = useState<string>("all")
  const [selectedRun, setSelectedRun] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [useVirtualization, setUseVirtualization] = useState(false)

  // Extract all logs from all results with run information
  const allLogs = useMemo(() => {
    return LogManager.extractLogsWithRunInfo(results)
  }, [results])

  // Get unique run IDs for the selector
  const runOptions = useMemo(() => {
    const uniqueRuns = new Map<string, string>()
    allLogs.forEach((log) => {
      uniqueRuns.set(log.runId, log.runLabel)
    })
    return Array.from(uniqueRuns.entries()).map(([id, label]) => ({ id, label }))
  }, [allLogs])

  // Filter logs based on search term, log level, and selected run
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const matchesSearch =
        searchTerm === "" ||
        (log.message && log.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.url && log.url.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesLevel = logLevel === "all" || log.level === logLevel
      const matchesRun = selectedRun === "all" || log.runId === selectedRun

      return matchesSearch && matchesLevel && matchesRun
    })
  }, [allLogs, searchTerm, logLevel, selectedRun])

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredLogs.length / itemsPerPage) || 1
  }, [filteredLogs, itemsPerPage])

  // Get paginated logs
  const paginatedLogs = useMemo(() => {
    if (useVirtualization) return filteredLogs // When using virtualization, we don't paginate
    return LogManager.paginateLogs(filteredLogs, currentPage, itemsPerPage)
  }, [filteredLogs, currentPage, itemsPerPage, useVirtualization])

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, logLevel, selectedRun])

  // Determine if we should show virtualization toggle
  const showVirtualizationToggle = useMemo(() => {
    return filteredLogs.length > 1000
  }, [filteredLogs.length])

  // Get log statistics
  const logStats = useMemo(() => {
    return LogManager.getLogStats(allLogs)
  }, [allLogs])

  if (results.length === 0) {
    return <div className="text-center text-[#666] py-10">No log data available for analysis.</div>
  }

  return (
    <Card className="bg-[#111] border-[#333]">
      <CardHeader>
        <CardTitle className="text-green-500">Log Analysis</CardTitle>
        <CardDescription className="text-[#888]">
          Search and filter through {allLogs.length.toLocaleString()} log entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#666]" />
              <Input
                placeholder="Search logs..."
                className="pl-8 bg-[#222] border-[#333] text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={logLevel} onValueChange={setLogLevel}>
              <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                <SelectValue placeholder="Filter by log level" />
              </SelectTrigger>
              <SelectContent className="bg-[#222] border-[#333] text-white">
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="ERROR">Errors</SelectItem>
                <SelectItem value="WARN">Warnings</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRun} onValueChange={setSelectedRun}>
              <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                <SelectValue placeholder="Filter by run" />
              </SelectTrigger>
              <SelectContent className="bg-[#222] border-[#333] text-white max-h-[300px]">
                <SelectItem value="all">All Runs</SelectItem>
                {runOptions.map((run) => (
                  <SelectItem key={run.id} value={run.id}>
                    {run.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <LogExportButton
              logs={filteredLogs}
              filename="log_analysis_export.csv"
              className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc]"
            />
          </div>

          {/* Filter status */}
          {(searchTerm || logLevel !== "all" || selectedRun !== "all") && (
            <div className="flex items-center bg-[#222] p-2 rounded-md border border-[#333] text-xs text-[#ccc]">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-green-500" />
              <span>
                Showing {filteredLogs.length.toLocaleString()} of {allLogs.length.toLocaleString()} logs
                {searchTerm && <span className="ml-1">• Search: "{searchTerm}"</span>}
                {logLevel !== "all" && <span className="ml-1">• Level: {logLevel}</span>}
                {selectedRun !== "all" && (
                  <span className="ml-1">
                    • Run: {runOptions.find((r) => r.id === selectedRun)?.label.split(" - ")[0]}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Virtualization toggle for large datasets */}
          {showVirtualizationToggle && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUseVirtualization(!useVirtualization)}
                className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc]"
              >
                {useVirtualization ? "Switch to Pagination" : "Switch to Virtualization"}
              </Button>
            </div>
          )}

          {/* Log entries */}
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-[#666] flex flex-col items-center">
              <Database className="h-10 w-10 text-[#333] mb-2" />
              <p>No logs match your filters</p>
            </div>
          ) : (
            <>
              <LogVirtualizedTable
                logs={useVirtualization ? filteredLogs : paginatedLogs}
                showRunInfo={true}
                maxHeight={500}
              />

              {/* Pagination controls - only show when not using virtualization */}
              {!useVirtualization && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mt-4">
                  <div className="text-xs text-[#888]">
                    Showing {paginatedLogs.length} of {filteredLogs.length.toLocaleString()} log entries
                  </div>

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredLogs.length}
                    setCurrentPage={setCurrentPage}
                    setItemsPerPage={setItemsPerPage}
                  />
                </div>
              )}
            </>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <div className="bg-[#222] rounded-md p-3 border border-[#333]">
              <div className="text-xs text-[#888] mb-1">Total Logs</div>
              <div className="text-xl text-white font-mono">{logStats.total.toLocaleString()}</div>
            </div>
            <div className="bg-[#222] rounded-md p-3 border border-[#333]">
              <div className="text-xs text-[#888] mb-1">Errors</div>
              <div className="text-xl text-red-500 font-mono">{logStats.errors.toLocaleString()}</div>
            </div>
            <div className="bg-[#222] rounded-md p-3 border border-[#333]">
              <div className="text-xs text-[#888] mb-1">Warnings</div>
              <div className="text-xl text-yellow-500 font-mono">{logStats.warnings.toLocaleString()}</div>
            </div>
            <div className="bg-[#222] rounded-md p-3 border border-[#333]">
              <div className="text-xs text-[#888] mb-1">Success</div>
              <div className="text-xl text-green-500 font-mono">{logStats.success.toLocaleString()}</div>
            </div>
            <div className="bg-[#222] rounded-md p-3 border border-[#333]">
              <div className="text-xs text-[#888] mb-1">Filtered</div>
              <div className="text-xl text-white font-mono">{filteredLogs.length.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
