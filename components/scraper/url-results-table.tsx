"use client"

import { useMemo } from "react"
import { ExternalLink, Copy } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type UrlResultsTableProps = {
  urls: string[]
  details?: Record<string, { price: string; discountPrice: string }>
  currentPage: number
  itemsPerPage: number
  showPrices?: boolean
}

export default function UrlResultsTable({
  urls,
  details = {},
  currentPage,
  itemsPerPage,
  showPrices = false,
}: UrlResultsTableProps) {
  const paginatedUrls = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return urls.slice(startIndex, endIndex)
  }, [urls, currentPage, itemsPerPage])

  return (
    <div className="rounded-md border border-[#333] overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#222] sticky top-0 z-10">
            <TableRow className="hover:bg-[#222] border-[#333]">
              <TableHead className="text-[#888] w-[60px]">#</TableHead>
              <TableHead className="text-[#888]">URL</TableHead>
              {showPrices && (
                <>
                  <TableHead className="text-[#888] w-[120px]">Price (zł)</TableHead>
                  <TableHead className="text-[#888] w-[120px]">Discount (zł)</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUrls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showPrices ? 4 : 2} className="text-center py-4 text-[#666]">
                  No URLs found
                </TableCell>
              </TableRow>
            ) : (
              paginatedUrls.map((url, index) => {
                const itemIndex = (currentPage - 1) * itemsPerPage + index + 1
                return (
                  <TableRow key={itemIndex} className="hover:bg-[#1a1a1a] border-[#333]">
                    <TableCell className="font-mono text-[#666] py-3">{itemIndex}</TableCell>
                    <TableCell className="font-mono text-sm text-[#ccc] py-3">
                      <div className="flex items-center group">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-green-500 hover:underline flex items-center group truncate"
                        >
                          <span className="truncate">{url}</span>
                          <ExternalLink className="h-3.5 w-3.5 ml-1.5 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                        <button
                          onClick={(e) => {
                            navigator.clipboard.writeText(url)
                            // Show a brief visual feedback
                            const target = e.currentTarget
                            target.classList.add("text-green-500")
                            setTimeout(() => target.classList.remove("text-green-500"), 500)
                          }}
                          className="ml-2 opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-opacity"
                          title="Copy URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    {showPrices && (
                      <>
                        <TableCell className="font-mono text-white py-3">
                          {details[url]?.price ? `${details[url].price}` : "-"}
                        </TableCell>
                        <TableCell className="font-mono py-3">
                          {details[url]?.discountPrice ? (
                            <span className="text-green-500">{details[url].discountPrice}</span>
                          ) : (
                            <span className="text-[#666]">-</span>
                          )}
                        </TableCell>
                      </>
                    )}
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
