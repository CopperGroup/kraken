"use client"

import { useState, useMemo } from "react"
import { FileText, Search, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils/format"
import PaginationControls from "./pagination-controls"
import LogVirtualizedTable from "./log-virtualized-table"
import LogExportButton from "./log-export-button"
import { LogManager } from "@/lib/utils/log-manager"
import type { ScraperResult } from "@/lib/types/scraper"

type LogsTabProps = {
  selectedResult: ScraperResult | null
}

export default function LogsTab({ selectedResult }: LogsTabProps) {
  const [logFilter, setLogFilter] = useState<string>("ALL")
  const [logSearch, setLogSearch] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [useVirtualization, setUseVirtualization] = useState(false)

  // Filter logs based on search and filter
  const filteredLogs = useMemo(() => {
    if (!selectedResult?.logHistory) return []

    return LogManager.filterLogs(selectedResult.logHistory, {
      searchTerm: logSearch,
      logLevel: logFilter,
    })
  }, [selectedResult, logFilter, logSearch])

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
  }, [logFilter, logSearch])

  // Determine if we should show virtualization toggle
  // Only show for large datasets
  const showVirtualizationToggle = useMemo(() => {
    return filteredLogs.length > 1000
  }, [filteredLogs.length])

  if (!selectedResult) {
    return (
      <div className="text-center text-[#666] py-10">
        Select an execution from the history sidebar to view its logs.
      </div>
    )
  }

  return (
    <Card className="bg-[#111] border-[#333] flex-1 flex flex-col m-6 mt-0">
      <CardHeader className="bg-[#111] border-b border-[#333]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-green-500 flex items-center">
            <FileText className="mr-2 h-5 w-5" /> Execution Logs
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#666]" />
              <Input
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-8 bg-[#222] border-[#333] text-white focus-visible:ring-green-500/50 h-9"
              />
            </div>
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50 h-9">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent className="bg-[#222] border-[#333] text-white">
                <SelectItem value="ALL">All Levels</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="DEBUG">Debug</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
              </SelectContent>
            </Select>

            <LogExportButton
              logs={filteredLogs}
              filename={`logs_${selectedResult.source}_${selectedResult.functionName}_${formatDate(selectedResult.timestamp).replace(/[/: ]/g, "_")}.csv`}
              className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc] h-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-4 pb-6">
        <div className="space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#666]">
              <AlertCircle className="h-12 w-12 text-[#333] mb-4" />
              <p className="text-lg">No logs matching your filters</p>
              <p className="text-sm mt-2">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            <>
              {/* Virtualization toggle for large datasets */}
              {showVirtualizationToggle && (
                <div className="mb-4 flex justify-end">
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

              {/* Log display - either virtualized or paginated */}
              <div className="rounded-md border border-[#333] overflow-hidden">
                {useVirtualization ? (
                  <LogVirtualizedTable logs={filteredLogs} maxHeight={600} />
                ) : (
                  <LogVirtualizedTable logs={paginatedLogs} maxHeight={600} />
                )}
              </div>

              {/* Pagination controls - only show when not using virtualization */}
              {!useVirtualization && filteredLogs.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div className="text-xs text-[#888]">
                    Showing {paginatedLogs.length} of {filteredLogs.length.toLocaleString()} log entries
                    {filteredLogs.length !== (selectedResult.logHistory || []).length && (
                      <span> (filtered from {(selectedResult.logHistory || []).length.toLocaleString()} total)</span>
                    )}
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
        </div>
      </CardContent>
    </Card>
  )
}
