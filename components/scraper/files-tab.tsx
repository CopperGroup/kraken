"use client"

import { useState, useMemo } from "react"
import {
  FileText,
  Download,
  Trash2,
  File,
  Database,
  Calendar,
  RefreshCw,
  CheckCircle,
  Package,
  Search,
  Plus,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDate } from "@/lib/utils/format"
import { isScrapeProductsResult } from "@/lib/utils/type-guards"
import type { ScraperResult } from "@/lib/types/scraper"

// Define file types
type FileType = "xml" | "xlsx"

// Define file metadata structure
interface FileMetadata {
  id: string
  runId: string
  type: FileType
  name: string
  source: string
  timestamp: Date
  productCount: number
  functionName: string
}

// Define file group structure
interface FileGroup {
  id: string
  runId: string
  source: string
  timestamp: Date
  productCount: number
  functionName: string
  files: FileMetadata[]
}

type FilesTabProps = {
  results: ScraperResult[]
  fileGroups: FileGroup[]
  setFileGroups: (groups: FileGroup[]) => void
}

export default function FilesTab({ results, fileGroups, setFileGroups }: FilesTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Filter file groups based on search and source filter
  const filteredFileGroups = useMemo(() => {
    return fileGroups
      .filter((group) => {
        const matchesSearch =
          searchTerm === "" ||
          group.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
          formatDate(group.timestamp).toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.functionName.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesSource = selectedSource === null || group.source === selectedSource

        return matchesSearch && matchesSource
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Sort by timestamp in descending order (newest first)
  }, [fileGroups, searchTerm, selectedSource])

  // Get unique sources for filter dropdown
  const sources = useMemo(() => {
    return [...new Set(fileGroups.map((group) => group.source))]
  }, [fileGroups])

  // Get product scraping results that don't have associated file groups
  const availableProductResults = useMemo(() => {
    const existingRunIds = new Set(fileGroups.map((group) => group.runId))
    return results
      .filter(
        (result) =>
          (isScrapeProductsResult(result) || result.functionName === "parseGeekXml") &&
          !existingRunIds.has(`${result.source}-${result.timestamp.getTime()}`),
      )
      .filter(
        (result) =>
          (isScrapeProductsResult(result) && result.products && result.products.length > 0) ||
          (result.functionName === "parseGeekXml" && result.productsData),
      )
  }, [results, fileGroups])

  // Generate file group from a scraping result
  const generateFileGroup = (result: ScraperResult) => {
    // Handle geek XML results
    if (result.functionName === "parseGeekXml") {
      if (!result.productsData) {
        setError("Selected result doesn't contain any product data")
        return
      }

      // Try to parse the products to get the count
      let productCount = 0
      try {
        const products = JSON.parse(result.productsData)
        productCount = Array.isArray(products) ? products.length : 0
      } catch (e) {
        console.warn("Could not parse products to get count:", e)
      }

      const runId = `${result.source}-${result.timestamp.getTime()}`
      const groupId = `group-${Date.now()}`

      const newGroup: FileGroup = {
        id: groupId,
        runId,
        source: result.source,
        timestamp: result.timestamp,
        productCount,
        functionName: result.functionName,
        files: [
          {
            id: `${groupId}-xlsx`,
            runId,
            type: "xlsx",
            name: `${result.source}_products_${formatDate(result.timestamp).replace(/[/: ]/g, "_")}.xlsx`,
            source: result.source,
            timestamp: result.timestamp,
            productCount,
            functionName: result.functionName,
          },
        ],
      }

      setFileGroups([...fileGroups, newGroup])
      setSuccess(`File group created for ${result.source} XML feed (${productCount} products)`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
      return
    }

    // Handle regular scraping results
    if (!isScrapeProductsResult(result) || !result.products || result.products.length === 0) {
      setError("Selected result doesn't contain any product data")
      return
    }

    const runId = `${result.source}-${result.timestamp.getTime()}`
    const groupId = `group-${Date.now()}`

    const newGroup: FileGroup = {
      id: groupId,
      runId,
      source: result.source,
      timestamp: result.timestamp,
      productCount: result.products.length,
      functionName: result.functionName,
      files: [
        {
          id: `${groupId}-xml`,
          runId,
          type: "xml",
          name: `${result.source}_products_${formatDate(result.timestamp).replace(/[/: ]/g, "_")}.xml`,
          source: result.source,
          timestamp: result.timestamp,
          productCount: result.products.length,
          functionName: result.functionName,
        },
        {
          id: `${groupId}-xlsx`,
          runId,
          type: "xlsx",
          name: `${result.source}_products_${formatDate(result.timestamp).replace(/[/: ]/g, "_")}.xlsx`,
          source: result.source,
          timestamp: result.timestamp,
          productCount: result.products.length,
          functionName: result.functionName,
        },
      ],
    }

    setFileGroups([...fileGroups, newGroup])
    setSuccess(`File group created for ${result.source} scraping run (${result.products.length} products)`)

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(null), 3000)
  }

  // Delete a file group
  const deleteFileGroup = (groupId: string) => {
    setFileGroups(fileGroups.filter((group) => group.id !== groupId))
  }

  // Download a file
  const downloadFile = async (file: FileMetadata) => {
    try {
      setIsGenerating(true)
      setCurrentFileId(file.id)
      setError(null)

      // Find the associated scraping result
      const result = results.find((r) => `${r.source}-${r.timestamp.getTime()}` === file.runId)
      console.log(results.map(r => `${r.source}-${r.timestamp.getTime()}`), file.runId)

      if (!result) {
        throw new Error("Could not find data for this file")
      }

      // Generate and download the file
      const endpoint = file.type === "xml" ? "/api/download/xml" : "/api/download/xlsx"
      const method = "POST"
      let body: string | null = null

      // Handle different result types
      if (result.functionName === "parseGeekXml") {
        if (!result.productsData) {
          throw new Error("No product data found for this file")
        }

        // For geek XML results, we use the productsData field
        body = result.productsData
      } else if (isScrapeProductsResult(result)) {
        if (!result.products) {
          throw new Error("No product data found for this file")
        }

        // For regular scraping results, we use the products field
        body = JSON.stringify(result.products)
      } else {
        throw new Error("Unsupported result type")
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      })

      if (!response.ok) {
        throw new Error(`Failed to generate ${file.name}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSuccess(`Successfully downloaded ${file.name}`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to download file")
    } finally {
      setIsGenerating(false)
      setCurrentFileId(null)
    }
  }

  // Download all files in a group
  const downloadAllFiles = async (group: FileGroup) => {
    try {
      setIsGenerating(true)
      setCurrentFileId(group.id)
      setError(null)

      // Find the associated scraping result
      const result = results.find((r) => `${r.source}-${r.timestamp.getTime()}` === group.runId)

      if (!result) {
        throw new Error("Could not find data for these files")
      }

      // Download files in parallel
      await Promise.all(
        group.files.map(async (file) => {
          const endpoint = file.type === "xml" ? "/api/download/xml" : "/api/download/xlsx"
          let body: string | null = null

          // Handle different result types
          if (result.functionName === "parseGeekXml") {
            if (!result.productsData) {
              throw new Error("No product data found for this file")
            }

            // For geek XML results, we use the productsData field
            body = result.productsData
          } else if (isScrapeProductsResult(result)) {
            if (!result.products) {
              throw new Error("No product data found for this file")
            }

            // For regular scraping results, we use the products field
            body = JSON.stringify(result.products)
          } else {
            throw new Error("Unsupported result type")
          }

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          })

          if (!response.ok) {
            throw new Error(`Failed to generate ${file.name}`)
          }

          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(url)
        }),
      )

      setSuccess(`Successfully downloaded all files from ${group.source} (${formatDate(group.timestamp)})`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to download files")
    } finally {
      setIsGenerating(false)
      setCurrentFileId(null)
    }
  }

  // Helper function to display function name in a user-friendly way
  const formatFunctionName = (functionName: string) => {
    switch (functionName) {
      case "getCatalogLinks":
        return "Catalog Links"
      case "getCatalogPagesLinks":
        return "Catalog Pages"
      case "scrapeProductLinks":
        return "Product Scraping"
      case "parseGeekXml":
        return "Geek XML Feed"
      default:
        return functionName
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#111] border-[#333] shadow-md">
        <CardHeader className="bg-gradient-to-r from-[#111] to-[#151515] border-b border-[#333]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-green-500 flex items-center">
                <FileText className="mr-2 h-5 w-5" /> File Management
              </CardTitle>
              <CardDescription className="text-[#888]">
                Generate and download files from your scraping results
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#666]" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 bg-[#222] border-[#333] text-white focus-visible:ring-green-500/50 h-9"
                />
              </div>
              <Select
                value={selectedSource || "all"}
                onValueChange={(value) => setSelectedSource(value === "all" ? null : value)}
              >
                <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50 h-9 w-[130px]">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333] text-white">
                  <SelectItem value="all">All sources</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="files">
            <TabsList className="bg-[#222] border-[#333] mb-4">
              <TabsTrigger
                value="files"
                className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
              >
                <FileText className="h-4 w-4 mr-2" />
                Available Files
              </TabsTrigger>
              <TabsTrigger
                value="generate"
                className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
              >
                <Database className="h-4 w-4 mr-2" />
                Generate New Files
              </TabsTrigger>
            </TabsList>

            {/* Success/Error messages */}
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 bg-green-900/20 border-green-800 text-green-300">
                <CheckCircle className="h-4 w-4 mr-2" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="files">
              {filteredFileGroups.length === 0 ? (
                <div className="text-center py-12 text-[#666] bg-[#0a0a0a] rounded-lg border border-[#222] shadow-inner">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-[#333]" />
                  <p className="text-lg">No files available</p>
                  <p className="text-sm mt-2">
                    Generate files from your scraping results using the "Generate New Files" tab
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredFileGroups.map((group) => (
                    <Card
                      key={group.id}
                      className="bg-[#0f0f0f] border-[#222] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex justify-between items-center p-4 bg-[#161616] border-b border-[#222]">
                        <div className="flex items-center flex-wrap gap-2">
                          <Badge
                            className={`${
                              group.source === "vevor"
                                ? "bg-orange-900/20 text-orange-400 border-orange-800"
                                : group.source === "geek"
                                  ? "bg-purple-900/20 text-purple-400 border-purple-800"
                                  : "bg-blue-900/20 text-blue-400 border-blue-800"
                            }`}
                          >
                            {group.source}
                          </Badge>
                          <div className="text-[#ccc] text-sm flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-[#666]" />
                            {formatDate(group.timestamp)}
                          </div>
                          {/* Display function name */}
                          <Badge className="bg-purple-900/20 text-purple-400 border-purple-800">
                            {formatFunctionName(group.functionName)}
                          </Badge>
                          <Badge className="bg-green-900/20 text-green-500 border-green-500/30">
                            {group.productCount} products
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFileGroup(group.id)}
                          className="h-8 w-8 p-0 text-[#666] hover:text-red-500 hover:bg-red-900/20 rounded-full"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4">
                        {/* Download All button */}
                        <div className="mb-4">
                          <Button
                            variant="outline"
                            onClick={() => downloadAllFiles(group)}
                            disabled={isGenerating}
                            className="w-full bg-[#161616] border-[#333] hover:bg-[#222] text-[#ccc] hover:text-green-500 transition-colors"
                          >
                            {isGenerating && currentFileId === group.id ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Package className="h-4 w-4 mr-2" />
                            )}
                            {isGenerating && currentFileId === group.id ? "Generating..." : "Download All Files"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.files.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 bg-[#161616] rounded-md border border-[#222] hover:border-[#444] transition-all duration-200 hover:shadow-sm"
                            >
                              <div className="flex items-center">
                                {file.type === "xml" ? (
                                  <div className="h-9 w-9 rounded-md bg-blue-900/10 border border-blue-900/20 flex items-center justify-center mr-3">
                                    <File className="h-4 w-4 text-blue-500" />
                                  </div>
                                ) : (
                                  <div className="h-9 w-9 rounded-md bg-green-900/10 border border-green-900/20 flex items-center justify-center mr-3">
                                    <File className="h-4 w-4 text-green-500" />
                                  </div>
                                )}
                                <div>
                                  <div className="text-[#ccc] font-medium text-sm">{file.name}</div>
                                  <div className="text-xs text-[#888] mt-0.5">
                                    {file.type.toUpperCase()} • {group.productCount} products
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadFile(file)}
                                disabled={isGenerating}
                                className="h-8 bg-[#222] hover:bg-[#333] text-[#ccc] hover:text-green-500 transition-colors"
                              >
                                {isGenerating && currentFileId === file.id ? (
                                  <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-1.5" />
                                )}
                                {isGenerating && currentFileId === file.id ? "..." : "Download"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="generate">
              {availableProductResults.length === 0 ? (
                <div className="text-center py-12 text-[#666] bg-[#0a0a0a] rounded-lg border border-[#222] shadow-inner">
                  <Database className="h-12 w-12 mx-auto mb-4 text-[#333]" />
                  <p className="text-lg">No available scraping results</p>
                  <p className="text-sm mt-2">Run a product scraping operation to generate files</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[#ccc]">Select a product scraping result to generate files:</p>
                    <Badge className="bg-[#222] text-[#ccc]">{availableProductResults.length} results available</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableProductResults.map((result) => (
                      <Card
                        key={`${result.source}-${result.timestamp.getTime()}`}
                        className="bg-[#0f0f0f] border-[#222] overflow-hidden hover:border-green-500/30 hover:shadow-md transition-all duration-200 cursor-pointer group"
                        onClick={() => generateFileGroup(result)}
                      >
                        <div className="p-4">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`${
                                  result.source === "vevor"
                                    ? "bg-orange-900/20 text-orange-400 border-orange-800"
                                    : result.source === "geek"
                                      ? "bg-purple-900/20 text-purple-400 border-purple-800"
                                      : "bg-blue-900/20 text-blue-400 border-blue-800"
                                }`}
                              >
                                {result.source}
                              </Badge>
                              {/* Display function name */}
                              <Badge className="bg-purple-900/20 text-purple-400 border-purple-800">
                                {formatFunctionName(result.functionName)}
                              </Badge>
                            </div>
                            <div className="text-[#ccc] text-sm flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1.5 text-[#666]" />
                              {formatDate(result.timestamp)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-[#ccc]">
                              <span className="text-green-500 font-medium">
                                {result.functionName === "parseGeekXml"
                                  ? result.productCount || "?"
                                  : isScrapeProductsResult(result)
                                    ? result.products?.length || 0
                                    : 0}
                              </span>{" "}
                              products available
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="bg-[#161616] hover:bg-green-900/20 text-[#ccc] hover:text-green-500 group-hover:bg-green-900/10 transition-colors"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Generate Files
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
