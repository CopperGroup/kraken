// Format date helper
export function formatDate(date: Date | string): string {
  if (!date) return "N/A"
  if (typeof date === "string") {
    date = new Date(date)
  }
  if (isNaN(date.getTime())) {
    return "Invalid Date"
  }
  return date.toLocaleString()
}

// Format duration helper
export function formatDuration(ms: number): string {
  if (isNaN(ms) || ms < 0) return "N/A"
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`
}
