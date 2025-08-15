"use client"

import { useMemo } from "react"
import { BarChart, PieChart, AlertTriangle, Filter, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

// Updated to match the provided interface
interface ProductData {
  url: string
  name: string
  images: string[]
  description: string
  parameters: Record<string, string[]>
  characteristics: Record<string, string>
  currentParams: Record<string, string>
  category: string
  articleNumber: string
  isAvailable: boolean
  price: string
  discountPrice: string
}

type DataQualityIssue = {
  id: string
  label: string
  count: number
  color: string
  filterFn: (product: ProductData | null) => boolean
}

type ProductDataQualityDashboardProps = {
  products: ProductData[]
  onFilterChange: (filterFn: ((product: ProductData | null) => boolean) | null) => void
  activeFilter: string | null
}

export default function ProductDataQualityDashboard({
  products,
  onFilterChange,
  activeFilter,
}: ProductDataQualityDashboardProps) {
  // Calculate statistics for missing data
  const { stats, dataQualityIssues } = useMemo(() => {
    if (!products || products.length === 0)
      return {
        stats: {
          missingImages: 0,
          missingPrices: 0,
          missingNames: 0,
          missingCategories: 0,
          missingArticleNumbers: 0,
          missingDescriptions: 0,
          missingParameters: 0,
          missingCharacteristics: 0,
          unavailableProducts: 0,
          totalProducts: 0,
          percentComplete: 0,
        },
        dataQualityIssues: [],
      }

    // Only check for properties that actually exist in the ProductData interface
    const totalProducts = products.length
    const missingImages = products.filter((p) => !p || !p.images || p.images.length === 0).length
    const missingPrices = products.filter((p) => !p || !p.price).length
    const missingNames = products.filter((p) => !p || !p.name).length
    const missingCategories = products.filter((p) => !p || !p.category).length
    const missingArticleNumbers = products.filter((p) => !p || !p.articleNumber || p.articleNumber === "none").length
    const missingDescriptions = products.filter((p) => !p || !p.description || p.description === "").length
    const missingParameters = products.filter(
      (p) => !p || !p.parameters || Object.keys(p.parameters || {}).length === 0,
    ).length
    const missingCharacteristics = products.filter(
      (p) => !p || !p.characteristics || Object.keys(p.characteristics || {}).length === 0,
    ).length

    const unavailableProducts = products.filter((p) => !p || !p.isAvailable).length

    // Calculate overall data completeness percentage
    // Consider 8 fields: image, price, name, category, articleNumber, description, parameters, characteristics
    const totalFields = totalProducts * 8
    const missingFields =
      missingImages +
      missingPrices +
      missingNames +
      missingCategories +
      missingArticleNumbers +
      missingDescriptions +
      missingParameters +
      missingCharacteristics
    const percentComplete = Math.round(((totalFields - missingFields) / totalFields) * 100)

    // Update the filter functions to only include actual properties
    const issues: DataQualityIssue[] = [
      {
        id: "missing-images",
        label: "Missing Images",
        count: missingImages,
        color: "text-orange-500",
        filterFn: (p) => !p || !p.images || p.images.length === 0,
      },
      {
        id: "missing-prices",
        label: "Missing Prices",
        count: missingPrices,
        color: "text-orange-500",
        filterFn: (p) => !p || !p.price,
      },
      {
        id: "missing-names",
        label: "Missing Names",
        count: missingNames,
        color: "text-orange-500",
        filterFn: (p) => !p || !p.name,
      },
      {
        id: "missing-categories",
        label: "Missing Categories",
        count: missingCategories,
        color: "text-orange-500",
        filterFn: (p) => !p || !p.category,
      },
      {
        id: "missing-article-numbers",
        label: "Missing Article #",
        count: missingArticleNumbers,
        color: "text-orange-500",
        filterFn: (p) => !p || !p.articleNumber || p.articleNumber === "none",
      },
      {
        id: "missing-descriptions",
        label: "Missing Descriptions",
        count: missingDescriptions,
        color: "text-orange-500",
        filterFn: (p) => !p || !p.description || p.description === "",
      },
      {
        id: "missing-parameters",
        label: "Missing Parameters",
        count: missingParameters,
        color: "text-orange-500",
        filterFn: (p) => !p || !p.parameters || Object.keys(p.parameters || {}).length === 0,
      },
      {
        id: "missing-characteristics",
        label: "Missing Characteristics",
        count: missingCharacteristics,
        color: "text-orange-500",
        filterFn: (p) => !p || !p.characteristics || Object.keys(p.characteristics || {}).length === 0,
      },
      {
        id: "unavailable",
        label: "Unavailable Products",
        count: unavailableProducts,
        color: "text-red-500",
        filterFn: (p) => !p || !p.isAvailable,
      },
    ]

    return {
      stats: {
        missingImages,
        missingPrices,
        missingNames,
        missingCategories,
        missingArticleNumbers,
        missingDescriptions,
        missingParameters,
        missingCharacteristics,
        unavailableProducts,
        totalProducts,
        percentComplete,
      },
      dataQualityIssues: issues,
    }
  }, [products])

  const handleFilterClick = (issue: DataQualityIssue) => {
    if (activeFilter === issue.id) {
      // If this filter is already active, remove it
      onFilterChange(null)
    } else {
      // Otherwise, apply this filter
      onFilterChange(issue.filterFn)
    }
  }

  const handleFilterChange = (filterFn: ((product: ProductData | null) => boolean) | null, filterId: string | null) => {
    onFilterChange((filterFn) => {
      if (filterFn) {
        // Find which filter this corresponds to based on the filter function
        const filterStr = filterFn.toString()
        let filterId = null

        if (filterStr.includes("isAvailable")) {
          filterId = "unavailable"
        } else if (filterStr.includes("images")) {
          filterId = "missing-images"
        } else if (filterStr.includes("price")) {
          filterId = "missing-prices"
        } else if (filterStr.includes("name")) {
          filterId = "missing-names"
        } else if (filterStr.includes("category")) {
          filterId = "missing-categories"
        } else if (filterStr.includes("articleNumber")) {
          filterId = "missing-article-numbers"
        } else if (filterStr.includes("description")) {
          filterId = "missing-descriptions"
        } else if (filterStr.includes("parameters")) {
          filterId = "missing-parameters"
        } else if (filterStr.includes("characteristics")) {
          filterId = "missing-characteristics"
        }

        return filterFn
      } else {
        return null
      }
    })
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <BarChart className="h-5 w-5 mr-2 text-green-500" />
          <h3 className="text-lg font-medium text-white">Product Data Quality Dashboard</h3>
        </div>
        {activeFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFilterChange(null)}
            className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc]"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Clear Filter
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="bg-[#111] border-[#333]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#888]">Data Completeness</CardDescription>
            <CardTitle className="text-2xl text-white flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-green-500" />
              {stats.percentComplete}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={stats.percentComplete}
              className="h-2 bg-[#222]"
              indicatorClassName={
                stats.percentComplete > 90
                  ? "bg-green-500"
                  : stats.percentComplete > 70
                    ? "bg-blue-500"
                    : stats.percentComplete > 50
                      ? "bg-orange-500"
                      : "bg-red-500"
              }
            />
            <div className="text-xs text-[#666] mt-2">{stats.totalProducts} products analyzed</div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#333] row-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#888]">Missing Data</CardDescription>
            <CardTitle className="text-lg text-white">Data Quality Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm max-h-[300px] overflow-y-auto pr-2">
              {dataQualityIssues.map((issue) => (
                <Button
                  key={issue.id}
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-between px-2 py-1 h-auto ${
                    activeFilter === issue.id
                      ? "bg-green-900/30 text-green-500 border border-green-500/30"
                      : "hover:bg-[#222] text-[#ccc]"
                  }`}
                  onClick={() => handleFilterClick(issue)}
                  disabled={issue.count === 0}
                >
                  <span className="flex items-center">
                    <Filter
                      className={`h-3 w-3 mr-1.5 ${activeFilter === issue.id ? "text-green-500" : "text-[#666]"}`}
                    />
                    <span>{issue.label}:</span>
                  </span>
                  <span className={issue.color}>{issue.count}</span>
                </Button>
              ))}
            </div>
            {activeFilter && (
              <div className="mt-3 text-xs text-green-500 border-t border-[#333] pt-2">
                Filtering: {dataQualityIssues.find((i) => i.id === activeFilter)?.label}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#333]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#888]">Product Availability</CardDescription>
            <CardTitle className="text-lg text-white flex items-center">
              <AlertTriangle
                className={`h-5 w-5 mr-2 ${stats.unavailableProducts > 0 ? "text-orange-500" : "text-green-500"}`}
              />
              {stats.unavailableProducts} Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-2 overflow-hidden text-xs rounded bg-[#222]">
              <div
                style={{ width: `${((stats.totalProducts - stats.unavailableProducts) / stats.totalProducts) * 100}%` }}
                className="bg-green-500"
              ></div>
              <div
                style={{ width: `${(stats.unavailableProducts / stats.totalProducts) * 100}%` }}
                className="bg-red-500"
              ></div>
            </div>
            <div className="flex justify-between text-xs text-[#666] mt-2">
              <span>Available: {stats.totalProducts - stats.unavailableProducts}</span>
              <span>Unavailable: {stats.unavailableProducts}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`w-full mt-2 justify-center ${
                activeFilter === "unavailable"
                  ? "bg-green-900/30 text-green-500 border border-green-500/30"
                  : "hover:bg-[#222] text-[#ccc]"
              }`}
              onClick={() => handleFilterClick(dataQualityIssues.find((i) => i.id === "unavailable")!)}
              disabled={stats.unavailableProducts === 0}
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              {activeFilter === "unavailable" ? "Clear Filter" : "Filter Unavailable"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
