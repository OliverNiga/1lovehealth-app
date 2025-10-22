// 2-space indentation

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { DayOfWeek } from '../controllers/SaunaControllerInterface';
import { colors } from '../styles/theme';

type MultiProps = {
  mode?: 'multiple';
  selectedDays: DayOfWeek[];
  onToggleDay: (day: DayOfWeek) => void;
};

type SingleProps = {
  mode: 'single';
  selectedDay: DayOfWeek | null;
  onSelectDay: (day: DayOfWeek) => void;
};

type Props = MultiProps | SingleProps;

const DAYS: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DaySelector(props: Props) {
  const mode = props.mode || 'multiple';

  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const isSelected =
          mode === 'single'
            ? props.selectedDay === day
            : props.selectedDays.includes(day);

        const handlePress = () => {
          if (mode === 'single') {
            props.onSelectDay(day);
          } else {
            props.onToggleDay(day);
          }
        };

        return (
          <Pressable
            key={day}
            onPress={handlePress}
            style={[
              styles.dayChip,
              isSelected && styles.dayChipSelected,
            ]}
            accessibilityLabel={
              mode === 'single'
                ? `Select ${day}`
                : `${isSelected ? 'Deselect' : 'Select'} ${day}`
            }
          >
            <Text
              style={[
                styles.dayText,
                isSelected && styles.dayTextSelected,
              ]}
            >
              {day}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  dayChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
});
