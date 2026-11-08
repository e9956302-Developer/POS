import { useEffect, useRef, useState, useMemo } from "react";

/**
 * AdaptiveTable
 *
 * Implements strict responsive table layout rules:
 * 1. Proportional, flexible column widths (no fixed overflow).
 * 2. Word wrapping or ellipsis truncation with full hover tooltips.
 * 3. Priority-based column collapsing into an expandable row details tray (› / +).
 * 4. Action column is always visible, usable, and prioritized.
 * 5. Page and table never scroll horizontally.
 */
export function AdaptiveTable({
  columns = [],
  data = [],
  keyField = "id",
  actions = null,
  actionsHeader = "Actions",
  actionsWidth = "1%",
  onRowClick = null,
  selectedId = null,
  emptyMessage = "No records found matching your filters.",
  className = "data-table",
  containerClassName = "adaptive-table-wrap"
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [expandedRows, setExpandedRows] = useState({});

  // Measure container width responsively with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) {
        setContainerWidth(w);
      }
    };

    updateWidth();

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width;
          if (w > 0) {
            setContainerWidth(w);
          }
        }
      });
      observer.observe(el);
    } else {
      window.addEventListener("resize", updateWidth);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener("resize", updateWidth);
      }
    };
  }, []);

  // Determine allowed priority based on measured container width
  // Priority 1: Always visible (Primary key/name, Action)
  // Priority 2: Key metrics / status (Hides only on very small screens < 520px)
  // Priority 3: Secondary columns (Hides below 740px)
  // Priority 4: Tertiary / details (Hides below 960px)
  const maxVisiblePriority = useMemo(() => {
    if (containerWidth >= 960) return 4;
    if (containerWidth >= 740) return 3;
    if (containerWidth >= 520) return 2;
    return 1;
  }, [containerWidth]);

  // Split columns into visible vs collapsed
  const { visibleColumns, collapsedColumns } = useMemo(() => {
    const vis = [];
    const col = [];
    columns.forEach((colDef) => {
      const priority = colDef.priority || 2;
      if (priority === 1 || priority <= maxVisiblePriority) {
        vis.push(colDef);
      } else {
        col.push(colDef);
      }
    });
    return { visibleColumns: vis, collapsedColumns: col };
  }, [columns, maxVisiblePriority]);

  const hasCollapsed = collapsedColumns.length > 0;

  const toggleRow = (rowId, e) => {
    if (e) e.stopPropagation();
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const getRowKey = (row, index) => {
    return row[keyField] !== undefined && row[keyField] !== null
      ? String(row[keyField])
      : `row-${index}`;
  };

  // Helper to extract clean text for tooltip
  const getCellTooltip = (value, colDef, row) => {
    if (colDef.tooltip) {
      return typeof colDef.tooltip === "function" ? colDef.tooltip(row) : colDef.tooltip;
    }
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    return undefined;
  };

  const renderCellValue = (colDef, row, index) => {
    const val = row[colDef.key];
    if (colDef.render) {
      return colDef.render(val, row, index);
    }
    if (val === null || val === undefined || val === "") {
      return "—";
    }
    return String(val);
  };

  const totalCols = visibleColumns.length + (hasCollapsed ? 1 : 0) + (actions ? 1 : 0);

  return (
    <div
      ref={containerRef}
      className={`adaptive-table-container ${containerClassName}`}
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        overflowX: "auto"
      }}
    >
      <div className="adaptive-table-wrapper" style={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
        <table className={`adaptive-table ${className}`} style={{ width: "100%", maxWidth: "100%", tableLayout: "auto" }}>
          <thead>
            <tr>
              {/* Expand/Collapse Column indicator header if any columns collapsed */}
              {hasCollapsed && (
                <th
                  style={{
                    width: "36px",
                    textAlign: "center",
                    padding: "0.5rem 0.25rem",
                    userSelect: "none"
                  }}
                  title="Click › on any row to view hidden details"
                >
                  <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>ℹ️</span>
                </th>
              )}

              {/* Visible Column Headers */}
              {visibleColumns.map((col) => (
                <th
                  key={col.key || col.label}
                  className={col.headerClassName || ""}
                  style={{
                    textAlign: col.align || "left",
                    width: col.width || "auto",
                    minWidth: col.minWidth || (col.width && !String(col.width).includes("%") ? col.width : "80px"),
                    whiteSpace: "nowrap",
                    wordBreak: "normal"
                  }}
                >
                  {col.label}
                </th>
              ))}

              {/* Action Column Header (Always Visible) */}
              {actions && (
                <th
                  className="adaptive-actions-header"
                  style={{
                    textAlign: "right",
                    width: actionsWidth,
                    minWidth: actionsWidth && actionsWidth !== "1%" ? actionsWidth : "90px",
                    whiteSpace: "nowrap",
                    wordBreak: "normal"
                  }}
                >
                  {actionsHeader}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="adaptive-empty-cell" style={{ textAlign: "center", padding: "2rem" }}>
                  <div className="empty-state-content">
                    <span className="empty-icon" style={{ fontSize: "1.75rem", display: "block", marginBottom: "0.5rem" }}>
                      🔍
                    </span>
                    <p className="muted">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const rowKey = getRowKey(row, index);
                const isExpanded = Boolean(expandedRows[rowKey]);
                const isSelected = selectedId !== null && selectedId !== undefined && String(selectedId) === rowKey;

                return (
                  <tr
                    key={rowKey}
                    className={`adaptive-row ${isSelected ? "selected-row" : ""} ${isExpanded ? "row-expanded" : ""}`}
                    onClick={(e) => onRowClick && onRowClick(row, e)}
                    style={onRowClick ? { cursor: "pointer" } : {}}
                  >
                    {/* Expand/Collapse Trigger */}
                    {hasCollapsed && (
                      <td
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          padding: "0.4rem 0.25rem",
                          width: "36px"
                        }}
                        onClick={(e) => toggleRow(rowKey, e)}
                      >
                        <button
                          type="button"
                          className="adaptive-expand-btn"
                          onClick={(e) => toggleRow(rowKey, e)}
                          title={isExpanded ? "Collapse extra details" : "Expand extra details"}
                          aria-label={isExpanded ? "Collapse extra details" : "Expand extra details"}
                          style={{
                            background: isExpanded ? "var(--primary, #3b82f6)" : "rgba(0, 0, 0, 0.05)",
                            color: isExpanded ? "#ffffff" : "var(--text, #1e293b)",
                            border: "1px solid var(--border, rgba(0,0,0,0.1))",
                            borderRadius: "4px",
                            width: "24px",
                            height: "24px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            lineHeight: 1,
                            padding: 0,
                            transition: "all 0.15s ease"
                          }}
                        >
                          {isExpanded ? "▼" : "▶"}
                        </button>
                      </td>
                    )}

                    {/* Visible Column Cells */}
                    {visibleColumns.map((col) => {
                      const val = row[col.key];
                      const tooltip = getCellTooltip(val, col, row);
                      const isTruncated = col.truncate;

                      return (
                        <td
                          key={col.key || col.label}
                          className={col.className || ""}
                          title={tooltip}
                          style={{
                            textAlign: col.align || "left",
                            whiteSpace: isTruncated ? "nowrap" : "normal",
                            overflow: isTruncated ? "hidden" : "visible",
                            textOverflow: isTruncated ? "ellipsis" : "clip",
                            maxWidth: col.maxWidth || (isTruncated ? "180px" : "none"),
                            minWidth: col.minWidth || "auto",
                            wordBreak: isTruncated ? "normal" : "break-word",
                            verticalAlign: "middle"
                          }}
                        >
                          {renderCellValue(col, row, index)}
                        </td>
                      );
                    })}

                    {/* Action Column Cell (Always Visible & Usable) */}
                    {actions && (
                      <td
                        className="adaptive-actions-cell"
                        style={{
                          textAlign: "right",
                          verticalAlign: "middle",
                          whiteSpace: "nowrap",
                          width: actionsWidth,
                          minWidth: actionsWidth !== "1%" ? actionsWidth : "auto"
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {actions(row, index)}
                      </td>
                    )}
                  </tr>
                );
              }).reduce((acc, rowElement, idx) => {
                const row = data[idx];
                const rowKey = getRowKey(row, idx);
                const isExpanded = Boolean(expandedRows[rowKey]);

                acc.push(rowElement);

                // If expanded and there are collapsed columns, render details sub-row
                if (hasCollapsed && isExpanded) {
                  acc.push(
                    <tr key={`${rowKey}-details`} className="adaptive-details-row">
                      <td
                        colSpan={totalCols}
                        className="adaptive-details-container-td"
                        style={{
                          background: "var(--surface-strong, rgba(0, 0, 0, 0.02))",
                          padding: "0.85rem 1.25rem",
                          borderBottom: "2px solid var(--border, rgba(0,0,0,0.1))"
                        }}
                      >
                        <div
                          className="adaptive-details-card"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                            gap: "0.75rem 1.25rem",
                            fontSize: "0.86rem"
                          }}
                        >
                          {collapsedColumns.map((col) => {
                            const val = row[col.key];
                            const tooltip = getCellTooltip(val, col, row);
                            return (
                              <div
                                key={col.key || col.label}
                                className="adaptive-detail-item"
                                style={{ display: "flex", flexDirection: "column", gap: "2px" }}
                                title={tooltip}
                              >
                                <span
                                  className="adaptive-detail-label"
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    textTransform: "uppercase",
                                    color: "var(--text-muted, #64748b)",
                                    letterSpacing: "0.04em"
                                  }}
                                >
                                  {col.label}
                                </span>
                                <span
                                  className="adaptive-detail-value"
                                  style={{
                                    color: "var(--text, #1e293b)",
                                    wordBreak: "break-word"
                                  }}
                                >
                                  {renderCellValue(col, row, idx)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                }

                return acc;
              }, [])
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
