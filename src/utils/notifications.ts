// src/utils/notifications.ts
// 2-space indentation

import * as Notifications from 'expo-notifications';

export async function ensureNotifPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') await Notifications.requestPermissionsAsync();
}

/** Schedule at an absolute Date/Time */
export async function scheduleAt(date: Date, title: string, body?: string) {
  await ensureNotifPermission();

  const trigger: Notifications.DateTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DATE, // <-- enum
    date,
  };

  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger,
  });
}

/** Schedule after N seconds from now */
export async function scheduleInSeconds(seconds: number, title: string, body?: string) {
  await ensureNotifPermission();

  const trigger: Notifications.TimeIntervalTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, // <-- enum
    seconds: Math.max(1, Math.floor(seconds)),
    repeats: false,
  };

  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger,
  });
}

export async function cancelNotification(id?: string) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}
