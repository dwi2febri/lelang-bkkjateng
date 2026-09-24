export type Holiday = { date: string; name: string };

// API Hari Libur also returns regional observances; only national holidays apply.
export function normalizeHolidays(data: unknown, year: number): Holiday[] {
  if (!Array.isArray(data)) throw new Error("Invalid holiday response");
  const holidays = new Map<string, Holiday>();
  for (const item of data) {
    if (!item || typeof item !== "object" || item.is_national_holiday !== true)
      continue;
    if (
      typeof item.holiday_date !== "string" ||
      typeof item.holiday_name !== "string"
    )
      continue;
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(item.holiday_date);
    if (!match || Number(match[1]) !== year) continue;
    const month = Number(match[2]),
      day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    )
      continue;
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const name = item.holiday_name.trim();
    if (name) holidays.set(`${key}:${name}`, { date: key, name });
  }
  return [...holidays.values()].sort((a, b) => a.date.localeCompare(b.date));
}
