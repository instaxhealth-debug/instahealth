// Format price in fils to AED display string
export function formatPriceAED(priceFils: number): string {
  const aed = (priceFils / 100).toFixed(2);
  return `AED ${aed}`;
}

// Convert AED string/number to fils (integer)
export function aedToFils(aed: string | number): number {
  const aedNum = typeof aed === "string" ? parseFloat(aed) : aed;
  return Math.round(aedNum * 100);
}
