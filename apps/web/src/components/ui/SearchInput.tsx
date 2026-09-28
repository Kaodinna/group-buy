interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search…" }: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}
