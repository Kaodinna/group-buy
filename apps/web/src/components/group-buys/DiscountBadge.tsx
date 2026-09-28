import { formatPercent } from "@/lib/format";

export function DiscountBadge({ originalPrice, groupPrice }: { originalPrice: number; groupPrice: number }) {
  const percent = formatPercent(originalPrice, groupPrice);
  if (percent <= 0) return null;

  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
      {percent}% OFF
    </span>
  );
}
