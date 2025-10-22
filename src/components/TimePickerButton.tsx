// 2-space indentation

import React, { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import { colors, radii } from '../styles/theme';

type Props = {
  value: string; // "HH:mm" 24-hour format
  onChange: (time: string) => void;
};

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function timeStringToDate(time24: string): Date {
  const [hours, minutes] = time24.split(':').map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function dateToTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function TimePickerButton({ value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const handlePress = () => {
    setShowPicker(true);
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      const timeString = dateToTimeString(selectedDate);
      onChange(timeString);
    }
  };

  const handleDismiss = () => {
    setShowPicker(false);
  };

  return (
    <View>
      <Pressable onPress={handlePress} style={styles.button}>
        <Clock size={20} color={colors.textSecondary} />
        <Text style={styles.text}>{formatTime(value)}</Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={timeStringToDate(value)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          {...(Platform.OS === 'ios' && {
            onTouchCancel: handleDismiss,
          })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
