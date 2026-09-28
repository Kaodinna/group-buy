import { formatMoney } from "@/lib/format";

interface PriceDisplayProps {
  originalPrice: number;
  groupPrice: number;
  currency?: string;
  size?: "sm" | "lg";
  showSavings?: boolean;
}

export function PriceDisplay({
  originalPrice,
  groupPrice,
  currency = "NGN",
  size = "lg",
  showSavings = true,
}: PriceDisplayProps) {
  const groupClass = size === "lg" ? "text-3xl font-bold tracking-tight" : "text-lg font-bold tracking-tight";
  const savings = originalPrice - groupPrice;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className={`${groupClass} text-foreground`}>{formatMoney(groupPrice, currency)}</span>
        <span className="text-sm text-muted line-through">{formatMoney(originalPrice, currency)}</span>
      </div>
      {showSavings && savings > 0 && (
        <span className="inline-flex w-fit items-center rounded-full bg-success-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
          Save {formatMoney(savings, currency)}
        </span>
      )}
    </div>
  );
}
