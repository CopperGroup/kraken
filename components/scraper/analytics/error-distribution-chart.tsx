"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ScraperResult } from "@/lib/types/scraper"
import type { LogEntry } from "@/lib/concurrency.core"
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  LineChart,
  Bar,
  Line,
  Legend,
} from "recharts"
import { AlertTriangle } from "lucide-react"

type ErrorDistributionChartProps = {
  results: ScraperResult[]
}

export default function ErrorDistributionChart({ results }: ErrorDistributionChartProps) {
  // Extract and categorize errors from log history
  const errorAnalysis = useMemo(() => {
    // Combine all log histories
    const allLogs: LogEntry[] = results.flatMap((result) => result.logHistory || [])

    // Filter to only error logs
    const errorLogs = allLogs.filter((log) => log.level === "ERROR" || log.level === "WARN")

    // Categorize errors
    const errorCategories: Record<string, number> = {}
    const errorsByUrl: Record<string, { count: number; messages: string[] }> = {}

    errorLogs.forEach((log) => {
      // Extract error type from message
      let category = "Other"
      const message = log.message || ""

      if (message.includes("TimeoutError") || message.includes("timeout")) {
        category = "Timeout"
      } else if (message.includes("Navigation")) {
        category = "Navigation"
      } else if (message.includes("selector")) {
        category = "Selector Not Found"
      } else if (message.includes("net::ERR")) {
        category = "Network Error"
      } else if (message.includes("aborted")) {
        category = "Operation Aborted"
      } else if (message.includes("missing") || message.includes("not found")) {
        category = "Missing Data"
      }

      // Count by category
      errorCategories[category] = (errorCategories[category] || 0) + 1

      // Group by URL
      if (log.url) {
        if (!errorsByUrl[log.url]) {
          errorsByUrl[log.url] = { count: 0, messages: [] }
        }
        errorsByUrl[log.url].count++
        if (!errorsByUrl[log.url].messages.includes(message)) {
          errorsByUrl[log.url].messages.push(message)
        }
      }
    })

    // Sort URLs by error count
    const topErrorUrls = Object.entries(errorsByUrl)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([url, data]) => ({
        url,
        count: data.count,
        messages: data.messages.slice(0, 3), // Limit to top 3 messages per URL
      }))

    // Prepare data for charts
    const categoryChartData = Object.entries(errorCategories)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category,
        count,
      }))

    // Error rate over time
    const errorRateData = results
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((result) => {
        const errorRate =
          result.stats.totalUrlsAttempted > 0 ? (result.stats.totalFailed / result.stats.totalUrlsAttempted) * 100 : 0

        return {
          date: new Date(result.timestamp).toLocaleDateString(),
          errorRate: Number.parseFloat(errorRate.toFixed(1)),
          source: result.source,
          functionName: result.functionName,
          timestamp: result.timestamp,
        }
      })

    return {
      totalErrors: errorLogs.length,
      categories: Object.entries(errorCategories).sort((a, b) => b[1] - a[1]),
      topErrorUrls,
      categoryChartData,
      errorRateData,
    }
  }, [results])

  if (results.length === 0) {
    return <div className="text-center text-[#666] py-10">No data available for error analysis.</div>
  }

  if (errorAnalysis.totalErrors === 0) {
    return (
      <div className="text-center py-10 bg-[#111] border border-[#333] rounded-lg">
        <AlertTriangle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Errors Found</h3>
        <p className="text-[#888] max-w-md mx-auto">
          Great news! No errors were detected in the scraping operations. This indicates your scraper is running
          optimally.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="bg-[#111] border-[#333]">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-500 text-xl flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            Error Distribution
          </CardTitle>
          <CardDescription className="text-[#888]">
            Analysis of {errorAnalysis.totalErrors} errors across all scraping runs
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Error category chart */}
          <div className="h-[400px] w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={errorAnalysis.categoryChartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#666" tick={{ fill: "#888" }} tickLine={{ stroke: "#444" }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#666"
                  tick={{ fill: "#888" }}
                  tickLine={{ stroke: "#444" }}
                  width={120}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#222] border border-[#444] p-3 rounded-md shadow-md">
                          <p className="text-[#ccc] mb-1">{label}</p>
                          <p className="text-red-500 font-medium">Count: {payload[0].value}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                  cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
                />
                <Bar
                  dataKey="count"
                  fill="#ef4444"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top error URLs */}
          {errorAnalysis.topErrorUrls.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-[#ccc] mb-4 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                Top URLs with Errors
              </h3>
              <div className="rounded-md border border-[#333] overflow-hidden">
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#222] sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-2 text-[#888] border-b border-[#333]">URL</th>
                        <th className="text-right p-2 text-[#888] border-b border-[#333]">Error Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorAnalysis.topErrorUrls.map((item) => (
                        <tr key={item.url} className="hover:bg-[#1a1a1a] border-b border-[#333] last:border-b-0">
                          <td className="p-2 text-[#ccc] truncate max-w-[300px]" title={item.url}>
                            {item.url}
                            <div className="text-xs text-[#666] mt-1">
                              {item.messages.map((msg, i) => (
                                <div key={i} className="truncate" title={msg}>
                                  {msg.substring(0, 60)}
                                  {msg.length > 60 ? "..." : ""}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-2 text-right text-red-500 font-mono">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error trends over time */}
      <Card className="bg-[#111] border-[#333]">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-500 text-xl">Error Rate Trends</CardTitle>
          <CardDescription className="text-[#888]">Error rates across scraping runs over time</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errorAnalysis.errorRateData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  tick={{ fill: "#888" }}
                  tickLine={{ stroke: "#444" }}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: "#888" }}
                  tickLine={{ stroke: "#444" }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#222] border border-[#444] p-3 rounded-md shadow-md">
                          <p className="text-[#ccc] mb-1">{label}</p>
                          <p className="text-red-500 font-medium">Error Rate: {payload[0].value}%</p>
                          <p className="text-[#888] text-xs mt-1">
                            {payload[0].payload.source} - {payload[0].payload.functionName}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                  cursor={{ stroke: "#666", strokeWidth: 1 }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  content={({ payload }) => (
                    <div className="flex justify-center items-center mt-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span className="text-sm text-[#ccc]">Error Rate</span>
                      </div>
                    </div>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", r: 4 }}
                  activeDot={{ r: 6, fill: "#ef4444", stroke: "#111" }}
                  name="Error Rate"
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
