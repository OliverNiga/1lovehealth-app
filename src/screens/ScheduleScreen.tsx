// 2-space indentation

import React, { useCallback, useLayoutEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radii, typography } from '../styles/theme';
import { useSaunaController } from '../hooks/useSaunaController';
import type { Schedule } from '../utils/storage';
import type { RootStackParamList } from '../navigation/RootStack';
import ScheduleCard from '../components/ScheduleCard';
import { sortSchedules } from '../utils/scheduleHelpers';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScheduleScreen() {
  const nav = useNavigation<NavigationProp>();

  const {
    getSchedules,
    updateSchedule,
    deleteSchedule,
  } = useSaunaController();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const list = await getSchedules();
      const sorted = sortSchedules(list);
      setSchedules(sorted);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [getSchedules]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleCreatePress = useCallback(() => {
    nav.navigate('ScheduleEditScreen' as never);
  }, [nav]);

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Schedules',
      headerRight: () => (
        <Pressable
          onPress={handleCreatePress}
          accessibilityLabel="Create new schedule"
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Plus size={22} color={colors.textPrimary} />
        </Pressable>
      ),
    });
  }, [nav, handleCreatePress]);

  const handleToggleEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await updateSchedule(id, { enabled });
        setSchedules((prev) =>
          prev.map((s) => (s.id === id ? { ...s, enabled } : s))
        );
        // No toast notification for enable/disable
      } catch (error) {
        console.error('Error toggling schedule:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to update schedule',
        });
      }
    },
    [updateSchedule]
  );

  const handleDelete = useCallback(
    (id: string, name?: string) => {
      Alert.alert(
        'Delete Schedule',
        name ? `Delete "${name}"?` : 'Delete this schedule?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteSchedule(id);
              Toast.show({ type: 'success', text1: 'Schedule deleted' });
              load();
            },
          },
        ],
        { userInterfaceStyle: 'dark' }
      );
    },
    [deleteSchedule, load]
  );

  const openActions = useCallback(
    (schedule: Schedule) => {
      const toggleText = schedule.enabled ? 'Disable' : 'Enable';

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', toggleText, 'Edit', 'Delete'],
            destructiveButtonIndex: 3,
            cancelButtonIndex: 0,
            userInterfaceStyle: 'dark',
          },
          (idx) => {
            if (idx === 1) handleToggleEnabled(schedule.id, !schedule.enabled);
            if (idx === 2) nav.navigate('ScheduleEditScreen' as never, { scheduleId: schedule.id } as never);
            if (idx === 3) handleDelete(schedule.id, schedule.name);
          }
        );
      } else {
        Alert.alert(
          schedule.name,
          undefined,
          [
            { text: toggleText, onPress: () => handleToggleEnabled(schedule.id, !schedule.enabled) },
            { text: 'Edit', onPress: () => nav.navigate('ScheduleEditScreen' as never, { scheduleId: schedule.id } as never) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDelete(schedule.id, schedule.name) },
            { text: 'Cancel', style: 'cancel' },
          ],
          { userInterfaceStyle: 'dark' }
        );
      }
    },
    [nav, handleDelete, handleToggleEnabled]
  );

  const handleCardPress = useCallback(
    (schedule: Schedule) => {
      nav.navigate('ScheduleEditScreen' as never, { scheduleId: schedule.id } as never);
    },
    [nav]
  );

  const renderItem = useCallback(
    ({ item }: { item: Schedule }) => (
      <ScheduleCard
        schedule={item}
        onToggleEnabled={handleToggleEnabled}
        onPressMenu={openActions}
        onPress={handleCardPress}
      />
    ),
    [handleToggleEnabled, openActions, handleCardPress]
  );

  const EmptyComponent = useCallback(
    () => (
      <View style={{ padding: spacing.outer * 2, alignItems: 'center' }}>
        <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}>
          No schedules yet — Create a schedule to automate your sauna sessions.
        </Text>
        <Pressable
          onPress={handleCreatePress}
          style={{
            marginTop: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.divider,
            borderRadius: radii.button,
            paddingVertical: 10,
            paddingHorizontal: 16,
          }}
          accessibilityLabel="Create schedule"
        >
          <Text style={{ ...typography.body }}>Create Schedule</Text>
        </Pressable>
      </View>
    ),
    [handleCreatePress]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <View style={{ padding: spacing.outer }}>
          <Text style={{ ...typography.caption }}>Loading…</Text>
        </View>
      ) : schedules.length === 0 ? (
        <EmptyComponent />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: spacing.outer,
          }}
        />
      )}
    </View>
  );
}
