import React from 'react';

export const BaseTable = ({ children, className = '' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <table className={`w-full text-left text-sm text-slate-600 dark:text-slate-300 ${className}`}>
        {children}
      </table>
    </div>
  );
};

export default BaseTable;
