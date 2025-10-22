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
 * Generates a schedule name based on day, time, and duration
 * @param day - Day of week (e.g., "Mon", "Tue")
 * @param time24 - Time in 24h format (e.g., "06:00")
 * @param durationMinutes - Duration in minutes
 * @returns Generated name (e.g., "Monday - 6:00 AM - 30 min")
 */
export function generateScheduleName(
  day: DayOfWeek,
  time24: string,
  durationMinutes: number
): string {
  // Full day names
  const dayNames: Record<DayOfWeek, string> = {
    Sun: 'Sunday',
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
  };

  const dayName = dayNames[day];
  const time12 = formatTime12h(time24);

  return `${dayName} - ${time12} - ${durationMinutes} min`;
}

/**
 * Sorts schedules by day of week (Mon-Sun), then by time
 * @param schedules - Array of schedules to sort
 * @returns Sorted array (does not mutate original)
 */
export function sortSchedules(schedules: Schedule[]): Schedule[] {
  return [...schedules].sort((a, b) => {
    // First sort by day
    const dayDiff = DAY_ORDER[a.day] - DAY_ORDER[b.day];
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
