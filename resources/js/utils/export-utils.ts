/**
 * Export data to CSV file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file to download
 */
export function exportToCSV(data, filename) {
  if (!data || !data.length) {
    console.error("No data to export")
    return
  }

  // Get headers from the first object
  const headers = Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    // Headers row
    headers.join(","),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          // Handle values that need quotes (contain commas, quotes, or newlines)
          const value = row[header] === null || row[header] === undefined ? "" : row[header].toString()
          const needsQuotes = value.includes(",") || value.includes('"') || value.includes("\n")

          if (needsQuotes) {
            // Escape quotes by doubling them
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(","),
    ),
  ].join("\n")

  // Create a blob and download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  // Set up download link
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  // Add to document, click to download, then remove
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

