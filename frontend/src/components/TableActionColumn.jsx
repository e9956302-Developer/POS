import React from "react";

/**
 * TableActionHeader
 * Standard action column header that seamlessly integrates with the table row
 */
export function TableActionHeader({ width, title = "Actions", className = "", style = {} }) {
  return (
    <th
      className={`saas-actions-header ${className}`.trim()}
      style={{
        ...(width ? { width, minWidth: width } : {}),
        ...style
      }}
    >
      {title}
    </th>
  );
}

/**
 * TableActionCell
 * Standard action column body cell.
 * Integrates seamlessly with the row - no detached floating overlay,
 * inheriting the exact row background across normal, hover, alternate, and selected states.
 */
export function TableActionCell({ width, children, className = "", style = {}, onClick }) {
  return (
    <td
      className={`saas-actions-col ${className}`.trim()}
      style={{
        ...(width ? { width, minWidth: width } : {}),
        ...style
      }}
      onClick={onClick || ((e) => e.stopPropagation())}
    >
      <div className="saas-actions-flex">
        {children}
      </div>
    </td>
  );
}

/**
 * TableActionButton
 * Standardized SaaS admin action button with fixed dimensions (28px height, 68px width),
 * uniform icon + label formatting, and consistent semantic colors.
 */
export function TableActionButton({
  icon,
  label,
  variant = "primary", // "edit" | "clone" | "extend" | "add" | "details" | "access" | "delete" | "cancel" | "receipt" | "return" | "whatsapp" | "view"
  onClick,
  title,
  disabled = false,
  className = ""
}) {
  return (
    <button
      type="button"
      className={`saas-action-btn ${variant} ${className}`.trim()}
      onClick={onClick}
      title={title || label}
      disabled={disabled}
      aria-label={label}
    >
      {icon && <span className="action-btn-icon" aria-hidden="true">{icon}</span>}
      <span className="action-btn-label">{label}</span>
    </button>
  );
}

/**
 * TableActionsVertical
 * Vertical action button container stack matching SaaS admin and Company admin portals.
 */
export function TableActionsVertical({ children, className = "", style = {} }) {
  return (
    <div className={`table-actions-vertical ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

