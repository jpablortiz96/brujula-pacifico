/** "2025-10-07T00:00:00.000" → "2025-10-07" | null */
export function parseSocrataDate(s: string | undefined | null): string | null {
  if (!s) return null;
  try {
    const clean = String(s).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch { return null; }
}

/** "8055000" | 8055000 → 8055000 | null */
export function parseSocrataNumber(
  s: string | number | undefined | null
): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}
