"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, ExternalLink, ChevronRight, ChevronDown, ImageOff } from "lucide-react"
import { isScrapeProductsResult } from "@/lib/utils/type-guards"
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

type ProductComparisonTabProps = {
  results: ScraperResult[]
}

export default function ProductComparisonTab({ results }: ProductComparisonTabProps) {
  // Add a function type filter at the top of the component
  const [selectedFunction, setSelectedFunction] = useState<string>("all")
  const [selectedProperty, setSelectedProperty] = useState<string>("")
  const [selectedValue, setSelectedValue] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Replace the function type filter with a specific scrapeProductLinks run filter
  // Update near the beginning of the component:

  const [selectedProductRun, setSelectedProductRun] = useState<string>("all")

  // Extract all products from results
  // Update the allProducts useMemo to filter by function type
  // Update the allProducts useMemo to filter by specific scrapeProductLinks run:
  const allProducts = useMemo(() => {
    return results
      .filter(isScrapeProductsResult)
      .filter(
        (result) =>
          selectedProductRun === "all" || `${result.source}-${result.timestamp.getTime()}` === selectedProductRun,
      )
      .flatMap((result) => result.products || [])
      .filter((product): product is ProductData => !!product)
  }, [results, selectedProductRun])

  // Get available product scraping runs for the dropdown
  const productRuns = useMemo(() => {
    return results.filter(isScrapeProductsResult).map((result) => ({
      id: `${result.source}-${result.timestamp.getTime()}`,
      label: `${result.source} - ${new Date(result.timestamp).toLocaleString()}`,
      count: result.products?.length || 0,
    }))
  }, [results])

  // Update the availableProperties array to include all properties from the ProductData interface
  const availableProperties = useMemo(() => {
    if (allProducts.length === 0) return []

    // Basic properties - include ALL properties from ProductData interface
    const basicProps = [
      { id: "name", label: "Product Name" },
      { id: "url", label: "Product URL" },
      { id: "category", label: "Category" },
      { id: "isAvailable", label: "Availability" },
      { id: "price", label: "Price" },
      { id: "discountPrice", label: "Discount Price" },
      { id: "articleNumber", label: "Article Number" },
      { id: "description", label: "Description" },
      // currentParams is a Record type, so we'll handle it separately
    ]

    // Get parameter keys from all products
    const parameterKeys = new Set<string>()
    allProducts.forEach((product) => {
      if (product.parameters) {
        Object.keys(product.parameters).forEach((key) => parameterKeys.add(key))
      }
    })

    // Get characteristic keys from all products
    const characteristicKeys = new Set<string>()
    allProducts.forEach((product) => {
      if (product.characteristics) {
        Object.keys(product.characteristics).forEach((key) => characteristicKeys.add(key))
      }
    })

    // Get currentParams keys from all products
    const currentParamKeys = new Set<string>()
    allProducts.forEach((product) => {
      if (product.currentParams) {
        Object.keys(product.currentParams).forEach((key) => currentParamKeys.add(key))
      }
    })

    // Combine all properties
    return [
      ...basicProps,
      ...Array.from(parameterKeys).map((key) => ({ id: `param:${key}`, label: `Parameter: ${key}` })),
      ...Array.from(characteristicKeys).map((key) => ({ id: `char:${key}`, label: `Characteristic: ${key}` })),
      ...Array.from(currentParamKeys).map((key) => ({ id: `currentParam:${key}`, label: `Current Param: ${key}` })),
    ]
  }, [allProducts])

  // Update the propertyValues useMemo to handle all property types
  const propertyValues = useMemo(() => {
    if (!selectedProperty || allProducts.length === 0) return []

    const values = new Set<string>()

    if (selectedProperty.startsWith("param:")) {
      const paramKey = selectedProperty.replace("param:", "")
      allProducts.forEach((product) => {
        if (product.parameters && product.parameters[paramKey]) {
          product.parameters[paramKey].forEach((value) => values.add(value))
        }
      })
    } else if (selectedProperty.startsWith("char:")) {
      const charKey = selectedProperty.replace("char:", "")
      allProducts.forEach((product) => {
        if (product.characteristics && product.characteristics[charKey]) {
          values.add(product.characteristics[charKey])
        }
      })
    } else if (selectedProperty.startsWith("currentParam:")) {
      const currentParamKey = selectedProperty.replace("currentParam:", "")
      allProducts.forEach((product) => {
        if (product.currentParams && product.currentParams[currentParamKey]) {
          values.add(product.currentParams[currentParamKey])
        }
      })
    } else {
      // Basic properties
      allProducts.forEach((product) => {
        const value = product[selectedProperty as keyof ProductData]
        if (value !== undefined) {
          if (typeof value === "boolean") {
            values.add(value ? "Yes" : "No")
          } else if (Array.isArray(value)) {
            // For images, we'll just count them
            if (selectedProperty === "images") {
              values.add(`${value.length} images`)
            }
            // Skip other arrays
          } else if (typeof value === "object") {
            // Skip objects
          } else {
            values.add(String(value))
          }
        }
      })
    }

    return Array.from(values).sort()
  }, [selectedProperty, allProducts])

  // Update the groupedProducts useMemo to handle all property types
  const groupedProducts = useMemo(() => {
    if (!selectedProperty || allProducts.length === 0) return {}

    const groups: Record<string, ProductData[]> = {}

    allProducts.forEach((product) => {
      let value: string | undefined

      if (selectedProperty.startsWith("param:")) {
        const paramKey = selectedProperty.replace("param:", "")
        if (product.parameters && product.parameters[paramKey]) {
          // For parameters, a product can have multiple values
          product.parameters[paramKey].forEach((paramValue) => {
            if (!groups[paramValue]) groups[paramValue] = []
            groups[paramValue].push(product)
          })
          return // Skip the rest for parameters
        }
      } else if (selectedProperty.startsWith("char:")) {
        const charKey = selectedProperty.replace("char:", "")
        if (product.characteristics && product.characteristics[charKey]) {
          value = product.characteristics[charKey]
        }
      } else if (selectedProperty.startsWith("currentParam:")) {
        const currentParamKey = selectedProperty.replace("currentParam:", "")
        if (product.currentParams && product.currentParams[currentParamKey]) {
          value = product.currentParams[currentParamKey]
        }
      } else {
        // Basic properties
        const propValue = product[selectedProperty as keyof ProductData]
        if (propValue !== undefined) {
          if (typeof propValue === "boolean") {
            value = propValue ? "Yes" : "No"
          } else if (Array.isArray(propValue)) {
            // For images, we'll just count them
            if (selectedProperty === "images") {
              value = `${propValue.length} images`
            }
            // Skip other arrays
            return
          } else if (typeof propValue === "object") {
            // Skip objects
            return
          } else {
            value = String(propValue)
          }
        }
      }

      if (value) {
        if (!groups[value]) groups[value] = []
        groups[value].push(product)
      }
    })

    return groups
  }, [selectedProperty, allProducts])

  // Filter groups by search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedProducts

    const filtered: Record<string, ProductData[]> = {}

    Object.entries(groupedProducts).forEach(([value, products]) => {
      if (value.toLowerCase().includes(searchTerm.toLowerCase())) {
        filtered[value] = products
      }
    })

    return filtered
  }, [groupedProducts, searchTerm])

  // Get filtered groups for display
  const displayGroups = useMemo(() => {
    if (selectedValue) {
      // If a specific value is selected, only show that group
      return selectedValue in filteredGroups ? { [selectedValue]: filteredGroups[selectedValue] } : {}
    }
    return filteredGroups
  }, [filteredGroups, selectedValue])

  // Toggle group expansion
  const toggleGroup = (value: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(value)) {
      newExpanded.delete(value)
    } else {
      newExpanded.add(value)
    }
    setExpandedGroups(newExpanded)
  }

  // Update the getPropertyValue function to handle all property types
  const getPropertyValue = (product: ProductData, propId: string): string => {
    if (propId.startsWith("param:")) {
      const paramKey = propId.replace("param:", "")
      if (product.parameters && product.parameters[paramKey]) {
        return product.parameters[paramKey].join(", ")
      }
    } else if (propId.startsWith("char:")) {
      const charKey = propId.replace("char:", "")
      if (product.characteristics && product.characteristics[charKey]) {
        return product.characteristics[charKey]
      }
    } else if (propId.startsWith("currentParam:")) {
      const currentParamKey = propId.replace("currentParam:", "")
      if (product.currentParams && product.currentParams[currentParamKey]) {
        return product.currentParams[currentParamKey]
      }
    } else {
      // Basic properties
      const value = product[propId as keyof ProductData]
      if (value !== undefined) {
        if (typeof value === "boolean") {
          return value ? "Yes" : "No"
        } else if (Array.isArray(value)) {
          if (propId === "images") {
            return `${value.length} images`
          }
          return value.join(", ")
        } else if (typeof value === "object") {
          return "[Complex Value]"
        } else {
          return String(value)
        }
      }
    }
    return "-"
  }

  if (allProducts.length === 0) {
    return (
      <div className="text-center text-[#666] py-10">
        No product data available for comparison. Run some product scraping operations first.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#111] border-[#333]">
        <CardHeader>
          <CardTitle className="text-green-500">Product Data Comparison</CardTitle>
          <CardDescription className="text-[#888]">
            Compare products by grouping them based on property values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Selection controls */}
            {/* Add the function type filter UI in the Card component, right after the existing filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#ccc]">Select Property</label>
                <Select
                  value={selectedProperty}
                  onValueChange={(value) => {
                    setSelectedProperty(value)
                    setSelectedValue("")
                    setExpandedGroups(new Set())
                  }}
                >
                  <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                    <SelectValue placeholder="Choose a property to compare" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#222] border-[#333] text-white max-h-[300px]">
                    {availableProperties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>
                        {prop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#ccc]">Filter by Value</label>
                <Select
                  value={selectedValue}
                  onValueChange={setSelectedValue}
                  disabled={!selectedProperty || propertyValues.length === 0}
                >
                  <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                    <SelectValue placeholder="All values" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#222] border-[#333] text-white max-h-[300px]">
                    <SelectItem value="all">All values</SelectItem>
                    {propertyValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value} ({groupedProducts[value]?.length || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Replace the "Filter by Function" dropdown in the UI section with: */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#ccc]">Filter by Scrape Run</label>
                <Select value={selectedProductRun} onValueChange={setSelectedProductRun}>
                  <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50">
                    <SelectValue placeholder="All product scrapes" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#222] border-[#333] text-white max-h-[300px]">
                    <SelectItem value="all">All Product Scrapes</SelectItem>
                    {productRuns.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.label} ({run.count} products)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#ccc]">Search Values</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#666]" />
                  <Input
                    placeholder="Search values..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 bg-[#222] border-[#333] text-white focus-visible:ring-green-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            {/* Update the results section to show the function filter info */}
            {selectedProperty ? (
              Object.keys(displayGroups).length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    {/* Update the results section text to show the selected run info: */}
                    <div className="text-sm text-[#ccc]">
                      Showing {Object.keys(displayGroups).length} unique values for{" "}
                      <span className="text-green-500 font-medium">
                        {availableProperties.find((p) => p.id === selectedProperty)?.label || selectedProperty}
                      </span>
                      {selectedProductRun !== "all" && (
                        <span className="ml-1">
                          (filtered to{" "}
                          <span className="text-blue-500">
                            {productRuns.find((r) => r.id === selectedProductRun)?.label || "specific run"}
                          </span>
                          )
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedGroups(new Set(Object.keys(displayGroups)))}
                        className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc]"
                      >
                        Expand All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedGroups(new Set())}
                        className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc]"
                      >
                        Collapse All
                      </Button>
                    </div>
                  </div>

                  {/* Value groups - now with fixed height and scrollable */}
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {Object.entries(displayGroups)
                      .sort((a, b) => b[1].length - a[1].length) // Sort by number of products
                      .map(([value, products]) => (
                        <div key={value} className="border border-[#333] rounded-md bg-[#1a1a1a] overflow-hidden">
                          {/* Group header */}
                          <div
                            className="flex justify-between items-center p-3 bg-[#222] cursor-pointer hover:bg-[#2a2a2a] sticky top-0 z-10 group"
                            onClick={() => toggleGroup(value)}
                          >
                            <div className="flex items-center overflow-hidden">
                              {expandedGroups.has(value) ? (
                                <ChevronDown className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                              )}
                              <span className="font-medium text-white truncate" title={value}>
                                {value}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigator.clipboard.writeText(value)
                                  // Show a brief visual feedback
                                  const target = e.currentTarget
                                  target.classList.add("text-green-500")
                                  setTimeout(() => target.classList.remove("text-green-500"), 500)
                                }}
                                className="ml-2 opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-opacity"
                                title="Copy value"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-copy"
                                >
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </button>
                            </div>
                            <Badge className="bg-green-900/30 text-green-500 border-green-500/30 ml-2 flex-shrink-0">
                              {products.length} products
                            </Badge>
                          </div>

                          {/* Products table */}
                          {expandedGroups.has(value) && (
                            <div className="p-3">
                              <div className="rounded-md border border-[#333] overflow-hidden">
                                <div className="max-h-[400px] overflow-auto">
                                  <Table>
                                    <TableHeader className="bg-[#222] sticky top-0 z-10">
                                      <TableRow className="hover:bg-[#222] border-[#333]">
                                        <TableHead className="text-[#888] w-[60px]">#</TableHead>
                                        <TableHead className="text-[#888] w-[80px]">Image</TableHead>
                                        <TableHead className="text-[#888]">Name</TableHead>
                                        <TableHead className="text-[#888]">Article #</TableHead>
                                        <TableHead className="text-[#888]">Price</TableHead>
                                        <TableHead className="text-[#888] w-[100px]">Available</TableHead>
                                        <TableHead className="text-[#888] w-[50px]">Link</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {products.map((product, index) => (
                                        <TableRow
                                          key={product.articleNumber || product.url || index}
                                          className="hover:bg-[#1a1a1a] border-[#333] group"
                                        >
                                          <TableCell className="font-mono text-[#666]">{index + 1}</TableCell>
                                          <TableCell>
                                            {product.images && product.images.length > 0 ? (
                                              <img
                                                src={product.images[0] || "/placeholder.svg"}
                                                alt={product.name}
                                                className="h-10 w-10 object-cover rounded border border-[#333]"
                                                loading="lazy"
                                              />
                                            ) : (
                                              <div className="h-10 w-10 bg-[#222] rounded border border-[#333] flex items-center justify-center text-[#666]">
                                                <ImageOff className="h-5 w-5" />
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell className="font-medium text-[#ccc] text-sm max-w-[200px]">
                                            <div className="flex items-center gap-2">
                                              <div className="truncate" title={product.name || "N/A"}>
                                                {product.name || "N/A"}
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  if (product.name) {
                                                    navigator.clipboard.writeText(product.name)
                                                    // Show a brief visual feedback
                                                    const target = e.currentTarget
                                                    target.classList.add("text-green-500")
                                                    setTimeout(() => target.classList.remove("text-green-500"), 500)
                                                  }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-opacity"
                                                title="Copy product name"
                                              >
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="14"
                                                  height="14"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth="2"
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  className="lucide lucide-copy"
                                                >
                                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                </svg>
                                              </button>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-xs text-[#ccc] font-mono">
                                            {product.articleNumber !== "none" ? product.articleNumber : "N/A"}
                                          </TableCell>
                                          <TableCell>
                                            <div className="font-mono text-white">{product.price || "-"}</div>
                                            {product.discountPrice && (
                                              <div className="font-mono text-green-500 text-xs mt-0.5">
                                                {product.discountPrice}
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant={product.isAvailable ? "default" : "destructive"}
                                              className={`text-xs ${
                                                product.isAvailable
                                                  ? "bg-green-900/30 text-green-500 border-green-500/30"
                                                  : "bg-red-900/30 text-red-500 border-red-500/30"
                                              }`}
                                            >
                                              {product.isAvailable ? "Yes" : "No"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <a
                                              href={product.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-green-500 hover:text-green-400 inline-block"
                                            >
                                              <ExternalLink className="h-4 w-4" />
                                            </a>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-[#666]">
                  <Filter className="h-12 w-12 text-[#333] mb-4" />
                  <p className="text-lg">No matching values found</p>
                  <p className="text-sm mt-2">Try selecting a different property or adjusting your search</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#666]">
                <Filter className="h-12 w-12 text-[#333] mb-4" />
                <p className="text-lg">Select a property to start comparing</p>
                <p className="text-sm mt-2">
                  Choose a property from the dropdown to see products grouped by their values
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property value distribution */}
      {selectedProperty && Object.keys(displayGroups).length > 0 && (
        <Card className="bg-[#111] border-[#333] mt-6">
          <CardHeader>
            <CardTitle className="text-green-500">Value Distribution</CardTitle>
            <CardDescription className="text-[#888]">
              Distribution of values for{" "}
              {availableProperties.find((p) => p.id === selectedProperty)?.label || selectedProperty}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(displayGroups)
                .sort((a, b) => b[1].length - a[1].length)
                .slice(0, 10)
                .map(([value, products]) => {
                  const percentage = (products.length / allProducts.length) * 100
                  return (
                    <div key={value} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#ccc] truncate max-w-[70%]" title={value}>
                          {value.length > 50 ? `${value.substring(0, 50)}...` : value}
                        </span>
                        <span className="text-[#ccc] ml-2 flex-shrink-0">
                          {products.length} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  )
                })}

              {Object.keys(displayGroups).length > 10 && (
                <div className="text-xs text-[#666] text-center mt-2">
                  Showing top 10 of {Object.keys(displayGroups).length} values
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
