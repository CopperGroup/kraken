"use client"

import { useRef, useEffect, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import { formatDate } from "@/lib/utils/format"
import type { LogEntry } from "@/lib/concurrency.core"

// Log level to color mapping
const logLevelColors: Record<LogEntry["level"], string> = {
  INFO: "text-white",
  WARN: "text-orange-500",
  ERROR: "text-red-500",
  DEBUG: "text-gray-400",
  SUCCESS: "text-green-500",
}

// Log level to badge background mapping
const logLevelBgColors: Record<LogEntry["level"], string> = {
  INFO: "bg-blue-900/30 border-blue-500/30",
  WARN: "bg-orange-900/30 border-orange-500/30",
  ERROR: "bg-red-900/30 border-red-500/30",
  DEBUG: "bg-gray-900/30 border-gray-500/30",
  SUCCESS: "bg-green-900/30 border-green-500/30",
}

type LogVirtualizedTableProps = {
  logs: LogEntry[]
  showRunInfo?: boolean
  maxHeight?: number
}

export default function LogVirtualizedTable({ logs, showRunInfo = false, maxHeight = 500 }: LogVirtualizedTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [parentWidth, setParentWidth] = useState(0)

  // Update parent width on resize
  useEffect(() => {
    if (!parentRef.current) return

    const updateWidth = () => {
      if (parentRef.current) {
        setParentWidth(parentRef.current.offsetWidth)
      }
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(parentRef.current)

    return () => {
      if (parentRef.current) {
        observer.unobserve(parentRef.current)
      }
    }
  }, [])

  // Set up virtualizer
  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70, // Further increased for better spacing
    overscan: 15, // Increased overscan for smoother scrolling
  })

  if (logs.length === 0) {
    return <div className="text-center py-8 text-[#666]">No logs to display</div>
  }

  return (
    <div
      ref={parentRef}
      className="overflow-auto border border-[#333] rounded-md bg-[#111]"
      style={{ maxHeight: `${maxHeight}px` }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#222] border-b border-[#333] flex text-[#888] text-sm font-medium">
        <div className="w-[180px] p-2 border-r border-[#333]">Timestamp</div>
        <div className="w-[100px] p-2 border-r border-[#333]">Level</div>
        <div className="flex-1 p-2 border-r border-[#333]">Message</div>
        <div className="w-[80px] p-2 text-center border-r border-[#333]">Attempt</div>
        {showRunInfo && <div className="w-[150px] p-2">Run</div>}
      </div>

      {/* Virtualized rows container */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const log = logs[virtualRow.index]
          return (
            <div
              key={virtualRow.index}
              data-index={virtualRow.index}
              className="absolute w-full border-b border-[#333] hover:bg-[#1a1a1a]"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex h-full">
                <div className="w-[180px] p-3 border-r border-[#333] font-mono text-xs text-[#ccc] truncate flex items-center">
                  {formatDate(log.timestamp)}
                </div>
                <div className="w-[100px] p-3 border-r border-[#333] flex items-center justify-center">
                  <Badge
                    variant="outline"
                    className={`${logLevelBgColors[log.level]} ${logLevelColors[log.level]} px-2 py-0.5`}
                  >
                    {log.level}
                  </Badge>
                </div>
                <div
                  className={`flex-1 p-3 border-r border-[#333] ${logLevelColors[log.level]} text-sm overflow-hidden`}
                >
                  <div className="line-clamp-2 leading-relaxed">{log.message}</div>
                  {log.url && (
                    <div className="text-xs text-[#888] mt-2 flex items-center truncate">
                      <ExternalLink className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <a
                        href={log.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate hover:text-blue-400 transition-colors"
                      >
                        {log.url}
                      </a>
                    </div>
                  )}
                </div>
                <div className="w-[80px] p-2 text-center border-r border-[#333] flex items-center justify-center">
                  {log.attempt ? (
                    <Badge variant="outline" className="bg-[#222] text-[#ccc]">
                      {log.attempt}
                    </Badge>
                  ) : null}
                </div>
                {showRunInfo && (
                  <div className="w-[150px] p-2 text-xs text-[#ccc] truncate flex items-center">
                    {(log as any).runLabel?.split(" - ")[0] || "-"}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
