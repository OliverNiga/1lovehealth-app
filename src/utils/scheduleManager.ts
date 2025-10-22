// 2-space indentation

import * as Notifications from 'expo-notifications';
import type { Schedule } from './storage';
import type { SaunaController } from '../controllers/SaunaControllerInterface';
import type { DayOfWeek } from '../controllers/SaunaControllerInterface';

const DAY_MAP: Record<DayOfWeek, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Calculate the next occurrence of a schedule from now
 */
export function getNextOccurrence(schedule: Schedule): Date | null {
  if (!schedule.enabled || !schedule.day) {
    return null;
  }

  const now = new Date();
  const [hours, minutes] = schedule.timeLocalHHmm.split(':').map(Number);

  // Convert schedule day to day number
  const scheduleDayNumber = DAY_MAP[schedule.day];

  // Try today first
  const today = new Date();
  today.setHours(hours, minutes, 0, 0);

  if (today > now && scheduleDayNumber === now.getDay()) {
    return today;
  }

  // Find next occurrence of this day
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + i);
    nextDate.setHours(hours, minutes, 0, 0);

    if (scheduleDayNumber === nextDate.getDay()) {
      return nextDate;
    }
  }

  return null;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Schedule notifications for a schedule (5 min warning + start)
 */
export async function scheduleNotifications(schedule: Schedule): Promise<void> {
  if (!schedule.enabled) {
    return;
  }

  const nextOccurrence = getNextOccurrence(schedule);
  if (!nextOccurrence) {
    return;
  }

  const now = new Date();
  const secondsUntilStart = Math.floor((nextOccurrence.getTime() - now.getTime()) / 1000);

  // Don't schedule if the time has passed or is within the next 60 seconds
  // This prevents immediate notifications during testing
  if (secondsUntilStart <= 60) {
    console.log(`Skipping notification for "${schedule.name}" - too close to start time (${secondsUntilStart}s)`);
    return;
  }

  // Cancel existing notifications for this schedule
  await cancelScheduleNotifications(schedule.id);

  // Schedule 5-minute warning (if more than 5 minutes away)
  if (secondsUntilStart > 300) {
    await Notifications.scheduleNotificationAsync({
      identifier: `schedule-warning-${schedule.id}`,
      content: {
        title: 'Sauna Starting Soon',
        body: `Your ${schedule.name} session starts in 5 minutes`,
        sound: true,
      },
      trigger: {
        seconds: secondsUntilStart - 300,
      },
    });
  }

  // Schedule start notification
  await Notifications.scheduleNotificationAsync({
    identifier: `schedule-start-${schedule.id}`,
    content: {
      title: 'Sauna Session Starting',
      body: `Your ${schedule.name} session is starting now`,
      sound: true,
      data: {
        scheduleId: schedule.id,
        action: 'start',
      },
    },
    trigger: {
      seconds: secondsUntilStart,
    },
  });

  console.log(`Scheduled notifications for "${schedule.name}" at ${nextOccurrence.toLocaleString()}`);
}

/**
 * Cancel all notifications for a schedule
 */
export async function cancelScheduleNotifications(scheduleId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`schedule-warning-${scheduleId}`).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(`schedule-start-${scheduleId}`).catch(() => {});
}

/**
 * Reschedule all enabled schedules
 */
export async function rescheduleAllNotifications(schedules: Schedule[]): Promise<void> {
  // Cancel all existing schedule notifications
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of allNotifications) {
    if (notif.identifier.startsWith('schedule-')) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier).catch(() => {});
    }
  }

  // Schedule new notifications
  for (const schedule of schedules) {
    if (schedule.enabled) {
      await scheduleNotifications(schedule);
    }
  }
}

/**
 * Execute a schedule - start the sauna with schedule settings
 */
export async function executeSchedule(
  schedule: Schedule,
  controller: SaunaController
): Promise<void> {
  try {
    console.log(`Executing schedule: ${schedule.name}`);

    // Check if sauna is already running (manual override)
    const state = await controller.getSaunaState();
    if (state !== 'OFF') {
      console.log('Sauna already running, skipping schedule execution');
      return;
    }

    // Apply schedule settings
    await Promise.all([
      controller.setUpperTargetTemp(schedule.upper),
      controller.setMiddleTargetTemp(schedule.middle),
      controller.setLowerTargetTemp(schedule.lower),
      controller.setPEMFLevel(schedule.pemfLevel),
      controller.setRedLight(schedule.redLightOn),
      controller.setSessionTimer(schedule.timerMinutes),
    ]);

    // Start the sauna
    await controller.startSauna();

    console.log(`Schedule "${schedule.name}" executed successfully`);

    // Reschedule for next week
    await scheduleNotifications(schedule);
  } catch (error) {
    console.error(`Error executing schedule "${schedule.name}":`, error);
    throw error;
  }
}

/**
 * Check if any schedules should execute now (for foreground checker)
 */
export async function checkSchedulesToExecute(
  schedules: Schedule[],
  controller: SaunaController
): Promise<void> {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  for (const schedule of schedules) {
    if (!schedule.enabled || !schedule.day) {
      continue;
    }

    // Check if schedule should run now
    const scheduleDayNumber = DAY_MAP[schedule.day];
    if (scheduleDayNumber !== currentDay) {
      continue;
    }

    if (schedule.timeLocalHHmm === currentTime) {
      console.log(`Schedule "${schedule.name}" is due to execute`);
      await executeSchedule(schedule, controller);
    }
  }
}
