"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LogManager } from "@/lib/utils/log-manager"
import type { LogEntry } from "@/lib/concurrency.core"

type LogExportButtonProps = {
  logs: LogEntry[]
  filename?: string
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export default function LogExportButton({
  logs,
  filename = "scraper_logs.csv",
  variant = "outline",
  size = "sm",
  className,
}: LogExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (logs.length === 0) return

    setIsExporting(true)
    try {
      // Generate CSV content
      const csvContent = LogManager.exportLogsToCSV(logs)

      // Create a blob and download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)

      // Create and trigger download
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting logs:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting || logs.length === 0}
      className={className}
    >
      {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
      Export CSV
    </Button>
  )
}
