import './global.css';

import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import RootStack from './src/navigation/RootStack';
import { colors } from './src/styles/theme';
import { loadSchedules } from './src/utils/storage';
import { checkSchedulesToExecute } from './src/utils/scheduleManager';
import { MockSaunaController } from './src/controllers/MockSaunaController';

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.divider,
    primary: colors.accent,
    notification: colors.accent,
  },
};

export default function App() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Listen for notifications when app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { scheduleId, action } = response.notification.request.content.data || {};

      if (action === 'start' && scheduleId) {
        console.log('User tapped notification for schedule:', scheduleId);
        // Execute the schedule
        loadSchedules().then(async (schedules) => {
          const schedule = schedules.find((s) => s.id === scheduleId);
          if (schedule) {
            try {
              await checkSchedulesToExecute([schedule], MockSaunaController);
            } catch (error) {
              console.error('Error executing schedule from notification:', error);
            }
          }
        });
      }
    });

    // Foreground schedule checker - runs every 30 seconds
    intervalRef.current = setInterval(async () => {
      try {
        const schedules = await loadSchedules();
        await checkSchedulesToExecute(schedules, MockSaunaController);
      } catch (error) {
        console.error('Error in foreground schedule checker:', error);
      }
    }, 30000); // Check every 30 seconds

    // Cleanup
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <RootStack />
      </NavigationContainer>

      {/* Toast host (global) */}
      <Toast />
    </SafeAreaProvider>
  );
}
