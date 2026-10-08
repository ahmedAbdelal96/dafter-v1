type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pagesAroundCurrent = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => i + Math.max(currentPage - 1, 1)
  );

  return (
    <div className="flex items-center ">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="mr-2.5 flex h-9 items-center justify-center rounded-xl border border-border-light bg-surface-secondary px-3.5 py-2 text-sm text-text-secondary shadow-theme-xs hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-40 dark:border-border-strong dark:bg-surface-secondary dark:text-text-secondary dark:hover:bg-surface-tertiary"
      >
        Previous
      </button>
      <div className="flex items-center gap-1">
        {currentPage > 3 && <span className="px-2 text-text-muted">…</span>}
        {pagesAroundCurrent.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-colors ${
              currentPage === page
                ? "bg-primary text-white shadow-theme-xs"
                : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary dark:text-text-secondary dark:hover:bg-surface-tertiary"
            }`}
          >
            {page}
          </button>
        ))}
        {currentPage < totalPages - 2 && <span className="px-2 text-text-muted">…</span>}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="ml-2.5 flex h-9 items-center justify-center rounded-xl border border-border-light bg-surface-secondary px-3.5 py-2 text-sm text-text-secondary shadow-theme-xs hover:bg-surface-tertiary hover:text-text-primary disabled:opacity-40 dark:border-border-strong dark:bg-surface-secondary dark:text-text-secondary dark:hover:bg-surface-tertiary"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
