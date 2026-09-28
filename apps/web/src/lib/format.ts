export function formatMoney(amount: number, currency = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return `${symbol}${amount.toLocaleString("en-NG")}`;
}

export function formatPercent(originalPrice: number, groupPrice: number): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - groupPrice) / originalPrice) * 100);
}
