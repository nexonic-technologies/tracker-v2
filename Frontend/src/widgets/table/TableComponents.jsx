import React from 'react';

export const TableHead = ({ children, className = '' }) => (
  <thead className={`bg-slate-50 dark:bg-slate-800/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 ${className}`}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-slate-200 dark:divide-slate-800 ${className}`}>
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '', hover = true, onClick }) => (
  <tr
    onClick={onClick}
    className={`transition-colors ${hover ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </tr>
);

export const TableCell = ({ children, isHeader = false, className = '', align = 'left' }) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align] || 'text-left';

  const Component = isHeader ? 'th' : 'td';

  return (
    <Component className={`px-4 py-3 text-sm font-medium ${alignClass} ${className}`}>
      {children}
    </Component>
  );
};

export const TableToolbar = ({ title, search, actions, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-xl">
    {title && <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
    {search && <div className="flex-1 max-w-xs">{search}</div>}
    {actions && <div className="flex items-center gap-2">{actions}</div>}
    {children}
  </div>
);

export const TablePagination = ({ page = 1, totalPages = 1, onPageChange, totalRecords }) => (
  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-xl text-xs text-slate-500">
    <div>{totalRecords !== undefined && <span>Total: {totalRecords} entries</span>}</div>
    <div className="flex items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange && onPageChange(page - 1)}
        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Previous
      </button>
      <span>Page {page} of {totalPages}</span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange && onPageChange(page + 1)}
        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Next
      </button>
    </div>
  </div>
);
