import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DayOfWeek } from '../controllers/SaunaControllerInterface';
import { generateScheduleName } from './scheduleHelpers';

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  async del(key: string): Promise<void> {
    try { await AsyncStorage.removeItem(key); } catch {}
  },
};

export type ZoneProfile = {
  id: string;
  name: string;
  createdAt: number;
  upper: number;
  middle: number;
  lower: number;
  redLightOn: boolean;
  pemfLevel: number;
  timerMinutes: number | null;
};

export type Schedule = {
  id: string;
  name: string;
  enabled: boolean;

  // When to run
  day: DayOfWeek; // 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  timeLocalHHmm: string; // "06:00" (24h format)

  // Zone temperatures (°F)
  upper: number;   // 77-194
  middle: number;  // 77-194
  lower: number;   // 77-176

  // Features
  redLightOn: boolean;
  pemfLevel: number;        // 0-30
  timerMinutes: number;     // 5-60 (doubles as session duration)

  // Optional profile reference
  profileId?: string;
  profileName?: string;

  createdAt: number;        // timestamp
  updatedAt: number;        // timestamp
};

export const PROFILE_KEY = 'sauna:profiles:v1';
export const SCHEDULE_KEY = 'sauna:schedules:v1';

export async function loadProfiles(): Promise<ZoneProfile[]> {
  return storage.get<ZoneProfile[]>(PROFILE_KEY, []);
}

export async function saveProfiles(list: ZoneProfile[]): Promise<void> {
  return storage.set(PROFILE_KEY, list);
}

// Migration: Convert old schedules (with days array) to new format (single day)
async function migrateSchedules(): Promise<void> {
  try {
    const raw = await storage.get<any[]>(SCHEDULE_KEY, []);

    if (raw.length === 0) return;

    // Check if migration is needed (old format has 'days' array)
    const needsMigration = raw.some(s => Array.isArray(s.days));

    if (!needsMigration) return;

    console.log('Migrating schedules from old format to new format...');

    const newSchedules: Schedule[] = [];

    for (const oldSchedule of raw) {
      if (Array.isArray(oldSchedule.days)) {
        // Old format: split into multiple schedules (one per day)
        for (const day of oldSchedule.days) {
          // Generate new name based on day, time, and duration
          const newName = generateScheduleName(
            day,
            oldSchedule.timeLocalHHmm,
            oldSchedule.timerMinutes
          );

          newSchedules.push({
            ...oldSchedule,
            day: day,
            name: newName,
            // Keep the same ID only if it's a single day, otherwise generate new ones
            id: oldSchedule.days.length === 1 ? oldSchedule.id : `${oldSchedule.id}-${day}`,
          });
        }
      } else if (oldSchedule.day) {
        // Already new format
        newSchedules.push(oldSchedule as Schedule);
      }
    }

    await storage.set(SCHEDULE_KEY, newSchedules);
    console.log(`Migrated ${raw.length} old schedules to ${newSchedules.length} new schedules`);
  } catch (error) {
    console.error('Error migrating schedules:', error);
  }
}

export async function loadSchedules(): Promise<Schedule[]> {
  await migrateSchedules();
  return storage.get<Schedule[]>(SCHEDULE_KEY, []);
}

export async function saveSchedules(list: Schedule[]): Promise<void> {
  return storage.set(SCHEDULE_KEY, list);
}
