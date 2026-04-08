import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Parse a date string (YYYY-MM-DD or ISO) as local time, avoiding UTC shift */
export function parseLocalDate(dateStr: string): Date {
  // If it's a plain date like "2024-01-15", parse as local
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(dateStr);
}
