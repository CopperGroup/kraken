"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatDuration } from "@/lib/utils/format"
import type { ScraperResult } from "@/lib/types/scraper"
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  AreaChart,
  BarChart,
  Area,
  Bar,
  Line,
} from "recharts"

type PerformanceMetricsChartProps = {
  results: ScraperResult[]
}

export default function PerformanceMetricsChart({ results }: PerformanceMetricsChartProps) {
  // Sort results by timestamp
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }, [results])

  // Calculate performance metrics
  const performanceData = useMemo(() => {
    return sortedResults.map((result) => {
      const urlsPerSecond = result.stats.totalUrlsAttempted / (result.stats.durationMs / 1000)
      const successRate = (result.stats.totalSuccess / result.stats.totalUrlsAttempted) * 100

      return {
        id: `${result.source}-${result.functionName}-${result.timestamp.getTime()}`,
        timestamp: result.timestamp,
        date: new Date(result.timestamp).toLocaleDateString(),
        duration: result.stats.durationMs,
        durationFormatted: formatDuration(result.stats.durationMs),
        urlsPerSecond: Number.parseFloat(urlsPerSecond.toFixed(2)),
        successRate: Number.parseFloat(successRate.toFixed(1)),
        source: result.source,
        functionName: result.functionName,
        totalUrls: result.stats.totalUrlsAttempted,
        normalizedDuration: Math.min(100, (result.stats.durationMs / 60000) * 100), // Normalize to percentage (max 1 minute = 100%)
      }
    })
  }, [sortedResults])

  if (results.length === 0) {
    return <div className="text-center text-[#666] py-10">No data available for performance analysis.</div>
  }

  // Custom tooltip component to handle null/undefined values
  const CustomTooltip = ({ active, payload, label, valueLabel, color }: any) => {
    if (active && payload && payload.length && payload[0].value !== undefined) {
      return (
        <div className="bg-[#222] border border-[#444] p-3 rounded-md shadow-md">
          <p className="text-[#ccc] mb-1">{label}</p>
          <p className={`text-${color || "green"}-500 font-medium`}>
            {valueLabel || "Value"}: {payload[0].value}
            {valueLabel === "Success Rate" || valueLabel === "Error Rate" ? "%" : ""}
            {valueLabel === "Speed" ? " URLs/sec" : ""}
          </p>
          <p className="text-[#888] text-xs mt-1">
            {payload[0].payload.source} - {payload[0].payload.functionName}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8">
      <Card className="bg-[#111] border-[#333]">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-500 text-xl">Performance Metrics Over Time</CardTitle>
          <CardDescription className="text-[#888]">Track how scraping performance changes across runs</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Success Rate Chart */}
          <div className="mb-10">
            <h3 className="text-sm font-medium text-[#ccc] mb-4 flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              Success Rate (%)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
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
                  <Tooltip content={(props) => <CustomTooltip {...props} valueLabel="Success Rate" color="green" />} />
                  <Line
                    type="monotone"
                    dataKey="successRate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6, fill: "#10b981", stroke: "#111" }}
                    name="Success Rate"
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* URLs Per Second Chart */}
          <div className="mb-10">
            <h3 className="text-sm font-medium text-[#ccc] mb-4 flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              Processing Speed (URLs/second)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    tick={{ fill: "#888" }}
                    tickLine={{ stroke: "#444" }}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis stroke="#666" tick={{ fill: "#888" }} tickLine={{ stroke: "#444" }} />
                  <Tooltip content={(props) => <CustomTooltip {...props} valueLabel="Speed" color="blue" />} />
                  <Area
                    type="monotone"
                    dataKey="urlsPerSecond"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="URLs/second"
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Duration Chart */}
          <div>
            <h3 className="text-sm font-medium text-[#ccc] mb-4 flex items-center">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
              Execution Duration
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
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
                    tickFormatter={(value) => formatDuration(value)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#222] border border-[#444] p-3 rounded-md shadow-md">
                            <p className="text-[#ccc] mb-1">{label}</p>
                            <p className="text-orange-500 font-medium">
                              Duration: {payload[0].payload.durationFormatted}
                            </p>
                            <p className="text-[#888] text-xs mt-1">
                              {payload[0].payload.source} - {payload[0].payload.functionName}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="duration"
                    fill="#f59e0b"
                    name="Duration"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance metrics table */}
      <Card className="bg-[#111] border-[#333]">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-500 text-xl">Performance Details</CardTitle>
          <CardDescription className="text-[#888]">Detailed metrics for each scraping run</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="rounded-md border border-[#333] overflow-hidden">
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#222] sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 text-[#888] border-b border-[#333]">Date</th>
                    <th className="text-left p-2 text-[#888] border-b border-[#333]">Source</th>
                    <th className="text-left p-2 text-[#888] border-b border-[#333]">Function</th>
                    <th className="text-right p-2 text-[#888] border-b border-[#333]">URLs</th>
                    <th className="text-right p-2 text-[#888] border-b border-[#333]">Duration</th>
                    <th className="text-right p-2 text-[#888] border-b border-[#333]">URLs/sec</th>
                    <th className="text-right p-2 text-[#888] border-b border-[#333]">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((data) => (
                    <tr key={data.id} className="hover:bg-[#1a1a1a] border-b border-[#333] last:border-b-0">
                      <td className="p-2 text-[#ccc]">{formatDate(data.timestamp)}</td>
                      <td className="p-2 text-[#ccc]">{data.source}</td>
                      <td className="p-2 text-[#ccc]">
                        {data.functionName === "getCatalogLinks" && "Get Catalog Links"}
                        {data.functionName === "getCatalogPagesLinks" && "Get Catalog Pages"}
                        {data.functionName === "scrapeProductLinks" && "Scrape Products"}
                      </td>
                      <td className="p-2 text-right text-[#ccc]">{data.totalUrls}</td>
                      <td className="p-2 text-right text-[#ccc]">{formatDuration(data.duration)}</td>
                      <td className="p-2 text-right text-[#ccc]">{data.urlsPerSecond.toFixed(2)}</td>
                      <td className="p-2 text-right text-[#ccc]">
                        <span
                          className={
                            data.successRate > 90
                              ? "text-green-500"
                              : data.successRate > 70
                                ? "text-yellow-500"
                                : "text-red-500"
                          }
                        >
                          {data.successRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
