// src/components/ZoneRow.tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradientProps } from '../styles/theme';
import { TEMP } from '../utils/constants';
import { Minus, Plus } from 'lucide-react-native';

type Props = {
  title: 'Upper' | 'Middle' | 'Lower';
  current: number;     // current °F
  target: number;      // target °F
  onInc(): void;       // +1°F (clamped 77–194)
  onDec(): void;       // -1°F
};

export default function ZoneRow({ title, current, target, onInc, onDec }: Props) {
  const progress = useMemo(() => {
    const denom = Math.max(1, target - TEMP.ambientDefaultF);
    const num = Math.max(0, current - TEMP.ambientDefaultF);
    return Math.max(0, Math.min(1, num / denom));
  }, [current, target]);

  return (
    <View
      className="rounded-2xl px-4 py-3 mb-3"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onDec}
          android_ripple={{ color: colors.divider }}
        >
          {({ pressed }) => (
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ 
                backgroundColor: colors.bg, 
                borderWidth: 1, 
                borderColor: colors.divider,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              }}
            >
              <Minus size={18} color={colors.textPrimary} />
            </View>
          )}
        </Pressable>

        <View className="items-center flex-1">
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '700' }}>
            {title} {Math.round(current)}°
          </Text>

          {/* mini progress bar with gradient */}
          <View
            className="w-[72%] h-2 mt-2 rounded-full"
            style={{ backgroundColor: colors.divider, overflow: 'hidden' }}
          >
            <View
              className="h-2 rounded-full"
              style={{ width: `${Math.round(progress * 100)}%`, overflow: 'hidden' }}
            >
              <LinearGradient
                {...gradientProps}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          <Text style={{ color: colors.accent, marginTop: 8 }}>Target {Math.round(target)}°</Text>
        </View>

        <Pressable
          onPress={onInc}
          android_ripple={{ color: colors.divider }}
        >
          {({ pressed }) => (
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ 
                backgroundColor: colors.bg, 
                borderWidth: 1, 
                borderColor: colors.divider,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              }}
            >
              <Plus size={18} color={colors.textPrimary} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}