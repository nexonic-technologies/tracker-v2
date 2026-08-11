import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  showPageInfo = true,
  showJumpToPage = false,
  className = ""
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const rangeWithDots = [];

    // Always show first page
    if (totalPages > 0) {
      rangeWithDots.push(1);
    }

    // Calculate range around current page
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    // Add dots if there's a gap after first page
    if (start > 2) {
      rangeWithDots.push('...');
    }

    // Add pages around current page
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        rangeWithDots.push(i);
      }
    }

    // Add dots if there's a gap before last page
    if (end < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always show last page (if different from first)
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const handleJumpToPage = (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(e.target.value);
      if (page >= 1 && page <= totalPages) {
        onPageChange(page);
        e.target.value = '';
      }
    }
  };

  if (totalPages <= 1 && !showPageInfo) return null;

  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border-t border-[#ebe7e1] ${className}`}
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Items per page selector */}
      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex items-center space-x-2">
          <span className="text-[13px] text-[#626260]">Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
            className="px-3 py-1 border border-[#d3cec6] rounded-[6px] bg-white text-[#111111] text-[13px] focus:outline-none focus:ring-1 focus:ring-[#111111] focus:border-[#111111]"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-[13px] text-[#626260]">per page</span>
        </div>
      )}

      {/* Page info */}
      {showPageInfo && (
        <div className="text-[13px] text-[#626260]">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center space-x-1">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-2 border border-[#d3cec6] rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f1ec] bg-white text-[#626260] hover:text-[#111111] transition-colors"
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Previous page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 border border-[#d3cec6] rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f1ec] bg-white text-[#626260] hover:text-[#111111] transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {getVisiblePages().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && onPageChange(page)}
                disabled={page === '...'}
                className={`px-3 py-2 border text-[13px] font-medium rounded-[6px] min-w-[40px] transition-colors ${
                  page === currentPage
                    ? 'bg-[#111111] border-[#111111] text-white'
                    : page === '...'
                    ? 'bg-white border-[#d3cec6] text-[#7b7b78] cursor-default'
                    : 'bg-white border-[#d3cec6] text-[#626260] hover:bg-[#f5f1ec] hover:text-[#111111]'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Next page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 border border-[#d3cec6] rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f1ec] bg-white text-[#626260] hover:text-[#111111] transition-colors"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 border border-[#d3cec6] rounded-[6px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f1ec] bg-white text-[#626260] hover:text-[#111111] transition-colors"
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Jump to page */}
      {showJumpToPage && totalPages > 10 && (
        <div className="flex items-center space-x-2">
          <span className="text-[13px] text-[#626260]">Go to page:</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            placeholder={currentPage.toString()}
            onKeyPress={handleJumpToPage}
            className="w-16 px-2 py-1 border border-[#d3cec6] rounded-[6px] bg-white text-[#111111] text-[13px] focus:outline-none focus:ring-1 focus:ring-[#111111] focus:border-[#111111]"
          />
        </div>
      )}
    </div>
  );
};

export default Pagination;