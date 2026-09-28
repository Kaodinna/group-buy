interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-black/3 dark:hover:bg-white/6"
      >
        Previous
      </button>
      <span className="px-2 text-sm text-muted">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-black/3 dark:hover:bg-white/6"
      >
        Next
      </button>
    </div>
  );
}
