"use client"

import { useMemo } from "react"
import { ImageOff, ExternalLink, Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

type ProductResultsTableProps = {
  products: ProductData[]
  currentPage: number
  itemsPerPage: number
  filterFn: ((product: ProductData | null) => boolean) | null
}

// Remove the getBrand function and its usage in the table
export default function ProductResultsTable({
  products,
  currentPage,
  itemsPerPage,
  filterFn,
}: ProductResultsTableProps) {
  // Apply filter if one is active
  const filteredProducts = useMemo(() => {
    if (!filterFn || typeof filterFn !== "function") return products
    return products.filter(filterFn)
  }, [products, filterFn])

  // Update the paginatedProducts useMemo to use the filtered products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage, itemsPerPage])

  return (
    <div className="rounded-md border border-[#333] overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#222] sticky top-0 z-10">
            <TableRow className="hover:bg-[#222] border-[#333]">
              <TableHead className="text-[#888] w-[60px]">#</TableHead>
              <TableHead className="text-[#888] w-[100px]">Image</TableHead>
              <TableHead className="text-[#888]">Name / Article</TableHead>
              <TableHead className="text-[#888]">Category</TableHead>
              <TableHead className="text-[#888] w-[120px]">Price</TableHead>
              <TableHead className="text-[#888] w-[100px]">Available</TableHead>
              <TableHead className="text-[#888] w-[50px]">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-[#666]">
                  {filterFn ? "No products match the current filter" : "No products found"}
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product, index) => {
                const itemIndex = (currentPage - 1) * itemsPerPage + index + 1
                return (
                  <TableRow
                    key={product.articleNumber || product.url || itemIndex}
                    className="hover:bg-[#1a1a1a] border-[#333]"
                  >
                    <TableCell className="font-mono text-[#666] py-3">{itemIndex}</TableCell>
                    <TableCell className="py-3">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0] || "/placeholder.svg"}
                          alt={product.name}
                          className="h-14 w-14 object-cover rounded-md border border-[#333] hover:border-green-500/50 transition-colors"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-14 w-14 bg-[#222] rounded-md border border-[#333] flex items-center justify-center text-[#666]">
                          <ImageOff className="h-6 w-6" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-medium text-[#ccc] text-sm group flex items-center gap-2">
                        <div>{product.name || "N/A"}</div>
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
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-[#666] font-mono mt-1">
                        Art: {product.articleNumber !== "none" ? product.articleNumber : "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[#ccc] py-3">{product.category || "-"}</TableCell>
                    <TableCell className="py-3">
                      <div className="font-mono text-white">{product.price || "-"}</div>
                      {product.discountPrice && (
                        <div className="font-mono text-green-500 text-xs mt-0.5">{product.discountPrice}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <Badge
                        variant={product.isAvailable ? "default" : "destructive"}
                        className={`text-xs ${product.isAvailable ? "bg-green-900/30 text-green-500 border-green-500/30" : "bg-red-900/30 text-red-500 border-red-500/30"}`}
                      >
                        {product.isAvailable ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-3">
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
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
