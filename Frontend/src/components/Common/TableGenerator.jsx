import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronUp, ChevronDown,
  ChevronsLeft, ChevronsRight,
  Pencil, Trash2,
  Printer, FileSpreadsheet,
} from "lucide-react";
import SearchBar from "./SearchBar";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";

/* -------------------- Helpers -------------------- */

const formatIndianDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeFormat = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (inputDate.getTime() === today.getTime()) return timeFormat;
  if (inputDate.getTime() === yesterday.getTime()) return `Yesterday, ${timeFormat}`;
  if (date.getFullYear() === now.getFullYear())
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const isDateString = (value) => {
  if (typeof value !== 'string') return false;
  return !isNaN(new Date(value).getTime()) && value.includes('T');
};

const formatColumnName = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const normalizeData = (data) => {
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null) return Object.values(data);
  return [];
};

const sortData = (data, key, direction) =>
  [...data].sort((a, b) => {
    const A = a[key], B = b[key];
    if (A == null) return 1;
    if (B == null) return -1;
    if (!isNaN(A) && !isNaN(B)) return direction === "asc" ? A - B : B - A;
    return direction === "asc"
      ? String(A).localeCompare(String(B), undefined, { numeric: true })
      : String(B).localeCompare(String(A), undefined, { numeric: true });
  });

/* -------------------- Export Helpers -------------------- */

const formatValueForExport = (v) => {
  if (v == null) return "";
  if (isDateString(v)) return formatIndianDate(v);
  
  if (Array.isArray(v)) {
    return v.map(item => {
      if (typeof item === "object" && item !== null) {
        if (item.basicInfo) {
          const { firstName = "", lastName = "" } = item.basicInfo;
          return `${firstName} ${lastName}`.trim();
        }
        if (item.firstName !== undefined || item.lastName !== undefined) {
          return `${item.firstName || ""} ${item.lastName || ""}`.trim();
        }
        return item.name || item.title || JSON.stringify(item);
      }
      return String(item);
    }).join(", ");
  }

  if (typeof v === "object" && v !== null) {
    if (v.basicInfo) {
      const { firstName = "", lastName = "" } = v.basicInfo;
      return `${firstName} ${lastName}`.trim();
    }
    if (v.firstName !== undefined || v.lastName !== undefined) {
      return `${v.firstName || ""} ${v.lastName || ""}`.trim();
    }
    if (v.name !== undefined) return String(v.name);
    if (v.title !== undefined) return String(v.title);
    return JSON.stringify(v);
  }

  return String(v);
};

const exportToExcel = (columns, data, title, customExport = {}) => {
  const headers = columns.map(formatColumnName);
  const rows = data.map((row) =>
    columns.map((col) => {
      if (customExport && typeof customExport[col] === "function") {
        return customExport[col](row);
      }
      return formatValueForExport(row[col]);
    })
  );

  const csvContent = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title || "table-export"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const printTable = (columns, data, title, customExport = {}) => {
  const headers = columns.map(formatColumnName).map((h) => `<th>${h}</th>`).join("");
  const bodyRows = data
    .map((row) =>
      `<tr>${columns.map((col) => {
        let textVal = "";
        if (customExport && typeof customExport[col] === "function") {
          textVal = customExport[col](row);
        } else {
          textVal = formatValueForExport(row[col]);
        }
        if (textVal === "") return "<td>-</td>";
        return `<td>${String(textVal)}</td>`;
      }).join("")}</tr>`
    )
    .join("");

  const html = `
    <html><head><title>${title || "Table"}</title>
    <style>
      body { font-family: Inter, sans-serif; font-size: 13px; color: #1A1D2E; }
      h2 { color: #7C3AED; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #EDE9FE; color: #7C3AED; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #7C3AED; }
      td { padding: 10px 14px; border-bottom: 1px solid #E2E5F0; }
      tr:nth-child(even) td { background: #F0F2FA; }
    </style></head>
    <body><h2>${title || "Table"}</h2><table><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></body>
    </html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.print();
};

const ROWS_PER_PAGE = 15;

/* -------------------- Component -------------------- */

const TableGenerator = ({
  title,
  data,
  customRender = {},
  customColumns = [],
  hiddenColumns = [],
  enableActions = true,
  onEdit,
  onDelete,
  onRowClick,
  customExport = {},
  maxHeight = "calc(100vh - 220px)",
  className = "",
}) => {
  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [hiddenCols, setHiddenCols] = useState(hiddenColumns);

  useEffect(() => {
    setHiddenCols(hiddenColumns);
  }, [JSON.stringify(hiddenColumns)]);

  useEffect(() => {
    const normalized = normalizeData(data);
    setTableData(normalized);
    setFilteredData(normalized);
    setCurrentPage(1);
  }, [data]);

  /* All data-columns (no __actions) used for visibility toggle & exports */
  const dataColumns = useMemo(() => {
    const normalized = normalizeData(data);
    if (customColumns?.length > 0) return customColumns;
    if (normalized.length === 0) return [];
    const allKeys = new Set();
    normalized.forEach((item) => Object.keys(item).forEach((k) => allKeys.add(k)));
    const systemKeys = new Set(["_id", "__v", "createdAt", "updatedAt", "createdBy", "updatedBy", ...(hiddenColumns || [])]);
    return Array.from(allKeys).filter((k) => !systemKeys.has(k));
  }, [data, JSON.stringify(hiddenColumns), JSON.stringify(customColumns)]);

  /* Visible columns rendered in table */
  const columns = useMemo(() => {
    const visible = dataColumns.filter((c) => !hiddenCols.includes(c));
    return enableActions ? [...visible, "__actions"] : visible;
  }, [dataColumns, hiddenCols, enableActions]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || sortConfig.key === "__actions") return filteredData;
    return sortData(filteredData, sortConfig.key, sortConfig.direction);
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(start, start + ROWS_PER_PAGE);
  }, [sortedData, currentPage]);

  const handleSort = (col) => {
    if (col === "__actions") return;
    setSortConfig((prev) => ({
      key: col,
      direction: prev.key === col && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleColumn = (col) =>
    setHiddenCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );

  const visibleDataCols = dataColumns.filter((c) => !hiddenCols.includes(c));

  /* -------------------- Render -------------------- */

  return (
    <div
      className={`bg-surface rounded-tracker-lg border border-hairline shadow-xs overflow-hidden w-full ${className}`}
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* ── Toolbar ── */}
      <div className="px-4 py-2.5 border-b border-hairline flex items-center justify-between gap-3 flex-wrap bg-surface">
        {/* Left: title */}
        <div>
          {title && (
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[var(--brand-solid)] inline-block" />
              <h3 className="text-[14px] font-bold text-ink leading-none">{title}</h3>
            </div>
          )}
        </div>

        {/* Right: actions + search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Print */}
          <button
            onClick={() => printTable(visibleDataCols, sortedData, title, customExport)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-tracker-md border border-hairline bg-surface text-[12px] font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
            title="Print"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={() => exportToExcel(visibleDataCols, sortedData, title, customExport)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-tracker-md border border-hairline bg-surface text-[12px] font-semibold text-ink-muted hover:bg-[var(--tracker-success-light)] hover:text-[var(--tracker-success)] hover:border-[var(--tracker-success)] transition-colors cursor-pointer"
            title="Export to Excel"
          >
            <FileSpreadsheet size={13} />
            <span>Excel</span>
          </button>

          {/* Column Visibility */}
          <ColumnVisibilityDropdown
            columns={dataColumns.map(formatColumnName)}
            hiddenCols={hiddenCols.map(formatColumnName)}
            onToggle={(label) => {
              const col = dataColumns.find((c) => formatColumnName(c) === label);
              if (col) toggleColumn(col);
            }}
          />

          {/* Search */}
          <SearchBar
            data={tableData}
            searchFields={visibleDataCols}
            placeholder="Search records..."
            onFilter={(d) => { setFilteredData(d); setCurrentPage(1); }}
          />
        </div>
      </div>

      {paginatedData.length === 0 ? (
        <div className="text-center py-14 bg-surface">
          <div className="w-12 h-12 rounded-xl bg-surface-1 border border-hairline flex items-center justify-center mx-auto mb-2 text-ink-subtle">
            <span className="text-xl">🔍</span>
          </div>
          <div className="text-ink text-sm font-semibold mb-0.5">No records found</div>
          <div className="text-ink-muted text-xs">Try adjusting your search or filters</div>
        </div>
      ) : (
        <>
          {/* ── Table with Sticky Header & Scrollable Body ── */}
          <div
            className="overflow-x-auto overflow-y-auto w-full"
            style={{ maxHeight: maxHeight }}
          >
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-surface-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-md">
                <tr className="border-b border-hairline">
                  {columns.map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-3 py-1.5 text-left text-[10.5px] font-bold text-ink-muted uppercase tracking-wider select-none cursor-pointer hover:bg-surface-2 hover:text-ink transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {col === "__actions" ? "Actions" : formatColumnName(col)}
                        {sortConfig.key === col &&
                          (sortConfig.direction === "asc"
                            ? <ChevronUp size={11} className="text-accent font-bold" />
                            : <ChevronDown size={11} className="text-accent font-bold" />)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-hairline-soft bg-surface">
                {paginatedData.map((row, i) => (
                  <tr
                    key={row._id || i}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`transition-colors hover:bg-surface-1/70 ${onRowClick ? "cursor-pointer" : ""}`}
                  >
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-1.5 whitespace-nowrap text-[12px] text-ink leading-tight">
                        {col === "__actions" ? (
                          customRender.__actions ? customRender.__actions(row) : (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {onEdit && (
                                <button
                                  onClick={() => onEdit(row)}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-surface-1 hover:bg-surface-2 text-ink-muted hover:text-ink border border-hairline transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil size={11} />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => onDelete(row)}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)] hover:bg-[var(--tracker-danger)] hover:text-white transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          )
                        ) : customRender[col] ? (
                          customRender[col](row)
                        ) : isDateString(row[col]) ? (
                          <span className="text-ink-muted text-[11px]">{formatIndianDate(row[col])}</span>
                        ) : (
                          <span className="text-ink">{typeof row[col] === "object" && row[col] !== null ? formatValueForExport(row[col]) : String(row[col] ?? "-")}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="px-4 py-2.5 bg-surface-1 border-t border-hairline flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-ink-muted">
              Showing <span className="font-semibold text-ink">{((currentPage - 1) * ROWS_PER_PAGE) + 1}</span>
              {" – "}
              <span className="font-semibold text-ink">{Math.min(currentPage * ROWS_PER_PAGE, sortedData.length)}</span>
              {" of "}
              <span className="font-semibold text-ink">{sortedData.length}</span> records
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-tracker-md border border-hairline bg-surface text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronsLeft size={13} />
              </button>

              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Show current page and neighbors
                  if (totalPages > 6 && Math.abs(currentPage - pageNum) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                    if (Math.abs(currentPage - pageNum) === 3) {
                      return <span key={i} className="text-ink-subtle text-xs px-1 self-center">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-tracker-md text-xs font-semibold transition-colors ${
                        currentPage === pageNum
                          ? "bg-[var(--brand-solid)] text-white shadow-xs"
                          : "bg-surface border border-hairline text-ink-muted hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-tracker-md border border-hairline bg-surface text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronsRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TableGenerator;
