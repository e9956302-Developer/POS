/**
 * Universal CSV Export Utility with UTF-8 BOM for full Excel compatibility.
 * Optionally includes Company Name, Branch Name, Software Name and Generation Date in metadata header.
 */
export function exportToCSV(filename, rows, columns = [], meta = {}) {
  if (!rows || !rows.length) {
    alert("No records available to export.");
    return;
  }

  // Optional business metadata header lines
  const metaLines = [];
  if (meta.companyName) {
    metaLines.push(`"Company:","${String(meta.companyName).replace(/"/g, '""')}"`);
  }
  if (meta.branchName) {
    metaLines.push(`"Branch:","${String(meta.branchName).replace(/"/g, '""')}"`);
  }
  if (meta.softwareName) {
    metaLines.push(`"Software:","${String(meta.softwareName).replace(/"/g, '""')}"`);
  }
  if (meta.reportTitle) {
    metaLines.push(`"Report:","${String(meta.reportTitle).replace(/"/g, '""')}"`);
  }
  if (metaLines.length > 0) {
    metaLines.push(`"Exported Date:","${new Date().toLocaleString()}"`);
    metaLines.push(""); // empty row before table headers
  }

  // If columns are not specified, derive from first object keys
  const cols = columns.length > 0 
    ? columns 
    : Object.keys(rows[0]).map((key) => ({ key, label: key.replace(/_/g, " ").toUpperCase() }));

  const headers = cols.map((col) => `"${String(col.label || col.key).replace(/"/g, '""')}"`).join(",");

  const csvRows = rows.map((row) => {
    return cols
      .map((col) => {
        let val = row[col.key];
        if (val === null || val === undefined) val = "";
        if (typeof val === "object") val = JSON.stringify(val);
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",");
  });

  const fullContentArray = [...metaLines, headers, ...csvRows];
  const csvContent = "\uFEFF" + fullContentArray.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
