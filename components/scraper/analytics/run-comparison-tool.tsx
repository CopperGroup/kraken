"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Clock, CheckCircle, RotateCcw, Zap } from "lucide-react"
import { formatDuration } from "@/lib/utils/format"
import type { ScraperResult } from "@/lib/types/scraper"

type RunComparisonToolProps = {
  results: ScraperResult[]
}

export default function RunComparisonTool({ results }: RunComparisonToolProps) {
  const [run1, setRun1] = useState<string>("")
  const [run2, setRun2] = useState<string>("")

  // Create options for the selectors
  const runOptions = useMemo(() => {
    return results.map((result) => ({
      id: `${result.source}-${result.functionName}-${result.timestamp.getTime()}`,
      label: `${result.source} - ${result.functionName} - ${new Date(result.timestamp).toLocaleString()}`,
      result,
    }))
  }, [results])

  // Get the selected runs
  const selectedRun1 = useMemo(() => {
    return runOptions.find((option) => option.id === run1)?.result
  }, [runOptions, run1])

  const selectedRun2 = useMemo(() => {
    return runOptions.find((option) => option.id === run2)?.result
  }, [runOptions, run2])

  // Calculate comparison metrics
  const comparison = useMemo(() => {
    if (!selectedRun1 || !selectedRun2) return null

    const durationDiff = selectedRun1.stats.durationMs - selectedRun2.stats.durationMs
    const durationChange = selectedRun2.stats.durationMs ? (durationDiff / selectedRun2.stats.durationMs) * 100 : 0

    const successRateDiff =
      selectedRun1.stats.totalUrlsAttempted > 0 && selectedRun2.stats.totalUrlsAttempted > 0
        ? (selectedRun1.stats.totalSuccess / selectedRun1.stats.totalUrlsAttempted) * 100 -
          (selectedRun2.stats.totalSuccess / selectedRun2.stats.totalUrlsAttempted) * 100
        : 0

    const urlsPerSecond1 =
      selectedRun1.stats.durationMs > 0 ? (selectedRun1.stats.totalSuccess / selectedRun1.stats.durationMs) * 1000 : 0
    const urlsPerSecond2 =
      selectedRun2.stats.durationMs > 0 ? (selectedRun2.stats.totalSuccess / selectedRun2.stats.durationMs) * 1000 : 0
    const speedDiff = urlsPerSecond1 - urlsPerSecond2
    const speedChange = urlsPerSecond2 ? (speedDiff / urlsPerSecond2) * 100 : 0

    return {
      durationDiff,
      durationChange,
      successRateDiff,
      speedDiff,
      speedChange,
      urlsPerSecond1,
      urlsPerSecond2,
    }
  }, [selectedRun1, selectedRun2])

  // Helper function to format change with arrow
  const formatChange = (value: number, inverse = false) => {
    const isPositive = inverse ? value < 0 : value > 0
    const isNegative = inverse ? value > 0 : value < 0
    const absValue = Math.abs(value)

    if (isPositive) {
      return (
        <span className="text-green-500 flex items-center">
          <ArrowUpDown className="h-3 w-3 mr-1 rotate-180" />
          {absValue.toFixed(1)}%
        </span>
      )
    } else if (isNegative) {
      return (
        <span className="text-red-500 flex items-center">
          <ArrowUpDown className="h-3 w-3 mr-1" />
          {absValue.toFixed(1)}%
        </span>
      )
    } else {
      return <span className="text-[#888]">0%</span>
    }
  }

  if (results.length < 2) {
    return (
      <div className="text-center text-[#666] py-10">
        Need at least two scraping runs to compare. Run more scraping operations.
      </div>
    )
  }

  return (
    <Card className="bg-[#111] border-[#333]">
      <CardHeader>
        <CardTitle className="text-green-500">Run Comparison Tool</CardTitle>
        <CardDescription className="text-[#888]">Compare metrics between two scraping runs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Run selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#ccc]">Run 1 (Current)</label>
              <Select value={run1} onValueChange={setRun1}>
                <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                  <SelectValue placeholder="Select a run" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333] text-white max-h-[300px]">
                  {runOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#ccc]">Run 2 (Baseline)</label>
              <Select value={run2} onValueChange={setRun2}>
                <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                  <SelectValue placeholder="Select a run" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333] text-white max-h-[300px]">
                  {runOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison results */}
          {selectedRun1 && selectedRun2 ? (
            <div className="space-y-6">
              {/* Key metrics comparison */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#222] rounded-md p-3 border border-[#333]">
                  <div className="text-xs text-[#888] mb-1 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Duration
                  </div>
                  <div className="text-lg text-white font-mono">{formatDuration(selectedRun1.stats.durationMs)}</div>
                  <div className="text-xs mt-1 flex justify-between">
                    <span className="text-[#888]">vs {formatDuration(selectedRun2.stats.durationMs)}</span>
                    {comparison && formatChange(comparison.durationChange, true)}
                  </div>
                </div>

                <div className="bg-[#222] rounded-md p-3 border border-[#333]">
                  <div className="text-xs text-[#888] mb-1 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Success Rate
                  </div>
                  <div className="text-lg text-white font-mono">
                    {selectedRun1.stats.totalUrlsAttempted > 0
                      ? ((selectedRun1.stats.totalSuccess / selectedRun1.stats.totalUrlsAttempted) * 100).toFixed(1)
                      : "0"}
                    %
                  </div>
                  <div className="text-xs mt-1 flex justify-between">
                    <span className="text-[#888]">
                      vs{" "}
                      {selectedRun2.stats.totalUrlsAttempted > 0
                        ? ((selectedRun2.stats.totalSuccess / selectedRun2.stats.totalUrlsAttempted) * 100).toFixed(1)
                        : "0"}
                      %
                    </span>
                    {comparison && formatChange(comparison.successRateDiff)}
                  </div>
                </div>

                <div className="bg-[#222] rounded-md p-3 border border-[#333]">
                  <div className="text-xs text-[#888] mb-1 flex items-center">
                    <Zap className="h-3 w-3 mr-1" />
                    Speed
                  </div>
                  <div className="text-lg text-white font-mono">
                    {comparison ? comparison.urlsPerSecond1.toFixed(2) : "0"} URLs/s
                  </div>
                  <div className="text-xs mt-1 flex justify-between">
                    <span className="text-[#888]">
                      vs {comparison ? comparison.urlsPerSecond2.toFixed(2) : "0"} URLs/s
                    </span>
                    {comparison && formatChange(comparison.speedChange)}
                  </div>
                </div>

                <div className="bg-[#222] rounded-md p-3 border border-[#333]">
                  <div className="text-xs text-[#888] mb-1 flex items-center">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retries
                  </div>
                  <div className="text-lg text-white font-mono">{selectedRun1.stats.totalRetriesMade}</div>
                  <div className="text-xs mt-1 flex justify-between">
                    <span className="text-[#888]">vs {selectedRun2.stats.totalRetriesMade}</span>
                    {selectedRun2.stats.totalRetriesMade > 0 ? (
                      formatChange(
                        ((selectedRun1.stats.totalRetriesMade - selectedRun2.stats.totalRetriesMade) /
                          selectedRun2.stats.totalRetriesMade) *
                          100,
                        true,
                      )
                    ) : (
                      <span className="text-[#888]">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed comparison table */}
              <div className="rounded-md border border-[#333] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#222]">
                    <tr>
                      <th className="text-left p-2 text-[#888] border-b border-[#333]">Metric</th>
                      <th className="text-right p-2 text-[#888] border-b border-[#333]">
                        Run 1 ({selectedRun1.source})
                      </th>
                      <th className="text-right p-2 text-[#888] border-b border-[#333]">
                        Run 2 ({selectedRun2.source})
                      </th>
                      <th className="text-right p-2 text-[#888] border-b border-[#333]">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-[#1a1a1a] border-b border-[#333]">
                      <td className="p-2 text-[#ccc]">URLs Attempted</td>
                      <td className="p-2 text-right text-[#ccc]">{selectedRun1.stats.totalUrlsAttempted}</td>
                      <td className="p-2 text-right text-[#ccc]">{selectedRun2.stats.totalUrlsAttempted}</td>
                      <td className="p-2 text-right">
                        <Badge
                          className={
                            selectedRun1.stats.totalUrlsAttempted >= selectedRun2.stats.totalUrlsAttempted
                              ? "bg-green-900/30 text-green-500 border-green-500/30"
                              : "bg-red-900/30 text-red-500 border-red-500/30"
                          }
                        >
                          {selectedRun1.stats.totalUrlsAttempted - selectedRun2.stats.totalUrlsAttempted}
                        </Badge>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a1a1a] border-b border-[#333]">
                      <td className="p-2 text-[#ccc]">Successful URLs</td>
                      <td className="p-2 text-right text-[#ccc]">{selectedRun1.stats.totalSuccess}</td>
                      <td className="p-2 text-right text-[#ccc]">{selectedRun2.stats.totalSuccess}</td>
                      <td className="p-2 text-right">
                        <Badge
                          className={
                            selectedRun1.stats.totalSuccess >= selectedRun2.stats.totalSuccess
                              ? "bg-green-900/30 text-green-500 border-green-500/30"
                              : "bg-red-900/30 text-red-500 border-red-500/30"
                          }
                        >
                          {selectedRun1.stats.totalSuccess - selectedRun2.stats.totalSuccess}
                        </Badge>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a1a1a] border-b border-[#333]">
                      <td className="p-2 text-[#ccc]">Failed URLs</td>
                      <td className="p-2 text-right text-[#ccc]">{selectedRun1.stats.totalFailed}</td>
                      <td className="p-2 text-right text-[#ccc]">{selectedRun2.stats.totalFailed}</td>
                      <td className="p-2 text-right">
                        <Badge
                          className={
                            selectedRun1.stats.totalFailed <= selectedRun2.stats.totalFailed
                              ? "bg-green-900/30 text-green-500 border-green-500/30"
                              : "bg-red-900/30 text-red-500 border-red-500/30"
                          }
                        >
                          {selectedRun1.stats.totalFailed - selectedRun2.stats.totalFailed}
                        </Badge>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a1a1a]">
                      <td className="p-2 text-[#ccc]">Retry Attempts</td>
                      <td className="p-2 text-right text-[#ccc]">{selectedRun1.stats.totalRetriesMade}</td>
                      <td className="p-2 text-right text-[#ccc]">{selectedRun2.stats.totalRetriesMade}</td>
                      <td className="p-2 text-right">
                        <Badge
                          className={
                            selectedRun1.stats.totalRetriesMade <= selectedRun2.stats.totalRetriesMade
                              ? "bg-green-900/30 text-green-500 border-green-500/30"
                              : "bg-red-900/30 text-red-500 border-red-500/30"
                          }
                        >
                          {selectedRun1.stats.totalRetriesMade - selectedRun2.stats.totalRetriesMade}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-[#666] py-10">Select two runs to compare their metrics</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
