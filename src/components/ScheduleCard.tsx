// 2-space indentation

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MoreVertical, Calendar, Clock, Timer } from 'lucide-react-native';
import { colors, radii } from '../styles/theme';
import type { Schedule } from '../utils/storage';
import type { DayOfWeek } from '../controllers/SaunaControllerInterface';

type Props = {
  schedule: Schedule;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onPressMenu: (schedule: Schedule) => void;
  onPress: (schedule: Schedule) => void;
};

// Helper to extract day name from schedule name
function getDayName(scheduleName: string): string {
  return scheduleName.split(' - ')[0];
}

// Helper to extract time from schedule name
function getTime(scheduleName: string): string {
  const parts = scheduleName.split(' - ');
  return parts[1] || '';
}

// Helper to extract duration from schedule name
function getDuration(scheduleName: string): string {
  const parts = scheduleName.split(' - ');
  return parts[2] || '';
}

export default function ScheduleCard({ schedule, onToggleEnabled, onPressMenu, onPress }: Props) {
  const dayName = getDayName(schedule.name);
  const time = getTime(schedule.name);
  const duration = getDuration(schedule.name);
  const isDisabled = !schedule.enabled;

  return (
    <Pressable
      onPress={() => onPress(schedule)}
      style={[styles.card, isDisabled && styles.cardDisabled]}
      accessibilityLabel={`Schedule ${schedule.name}`}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, isDisabled && styles.textDisabled]}>
            {schedule.name}
          </Text>

          {/* Single horizontal row with temperatures and timer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Temperature card */}
            <View style={{
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              flexDirection: 'row',
              gap: 14,
            }}>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 20 }}>{schedule.upper}°</Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}>Upper</Text>
              </View>

              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 20 }}>{schedule.middle}°</Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}>Middle</Text>
              </View>

              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 20 }}>{schedule.lower}°</Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSecondary, marginTop: 1 }}>Lower</Text>
              </View>
            </View>

            {/* Timer badge */}
            <View style={{
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              minHeight: 46,
            }}>
              <Timer size={16} color="#15803D" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#15803D' }}>
                {duration.replace(' min', 'm')}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => onPressMenu(schedule)}
          hitSlop={8}
          accessibilityLabel="Open schedule actions"
          style={{ padding: 8, marginLeft: 8 }}
        >
          <MoreVertical size={28} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
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
  cardDisabled: {
    opacity: 0.5,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  textDisabled: {
    color: colors.textSecondary,
  },
});
