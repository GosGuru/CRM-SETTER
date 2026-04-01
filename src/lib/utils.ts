import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns YYYY-MM-DD in the user's local timezone */
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns ISO 8601 UTC bounds for a given local date string (YYYY-MM-DD).
 * "T00:00:00" and "T23:59:59.999" are interpreted as LOCAL time, then
 * converted to UTC so Supabase timestamptz comparisons are correct regardless
 * of the user's timezone.
 */
export function localDayBoundsISO(dateStr: string): { start: string; end: string } {
  return {
    start: new Date(`${dateStr}T00:00:00`).toISOString(),
    end: new Date(`${dateStr}T23:59:59.999`).toISOString(),
  };
}
