// src/components/ZoneRow.tsx
import React, { useMemo, useRef } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
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
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 600;
  const progress = useMemo(() => {
    const denom = Math.max(1, target - TEMP.ambientDefaultF);
    const num = Math.max(0, current - TEMP.ambientDefaultF);
    return Math.max(0, Math.min(1, num / denom));
  }, [current, target]);

  // Auto-increment/decrement on hold
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const didAutoRepeatRef = useRef(false);
  const onIncRef = useRef(onInc);
  const onDecRef = useRef(onDec);

  // Keep refs up to date
  onIncRef.current = onInc;
  onDecRef.current = onDec;

  const startAutoChange = (callback: 'inc' | 'dec') => {
    didAutoRepeatRef.current = false;
    // Initial delay before starting auto-repeat
    timeoutRef.current = setTimeout(() => {
      didAutoRepeatRef.current = true;
      // Start repeating every 100ms
      intervalRef.current = setInterval(() => {
        if (callback === 'inc') {
          onIncRef.current();
        } else {
          onDecRef.current();
        }
      }, 100);
    }, 300);
  };

  const stopAutoChange = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleIncPress = () => {
    if (!didAutoRepeatRef.current) {
      onInc();
    }
  };

  const handleDecPress = () => {
    if (!didAutoRepeatRef.current) {
      onDec();
    }
  };

  const buttonSize = isLargeScreen ? 48 : 40;
  const iconSize = isLargeScreen ? 22 : 18;
  const titleFontSize = isLargeScreen ? 36 : 28;
  const targetFontSize = isLargeScreen ? 16 : 14;
  const verticalPadding = isLargeScreen ? 20 : 12;

  return (
    <View
      className="rounded-2xl px-4 mb-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.divider,
        paddingVertical: verticalPadding
      }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={handleDecPress}
          onPressIn={() => startAutoChange('dec')}
          onPressOut={stopAutoChange}
          android_ripple={{ color: colors.divider }}
        >
          {({ pressed }) => (
            <View
              className="rounded-full items-center justify-center"
              style={{
                width: buttonSize,
                height: buttonSize,
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: colors.divider,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              }}
            >
              <Minus size={iconSize} color={colors.textPrimary} />
            </View>
          )}
        </Pressable>

        <View className="items-center flex-1">
          <Text style={{ color: colors.textPrimary, fontSize: titleFontSize, fontWeight: '700' }}>
            {title} {Math.round(current)}°
          </Text>

          {/* mini progress bar with gradient */}
          <View
            className="w-[72%] rounded-full"
            style={{
              height: isLargeScreen ? 6 : 8,
              marginTop: isLargeScreen ? 12 : 8,
              backgroundColor: colors.divider,
              overflow: 'hidden'
            }}
          >
            <View
              className="rounded-full"
              style={{
                height: '100%',
                width: `${Math.round(progress * 100)}%`,
                overflow: 'hidden'
              }}
            >
              <LinearGradient
                {...gradientProps}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          <Text style={{
            color: colors.accent,
            marginTop: isLargeScreen ? 12 : 8,
            fontSize: targetFontSize
          }}>
            Target {Math.round(target)}°
          </Text>
        </View>

        <Pressable
          onPress={handleIncPress}
          onPressIn={() => startAutoChange('inc')}
          onPressOut={stopAutoChange}
          android_ripple={{ color: colors.divider }}
        >
          {({ pressed }) => (
            <View
              className="rounded-full items-center justify-center"
              style={{
                width: buttonSize,
                height: buttonSize,
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: colors.divider,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              }}
            >
              <Plus size={iconSize} color={colors.textPrimary} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}