// 2-space indentation

import type { Schedule } from './storage';
import type { DayOfWeek } from '../controllers/SaunaControllerInterface';

// Day order for sorting (Monday first, Sunday last)
const DAY_ORDER: Record<DayOfWeek, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/**
 * Converts 24-hour time string to 12-hour format with AM/PM
 * @param time24 - Time in 24h format (e.g., "06:00", "14:30")
 * @returns Time in 12h format (e.g., "6:00 AM", "2:30 PM")
 */
export function formatTime12h(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Formats an array of days as abbreviated strings
 * @param days - Array of days (e.g., ["Mon", "Tue", "Wed"])
 * @returns Formatted string (e.g., "Mon, Tue, Wed")
 */
export function formatDaysAbbreviated(days: DayOfWeek[]): string {
  if (days.length === 0) return '';
  if (days.length === 7) return 'Every day';

  // Sort days in week order before displaying
  const sorted = [...days].sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
  return sorted.join(', ');
}

/**
 * Sorts schedules by earliest day in their days array (Mon-Sun), then by time
 * @param schedules - Array of schedules to sort
 * @returns Sorted array (does not mutate original)
 */
export function sortSchedules(schedules: Schedule[]): Schedule[] {
  return [...schedules].sort((a, b) => {
    // First sort by earliest day in the days array
    const aEarliestDay = Math.min(...a.days.map(d => DAY_ORDER[d]));
    const bEarliestDay = Math.min(...b.days.map(d => DAY_ORDER[d]));
    const dayDiff = aEarliestDay - bEarliestDay;
    if (dayDiff !== 0) return dayDiff;

    // Then sort by time
    return a.timeLocalHHmm.localeCompare(b.timeLocalHHmm);
  });
}

/**
 * Parses time string and returns total minutes for comparison
 * @param time24 - Time in 24h format (e.g., "06:00")
 * @returns Total minutes from midnight
 */
export function timeToMinutes(time24: string): number {
  const [hours, minutes] = time24.split(':').map(Number);
  return hours * 60 + minutes;
}
