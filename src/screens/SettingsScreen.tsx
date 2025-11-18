// 2-space indentation

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Smartphone, Trash2, Info, Mail, Star } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { colors, spacing, radii, typography } from '../styles/theme';
import { useSaunaController } from '../hooks/useSaunaController';
import { storage, loadNotificationSettings, saveNotificationSettings } from '../utils/storage';

export default function SettingsScreen() {
  const { getSchedules, getZoneProfiles } = useSaunaController();

  // Notification settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [readyNotifEnabled, setReadyNotifEnabled] = useState(true);
  const [timerWarningEnabled, setTimerWarningEnabled] = useState(true);
  const [sessionCompleteEnabled, setSessionCompleteEnabled] = useState(true);

  // Load notification settings on mount
  useEffect(() => {
    loadNotificationSettings().then((settings) => {
      setNotificationsEnabled(settings.enabled);
      setReadyNotifEnabled(settings.saunaReady);
      setTimerWarningEnabled(settings.timerWarnings);
      setSessionCompleteEnabled(settings.sessionComplete);
    });
  }, []);

  // Save notification settings when they change
  const handleToggleNotifications = useCallback(async (value: boolean) => {
    setNotificationsEnabled(value);
    await saveNotificationSettings({
      enabled: value,
      saunaReady: readyNotifEnabled,
      timerWarnings: timerWarningEnabled,
      sessionComplete: sessionCompleteEnabled,
    });
  }, [readyNotifEnabled, timerWarningEnabled, sessionCompleteEnabled]);

  const handleToggleReady = useCallback(async (value: boolean) => {
    setReadyNotifEnabled(value);
    await saveNotificationSettings({
      enabled: notificationsEnabled,
      saunaReady: value,
      timerWarnings: timerWarningEnabled,
      sessionComplete: sessionCompleteEnabled,
    });
  }, [notificationsEnabled, timerWarningEnabled, sessionCompleteEnabled]);

  const handleToggleTimerWarning = useCallback(async (value: boolean) => {
    setTimerWarningEnabled(value);
    await saveNotificationSettings({
      enabled: notificationsEnabled,
      saunaReady: readyNotifEnabled,
      timerWarnings: value,
      sessionComplete: sessionCompleteEnabled,
    });
  }, [notificationsEnabled, readyNotifEnabled, sessionCompleteEnabled]);

  const handleToggleSessionComplete = useCallback(async (value: boolean) => {
    setSessionCompleteEnabled(value);
    await saveNotificationSettings({
      enabled: notificationsEnabled,
      saunaReady: readyNotifEnabled,
      timerWarnings: timerWarningEnabled,
      sessionComplete: value,
    });
  }, [notificationsEnabled, readyNotifEnabled, timerWarningEnabled]);

  // Handle clearing all schedules
  const handleClearSchedules = useCallback(async () => {
    const schedules = await getSchedules();

    Alert.alert(
      'Clear All Schedules',
      `This will delete all ${schedules.length} schedule(s). This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.set('sauna:schedules:v1', []);
              Toast.show({
                type: 'success',
                text1: 'Schedules cleared',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Failed to clear schedules',
              });
            }
          },
        },
      ],
      { userInterfaceStyle: 'dark' }
    );
  }, [getSchedules]);

  // Handle clearing all profiles
  const handleClearProfiles = useCallback(async () => {
    const profiles = await getZoneProfiles();

    Alert.alert(
      'Clear All Profiles',
      `This will delete all ${profiles.length} profile(s). This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.set('sauna:profiles:v1', []);
              Toast.show({
                type: 'success',
                text1: 'Profiles cleared',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Failed to clear profiles',
              });
            }
          },
        },
      ],
      { userInterfaceStyle: 'dark' }
    );
  }, [getZoneProfiles]);

  // Handle reset all settings
  const handleResetSettings = useCallback(() => {
    Alert.alert(
      'Reset All Settings',
      'This will reset all app settings to defaults, including notification preferences. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // Reset notification preferences to storage
              await saveNotificationSettings({
                enabled: true,
                saunaReady: true,
                timerWarnings: true,
                sessionComplete: true,
              });

              // Update UI state
              setNotificationsEnabled(true);
              setReadyNotifEnabled(true);
              setTimerWarningEnabled(true);
              setSessionCompleteEnabled(true);

              // Clear last snapshot
              await storage.del('sauna:lastSnapshot:v1');

              Toast.show({
                type: 'success',
                text1: 'Settings reset',
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Failed to reset settings',
              });
            }
          },
        },
      ],
      { userInterfaceStyle: 'dark' }
    );
  }, []);

  // Handle send feedback
  const handleSendFeedback = useCallback(() => {
    const email = 'info@1LoveHealth.com'; // Replace with actual support email
    const subject = 'Sauna App Feedback';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

    Linking.openURL(url).catch(() => {
      Toast.show({
        type: 'error',
        text1: 'Could not open email app',
      });
    });
  }, []);

  // Handle rate app
  const handleRateApp = useCallback(() => {
    // Replace with actual App Store / Play Store URLs
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/id123456789', // Replace with actual ID
      android: 'https://play.google.com/store/apps/details?id=com.yourapp', // Replace with actual package
    });

    if (storeUrl) {
      Linking.openURL(storeUrl).catch(() => {
        Toast.show({
          type: 'error',
          text1: 'Could not open store',
        });
      });
    }
  }, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.outer }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ ...typography.caption, marginBottom: 8, marginLeft: 4 }}>
            NOTIFICATIONS
          </Text>
          <View style={styles.card}>
            {/* Master toggle */}
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Bell size={22} color={colors.textPrimary} />
                <Text style={{ ...typography.body }}>Enable Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.divider, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>

            <View style={styles.divider} />

            {/* Ready notification */}
            <View style={[styles.row, !notificationsEnabled && styles.disabledRow]}>
              <Text style={{ ...typography.body, color: !notificationsEnabled ? colors.textSecondary : colors.textPrimary }}>
                Sauna Ready
              </Text>
              <Switch
                value={readyNotifEnabled}
                onValueChange={handleToggleReady}
                disabled={!notificationsEnabled}
                trackColor={{ false: colors.divider, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>

            <View style={styles.divider} />

            {/* Timer warning */}
            <View style={[styles.row, !notificationsEnabled && styles.disabledRow]}>
              <Text style={{ ...typography.body, color: !notificationsEnabled ? colors.textSecondary : colors.textPrimary }}>
                Timer Warnings
              </Text>
              <Switch
                value={timerWarningEnabled}
                onValueChange={handleToggleTimerWarning}
                disabled={!notificationsEnabled}
                trackColor={{ false: colors.divider, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>

            <View style={styles.divider} />

            {/* Session complete */}
            <View style={[styles.row, !notificationsEnabled && styles.disabledRow]}>
              <Text style={{ ...typography.body, color: !notificationsEnabled ? colors.textSecondary : colors.textPrimary }}>
                Session Complete
              </Text>
              <Switch
                value={sessionCompleteEnabled}
                onValueChange={handleToggleSessionComplete}
                disabled={!notificationsEnabled}
                trackColor={{ false: colors.divider, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        </View>

        {/* Device & Connection Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ ...typography.caption, marginBottom: 8, marginLeft: 4 }}>
            DEVICE & CONNECTION
          </Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Smartphone size={22} color={colors.textPrimary} />
                <View>
                  <Text style={{ ...typography.body }}>Current Device</Text>
                  <Text style={{ ...typography.caption, marginTop: 2 }}>
                    Mock Controller
                  </Text>
                </View>
              </View>
              <View style={{
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#15803D' }}>
                  Connected
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Data & Storage Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ ...typography.caption, marginBottom: 8, marginLeft: 4 }}>
            DATA & STORAGE
          </Text>
          <View style={styles.card}>
            <Pressable onPress={handleClearSchedules} style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Trash2 size={22} color={colors.error} />
                <Text style={{ ...typography.body, color: colors.error }}>
                  Clear All Schedules
                </Text>
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Pressable onPress={handleClearProfiles} style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Trash2 size={22} color={colors.error} />
                <Text style={{ ...typography.body, color: colors.error }}>
                  Clear All Profiles
                </Text>
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Pressable onPress={handleResetSettings} style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Trash2 size={22} color={colors.error} />
                <Text style={{ ...typography.body, color: colors.error }}>
                  Reset All Settings
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* About Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ ...typography.caption, marginBottom: 8, marginLeft: 4 }}>
            ABOUT
          </Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Info size={22} color={colors.textPrimary} />
                <View>
                  <Text style={{ ...typography.body }}>Version</Text>
                  <Text style={{ ...typography.caption, marginTop: 2 }}>
                    1.0.0
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <Pressable onPress={handleSendFeedback} style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Mail size={22} color={colors.textPrimary} />
                <Text style={{ ...typography.body }}>Send Feedback</Text>
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Pressable onPress={handleRateApp} style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Star size={22} color={colors.textPrimary} />
                <Text style={{ ...typography.body }}>Rate the App</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
  },
  disabledRow: {
    opacity: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
};
