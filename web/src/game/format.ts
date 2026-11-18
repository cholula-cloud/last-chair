/** Whole feet from terrain/lift world units. */
export function formatFeet(units: number, feetPerUnit: number): string {
  const ft = Math.round(units * feetPerUnit);
  return `${ft.toLocaleString("en-US")} ft`;
}

/** Formats whole-dollar amounts; negatives use U+2212 so the sign lines up with "+". */
export function formatMoney(
  n: number,
  { signed = false }: { signed?: boolean } = {},
): string {
  const body = `$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
  if (n < 0) return `\u2212${body}`;
  return signed ? `+${body}` : body;
}
