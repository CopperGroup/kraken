"use client"

import { useState, useMemo } from "react"
import { Database } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isGetCatalogLinksResult, isGetCatalogPagesResult, isScrapeProductsResult } from "@/lib/utils/type-guards"
import ProductDataQualityDashboard from "./product-data-quality-dashboard"
import ProductResultsTable from "./product-results-table"
import UrlResultsTable from "./url-results-table"
import PaginationControls from "./pagination-controls"
import type { ScraperResult } from "@/lib/types/scraper"

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

type ResultsTabProps = {
  selectedResult: ScraperResult | null
  currentPage: number
  setCurrentPage: (page: number) => void
  itemsPerPage: number
  setItemsPerPage: (items: number) => void
}

export default function ResultsTab({
  selectedResult,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
}: ResultsTabProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [productFilter, setProductFilter] = useState<((product: ProductData | null) => boolean) | null>(null)

  // Handle filter changes from the dashboard
  const handleFilterChange = (
    filterFn: ((product: ProductData | null) => boolean) | null,
    filterId: string | null = null,
  ) => {
    // Store the actual filter function, not a boolean
    setProductFilter(filterFn)
    setActiveFilter(filterId)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  // Update the totalPages useMemo to properly handle the productFilter function
  const totalPages = useMemo(() => {
    if (!selectedResult) return 1

    let totalItems = 0
    if (isGetCatalogLinksResult(selectedResult)) {
      totalItems = (selectedResult.subCategoryLinks || []).length
    } else if (isGetCatalogPagesResult(selectedResult)) {
      totalItems = (selectedResult.links || []).length
    } else if (isScrapeProductsResult(selectedResult)) {
      // If there's a filter, count only filtered items
      if (productFilter && typeof productFilter === "function") {
        totalItems = (selectedResult.products || []).filter(productFilter).length
      } else {
        totalItems = (selectedResult.products || []).length
      }
    }
    return Math.ceil(totalItems / itemsPerPage) || 1
  }, [selectedResult, itemsPerPage, productFilter])

  if (!selectedResult) {
    return (
      <div className="text-center text-[#666] py-10">
        Select an execution from the history sidebar to view its results.
      </div>
    )
  }

  return (
    <Card className="bg-[#111] border-[#333] flex-1 flex flex-col m-6 mt-0">
      <CardHeader className="bg-[#111] border-b border-[#333]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-green-500 flex items-center">
            <Database className="mr-2 h-5 w-5" />
            {isGetCatalogLinksResult(selectedResult) && "Subcategory Links"}
            {isGetCatalogPagesResult(selectedResult) && "Product Links"}
            {isScrapeProductsResult(selectedResult) && "Scraped Products"}
          </CardTitle>
        </div>
        <CardDescription className="text-[#888]">
          {isGetCatalogLinksResult(selectedResult) &&
            `${(selectedResult.subCategoryLinks || []).length} subcategory links collected from ${selectedResult.source}`}
          {isGetCatalogPagesResult(selectedResult) &&
            `${(selectedResult.links || []).length} product links collected from ${selectedResult.source}`}
          {isScrapeProductsResult(selectedResult) && productFilter && typeof productFilter === "function"
            ? `Showing filtered products from ${selectedResult.source} (${(selectedResult.products || []).filter(productFilter).length} of ${(selectedResult.products || []).length} total)`
            : isScrapeProductsResult(selectedResult)
              ? `${(selectedResult.products || []).length} products scraped from ${selectedResult.source}`
              : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-4 pb-6">
        <div className="space-y-6">
          {/* Show the data quality dashboard only for product results */}
          {isScrapeProductsResult(selectedResult) && selectedResult.products && selectedResult.products.length > 0 && (
            <ProductDataQualityDashboard
              products={selectedResult.products}
              onFilterChange={(filterFn) => {
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

                  handleFilterChange(filterFn, filterId)
                } else {
                  handleFilterChange(null, null)
                }
              }}
              activeFilter={activeFilter}
            />
          )}

          {/* Render the appropriate table based on result type */}
          <div className="rounded-md border border-[#333] overflow-hidden">
            {isScrapeProductsResult(selectedResult) && selectedResult.products ? (
              <ProductResultsTable
                products={selectedResult.products}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                filterFn={productFilter}
              />
            ) : isGetCatalogPagesResult(selectedResult) && selectedResult.links ? (
              <UrlResultsTable
                urls={selectedResult.links}
                details={selectedResult.details}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                showPrices={true}
              />
            ) : isGetCatalogLinksResult(selectedResult) && selectedResult.subCategoryLinks ? (
              <UrlResultsTable
                urls={selectedResult.subCategoryLinks}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
              />
            ) : (
              <div className="text-center text-[#666] py-10">No data available</div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={
                  isGetCatalogLinksResult(selectedResult)
                    ? (selectedResult.subCategoryLinks || []).length
                    : isGetCatalogPagesResult(selectedResult)
                      ? (selectedResult.links || []).length
                      : isScrapeProductsResult(selectedResult) && productFilter && typeof productFilter === "function"
                        ? (selectedResult.products || []).filter(productFilter).length
                        : isScrapeProductsResult(selectedResult)
                          ? (selectedResult.products || []).length
                          : 0
                }
                setCurrentPage={setCurrentPage}
                setItemsPerPage={setItemsPerPage}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
