import type { LogEntry } from "@/lib/concurrency.core"
import type { ScraperResult } from "@/lib/types/scraper"

/**
 * LogManager provides utilities for efficiently handling large volumes of logs
 */
export class LogManager {
  /**
   * Filters logs based on search term, log level, and other criteria
   */
  static filterLogs(
    logs: LogEntry[],
    options: {
      searchTerm?: string
      logLevel?: string
      startTime?: Date
      endTime?: Date
    },
  ): LogEntry[] {
    const { searchTerm, logLevel, startTime, endTime } = options

    return logs.filter((log) => {
      // Filter by log level
      if (logLevel && logLevel !== "ALL" && log.level !== logLevel) {
        return false
      }

      // Filter by time range
      if (startTime && new Date(log.timestamp) < startTime) {
        return false
      }
      if (endTime && new Date(log.timestamp) > endTime) {
        return false
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const messageMatch = log.message && log.message.toLowerCase().includes(searchLower)
        const urlMatch = log.url && log.url.toLowerCase().includes(searchLower)
        return messageMatch || urlMatch
      }

      return true
    })
  }

  /**
   * Extracts all logs from multiple scraper results with run information
   */
  static extractLogsWithRunInfo(results: ScraperResult[]): (LogEntry & { runId: string; runLabel: string })[] {
    return results.flatMap((result) => {
      const logs = result.logHistory || []
      return logs.map((log) => ({
        ...log,
        runId: `${result.source}-${result.functionName}-${result.timestamp.getTime()}`,
        runLabel: `${result.source} - ${result.functionName} - ${new Date(result.timestamp).toLocaleString()}`,
      }))
    })
  }

  /**
   * Gets a paginated subset of logs
   */
  static paginateLogs<T>(logs: T[], page: number, itemsPerPage: number): T[] {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return logs.slice(startIndex, endIndex)
  }

  /**
   * Gets log statistics
   */
  static getLogStats(logs: LogEntry[]) {
    return {
      total: logs.length,
      errors: logs.filter((log) => log.level === "ERROR").length,
      warnings: logs.filter((log) => log.level === "WARN").length,
      info: logs.filter((log) => log.level === "INFO").length,
      success: logs.filter((log) => log.level === "SUCCESS").length,
      debug: logs.filter((log) => log.level === "DEBUG").length,
    }
  }

  /**
   * Exports logs to CSV format
   */
  static exportLogsToCSV(logs: LogEntry[]): string {
    const headers = ["Timestamp", "Level", "Message", "URL", "Attempt"]
    const rows = logs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.message ? `"${log.message.replace(/"/g, '""')}"` : "",
      log.url || "",
      log.attempt?.toString() || "",
    ])

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
  }

  /**
   * Handles server-side pagination (for future implementation)
   * This would be used when implementing a backend API for log retrieval
   */
  static async getServerPaginatedLogs(options: {
    page: number
    itemsPerPage: number
    searchTerm?: string
    logLevel?: string
    startTime?: Date
    endTime?: Date
    runId?: string
  }): Promise<{ logs: LogEntry[]; totalCount: number }> {
    // This is a placeholder for future server-side implementation
    // In a real implementation, this would make an API call to fetch logs from a database

    // Mock implementation for now
    return {
      logs: [],
      totalCount: 0,
    }
  }
}
