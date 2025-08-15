"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type PaginationControlsProps = {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  setCurrentPage: (page: number) => void
  setItemsPerPage: (items: number) => void
}

export default function PaginationControls({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  setCurrentPage,
  setItemsPerPage,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-xs text-[#888]">
        Showing {Math.min(itemsPerPage, totalItems - (currentPage - 1) * itemsPerPage)} of {totalItems} results
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc] h-8 w-8 p-0 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-[#ccc]">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc] h-8 w-8 p-0 disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(value) => {
            setItemsPerPage(Number.parseInt(value))
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="bg-[#222] border-[#333] focus:ring-green-500/50 h-8 w-[70px]">
            <SelectValue placeholder="10" />
          </SelectTrigger>
          <SelectContent className="bg-[#222] border-[#333] text-white">
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
