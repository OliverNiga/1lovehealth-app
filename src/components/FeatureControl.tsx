import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
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
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 600;
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
    <Pressable onPress={onPress} className="flex-1" style={isLargeScreen ? { height: '100%' } : {}}>
      <View
        className="rounded-card mx-1 text-center items-center justify-center"
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.divider,
          padding: isLargeScreen ? 24 : 16,
          ...(isLargeScreen && { height: '100%' })
        }}
      >
        <View className="items-start" style={{ marginBottom: isLargeScreen ? 12 : 8 }}>
          {React.cloneElement(icon as React.ReactElement, { color: iconColor })}
        </View>
        <Text style={{ color: textColor, fontSize: isLargeScreen ? 20 : 16, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: valueColor, marginTop: isLargeScreen ? 8 : 4, fontSize: isLargeScreen ? 16 : 14 }}>{value}</Text>
      </View>
    </Pressable>
  );
}