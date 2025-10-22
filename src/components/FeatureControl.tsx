import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '../styles/theme';

type Props = {
  title: string;
  value: string;
  icon: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'redlight' | 'pemf';
  isActive?: boolean;
};

export default function FeatureControl({ title, value, icon, onPress, variant = 'default', isActive = false }: Props) {
  // Determine colors based on variant and active state
  let iconColor = colors.textSecondary;
  let textColor = colors.textSecondary;
  let valueColor = colors.textSecondary;

  if (variant === 'redlight') {
    iconColor = isActive ? colors.redlight : colors.textSecondary;
    textColor = isActive ? colors.redlight : colors.textSecondary;
    valueColor = isActive ? colors.redlight : colors.textSecondary;
  } else if (variant === 'pemf') {
    iconColor = colors.pemf;
    textColor = colors.pemf;
    valueColor = colors.pemf;
  } else {
    // Default variant (Timer) uses primary text color
    iconColor = colors.textPrimary;
    textColor = colors.textPrimary;
    valueColor = colors.textPrimary;
  }

  return (
    <Pressable onPress={onPress} className="flex-1">
      <View
        className="rounded-card p-4 mx-1 text-center items-center"
        style={{ 
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.divider
        }}
      >
        <View className="items-start mb-2">
          {React.cloneElement(icon as React.ReactElement, { color: iconColor })}
        </View>
        <Text style={{ color: textColor, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: valueColor, marginTop: 4 }}>{value}</Text>
      </View>
    </Pressable>
  );
}