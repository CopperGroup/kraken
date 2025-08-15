"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatDate } from "@/lib/utils/format"
import { isScrapeProductsResult } from "@/lib/utils/type-guards"
import type { ScraperResult } from "@/lib/types/scraper"
import { HelpCircle, BarChart2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Line,
  Area,
} from "recharts"

type DataQualityTrendsProps = {
  results: ScraperResult[]
}

export default function DataQualityTrends({ results }: DataQualityTrendsProps) {
  // Filter to only product scraping results
  const productResults = useMemo(() => {
    return results
      .filter(isScrapeProductsResult)
      .filter((result) => result.products && result.products.length > 0)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }, [results])

  // Update the qualityMetrics calculation to include all product properties
  const qualityMetrics = useMemo(() => {
    return productResults.map((result) => {
      const products = result.products || []
      const totalProducts = products.length

      if (totalProducts === 0) {
        return {
          id: `${result.source}-${result.functionName}-${result.timestamp.getTime()}`,
          timestamp: result.timestamp,
          date: new Date(result.timestamp).toLocaleDateString(),
          source: result.source,
          missingImages: 0,
          missingPrices: 0,
          missingNames: 0,
          missingDescriptions: 0,
          missingParameters: 0,
          missingCharacteristics: 0,
          missingArticleNumbers: 0,
          missingCategories: 0,
          unavailableProducts: 0,
          completenessScore: 0,
          totalProducts: 0,
        }
      }

      // Use the same approach as in results-tab.tsx for checking product data
      const missingImages = products.filter((p) => !p || !p.images || p.images.length === 0).length
      const missingPrices = products.filter((p) => !p || !p.price).length
      const missingNames = products.filter((p) => !p || !p.name).length
      const missingDescriptions = products.filter((p) => !p || !p.description || p.description === "").length
      const missingParameters = products.filter(
        (p) => !p || !p.parameters || Object.keys(p.parameters || {}).length === 0,
      ).length
      const missingCharacteristics = products.filter(
        (p) => !p || !p.characteristics || Object.keys(p.characteristics || {}).length === 0,
      ).length
      const missingArticleNumbers = products.filter((p) => !p || !p.articleNumber).length
      const missingCategories = products.filter((p) => !p || !p.category).length
      const unavailableProducts = products.filter((p) => !p || p.isAvailable === false).length

      // Calculate overall data completeness percentage - include all fields
      const totalFields = totalProducts * 8 // images, price, name, description, parameters, characteristics, articleNumber, category
      const missingFields =
        missingImages +
        missingPrices +
        missingNames +
        missingDescriptions +
        missingParameters +
        missingCharacteristics +
        missingArticleNumbers +
        missingCategories
      const completenessScore = Math.round(((totalFields - missingFields) / totalFields) * 100)

      return {
        id: `${result.source}-${result.functionName}-${result.timestamp.getTime()}`,
        timestamp: result.timestamp,
        date: new Date(result.timestamp).toLocaleDateString(),
        source: result.source,
        missingImages: (missingImages / totalProducts) * 100,
        missingPrices: (missingPrices / totalProducts) * 100,
        missingNames: (missingNames / totalProducts) * 100,
        missingDescriptions: (missingDescriptions / totalProducts) * 100,
        missingParameters: (missingParameters / totalProducts) * 100,
        missingCharacteristics: (missingCharacteristics / totalProducts) * 100,
        missingArticleNumbers: (missingArticleNumbers / totalProducts) * 100,
        missingCategories: (missingCategories / totalProducts) * 100,
        unavailableProducts: (unavailableProducts / totalProducts) * 100,
        completenessScore,
        totalProducts,
      }
    })
  }, [productResults])

  // Prepare chart data
  const chartData = useMemo(() => {
    return qualityMetrics.map((metric) => ({
      date: metric.date,
      completenessScore: metric.completenessScore,
      missingImages: Number.parseFloat(metric.missingImages.toFixed(1)),
      missingPrices: Number.parseFloat(metric.missingPrices.toFixed(1)),
      missingNames: Number.parseFloat(metric.missingNames.toFixed(1)),
      missingDescriptions: Number.parseFloat(metric.missingDescriptions.toFixed(1)),
      source: metric.source,
      timestamp: metric.timestamp,
      totalProducts: metric.totalProducts,
    }))
  }, [qualityMetrics])

  if (qualityMetrics.length === 0) {
    return <div className="text-center text-[#666] py-10">No product data available for quality analysis.</div>
  }

  return (
    <div className="space-y-8">
      {/* Data completeness trend */}
      <Card className="bg-[#111] border-[#333]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-green-500 text-xl flex items-center">
              <BarChart2 className="h-5 w-5 mr-2 text-green-500" />
              Data Completeness Trend
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <HelpCircle className="h-4 w-4 text-[#666]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm">
                  This chart shows how data completeness has changed over time. Higher percentages indicate more
                  complete product data with fewer missing fields.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-[#888]">Track how data quality changes over time</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Completeness score chart */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
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
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#222] border border-[#444] p-3 rounded-md shadow-md">
                          <p className="text-[#ccc] mb-1">{label}</p>
                          <p className="text-green-500 font-medium">Completeness: {payload[0].value}%</p>
                          <p className="text-[#888] text-xs mt-1">
                            {payload[0].payload.source} - {payload[0].payload.totalProducts} products
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
                  content={() => (
                    <div className="flex justify-center items-center mt-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span className="text-sm text-[#ccc]">Data Completeness</span>
                      </div>
                    </div>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="completenessScore"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6, fill: "#10b981", stroke: "#111" }}
                  name="Data Completeness"
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Missing data chart */}
          <div className="h-[300px] w-full mt-8">
            <h3 className="text-sm font-medium text-[#ccc] mb-4">Missing Data by Type (%)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
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
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#222] border border-[#444] p-3 rounded-md shadow-md">
                          <p className="text-[#ccc] mb-1">{label}</p>
                          {payload.map((entry, index) => (
                            <p key={`item-${index}`} style={{ color: entry.color }} className="text-xs">
                              {entry.name}: {entry.value}%
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                  cursor={{ stroke: "#666", strokeWidth: 1 }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="missingImages"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  name="Missing Images"
                  isAnimationActive={true}
                  animationDuration={1000}
                />
                <Area
                  type="monotone"
                  dataKey="missingPrices"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  name="Missing Prices"
                  isAnimationActive={true}
                  animationDuration={1000}
                />
                <Area
                  type="monotone"
                  dataKey="missingNames"
                  stackId="1"
                  stroke="#ec4899"
                  fill="#ec4899"
                  name="Missing Names"
                  isAnimationActive={true}
                  animationDuration={1000}
                />
                <Area
                  type="monotone"
                  dataKey="missingDescriptions"
                  stackId="1"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  name="Missing Descriptions"
                  isAnimationActive={true}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Missing data breakdown */}
      <Card className="bg-[#111] border-[#333]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-green-500 text-xl">Missing Data Breakdown</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <HelpCircle className="h-4 w-4 text-[#666]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm">
                  This section shows the percentage of products with missing data for each field. Lower percentages are
                  better. The table below shows trends over time.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-[#888]">Percentage of products with missing data by field</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-6">
            {/* Latest run stats */}
            {qualityMetrics.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-[#ccc]">
                  Latest Run: {formatDate(qualityMetrics[qualityMetrics.length - 1].timestamp)}
                </h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Missing Images</span>
                      <span>{qualityMetrics[qualityMetrics.length - 1].missingImages.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={qualityMetrics[qualityMetrics.length - 1].missingImages}
                      className="h-2 bg-[#222]"
                      indicatorClassName="bg-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Missing Prices</span>
                      <span>{qualityMetrics[qualityMetrics.length - 1].missingPrices.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={qualityMetrics[qualityMetrics.length - 1].missingPrices}
                      className="h-2 bg-[#222]"
                      indicatorClassName="bg-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Missing Names</span>
                      <span>{qualityMetrics[qualityMetrics.length - 1].missingNames.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={qualityMetrics[qualityMetrics.length - 1].missingNames}
                      className="h-2 bg-[#222]"
                      indicatorClassName="bg-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Missing Descriptions</span>
                      <span>{qualityMetrics[qualityMetrics.length - 1].missingDescriptions.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={qualityMetrics[qualityMetrics.length - 1].missingDescriptions}
                      className="h-2 bg-[#222]"
                      indicatorClassName="bg-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Missing Parameters</span>
                      <span>{qualityMetrics[qualityMetrics.length - 1].missingParameters.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={qualityMetrics[qualityMetrics.length - 1].missingParameters}
                      className="h-2 bg-[#222]"
                      indicatorClassName="bg-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Missing Characteristics</span>
                      <span>{qualityMetrics[qualityMetrics.length - 1].missingCharacteristics.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={qualityMetrics[qualityMetrics.length - 1].missingCharacteristics}
                      className="h-2 bg-[#222]"
                      indicatorClassName="bg-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Missing Article Numbers</span>
                      <span>{qualityMetrics[qualityMetrics.length - 1].missingArticleNumbers.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={qualityMetrics[qualityMetrics.length - 1].missingArticleNumbers}
                      className="h-2 bg-[#222]"
                      indicatorClassName="bg-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Missing Categories</span>
                      <span>{qualityMetrics[qualityMetrics.length - 1].missingCategories.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={qualityMetrics[qualityMetrics.length - 1].missingCategories}
                      className="h-2 bg-[#222]"
                      indicatorClassName="bg-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Unavailable Products</span>
                      <span>{qualityMetrics[qualityMetrics.length - 1].unavailableProducts.toFixed(1)}%</span>
                    </div>
                    <Progress
                      value={qualityMetrics[qualityMetrics.length - 1].unavailableProducts}
                      className="h-2 bg-[#222]"
                      indicatorClassName="bg-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Trend table */}
            <div className="rounded-md border border-[#333] overflow-hidden mt-6">
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#222] sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-2 text-[#888] border-b border-[#333]">Date</th>
                      <th className="text-left p-2 text-[#888] border-b border-[#333]">Source</th>
                      <th className="text-right p-2 text-[#888] border-b border-[#333]">Products</th>
                      <th className="text-right p-2 text-[#888] border-b border-[#333]">Completeness</th>
                      <th className="text-right p-2 text-[#888] border-b border-[#333]">Missing Images</th>
                      <th className="text-right p-2 text-[#888] border-b border-[#333]">Missing Prices</th>
                      <th className="text-right p-2 text-[#888] border-b border-[#333]">Missing Parameters</th>
                      <th className="text-right p-2 text-[#888] border-b border-[#333]">Missing Article #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualityMetrics.map((metric) => (
                      <tr key={metric.id} className="hover:bg-[#1a1a1a] border-b border-[#333] last:border-b-0">
                        <td className="p-2 text-[#ccc]">{formatDate(metric.timestamp)}</td>
                        <td className="p-2 text-[#ccc]">{metric.source}</td>
                        <td className="p-2 text-right text-[#ccc]">{metric.totalProducts}</td>
                        <td className="p-2 text-right text-[#ccc]">
                          <span
                            className={
                              metric.completenessScore > 90
                                ? "text-green-500"
                                : metric.completenessScore > 70
                                  ? "text-yellow-500"
                                  : "text-red-500"
                            }
                          >
                            {metric.completenessScore}%
                          </span>
                        </td>
                        <td className="p-2 text-right text-[#ccc]">{metric.missingImages.toFixed(1)}%</td>
                        <td className="p-2 text-right text-[#ccc]">{metric.missingPrices.toFixed(1)}%</td>
                        <td className="p-2 text-right text-[#ccc]">{metric.missingParameters.toFixed(1)}%</td>
                        <td className="p-2 text-right text-[#ccc]">{metric.missingArticleNumbers.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
