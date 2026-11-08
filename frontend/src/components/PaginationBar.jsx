export function PaginationBar({
  page = 1,
  pageSize = 10,
  total = 0,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50]
}) {
  if (total === 0) {
    return null;
  }

  const startRecord = Math.min((page - 1) * pageSize + 1, total);
  const endRecord = Math.min(page * pageSize, total);

  // Calculate page buttons to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (page <= 3) {
        start = 2;
        end = 4;
      } else if (page >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        <span>
          Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{" "}
          <strong>{total}</strong> records
        </span>
        {onPageSizeChange && (
          <label className="page-size-selector">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Records per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="page-btn nav-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="First page"
          aria-label="First page"
        >
          ««
        </button>
        <button
          type="button"
          className="page-btn nav-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous page"
          aria-label="Previous page"
        >
          ‹ Prev
        </button>

        <div className="page-numbers">
          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="page-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                className={`page-btn number-btn ${page === p ? "active" : ""}`}
                onClick={() => onPageChange(p)}
                aria-current={page === p ? "page" : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="page-btn nav-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next page"
          aria-label="Next page"
        >
          Next ›
        </button>
        <button
          type="button"
          className="page-btn nav-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last page"
          aria-label="Last page"
        >
          »»
        </button>
      </div>
    </div>
  );
}
