// 2-space indentation

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, Platform } from 'react-native';
import { Power } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientProps, colors, radii } from '../styles/theme';

type Props = {
  isOn: boolean;
  isPreheating: boolean;
  labelIdle?: string;
  labelOn?: string;
  progress: number;  // kept for API compatibility
  onPress(): void;
};

export default function ControlButton({
  isOn,
  isPreheating,
  progress,
  onPress,
  labelIdle = 'Press to Start',
  labelOn = 'Press to Stop',
}: Props) {
  const hasFill = isOn || isPreheating;

  // Button fill opacity (0 → 1) — native-driven
  const fillOpacity = useRef(new Animated.Value(hasFill ? 1 : 0)).current;

  // A perpetual glow "clock" that runs 0..1 on a loop; we never stop it.
  const glowPhase = useRef(new Animated.Value(0)).current;

  // Visibility of the glow (fade in/out) — keeps loop alive so there’s no phase jump.
  const glowVisible = useRef(new Animated.Value(hasFill ? 1 : 0)).current;

  // Start the perpetual glow loop ONCE (no restarts)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(glowPhase, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [glowPhase]);

  // Fade the gradient fill in/out (opacity only, native)
  useEffect(() => {
    Animated.timing(fillOpacity, {
      toValue: hasFill ? 1 : 0,
      duration: hasFill ? 450 : 300,
      easing: hasFill ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [hasFill, fillOpacity]);

  // Fade the glow visibility in/out (loop keeps running in the background)
  useEffect(() => {
    Animated.timing(glowVisible, {
      toValue: hasFill ? 1 : 0,
      duration: hasFill ? 450 : 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [hasFill, glowVisible]);

  // Map glowPhase 0..1 → ping-pong opacity/scale (0→max→0) smoothly
  const glowOpacity = glowPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.22, 0.55, 0.22],
  });

  const glowScale = glowPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.98, 1.04, 0.98],
  });

  // Combine phase with visibility (so we can fade the whole effect)
  const combinedGlowOpacity = Animated.multiply(glowOpacity, glowVisible);

  const label = useMemo(() => {
    if (!hasFill) return labelIdle;
    if (isPreheating) return 'Heating...';
    return labelOn;
  }, [hasFill, isPreheating, labelIdle, labelOn]);

  const fg = hasFill ? '#ffffff' : colors.accent;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <View style={{ position: 'relative' }}>
        {/* Outer glow — continuous loop + visibility fade */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -8, right: -8, top: -8, bottom: -8,
            borderRadius: radii.button + 14,
            opacity: combinedGlowOpacity,
            transform: [{ scale: glowScale }],
            ...(Platform.OS === 'android' ? { elevation: 0 } : null),
          }}
        >
          <LinearGradient
            {...gradientProps}
            style={{ flex: 1, borderRadius: radii.button + 14 }}
          />
        </Animated.View>

        <View
          style={{
            height: 56,
            borderRadius: radii.button,
            overflow: 'hidden',
            backgroundColor: colors.surface,
            // Small perf wins for composition
            ...(Platform.OS === 'ios' ? { shouldRasterizeIOS: true } : {}),
            ...(Platform.OS === 'android' ? { renderToHardwareTextureAndroid: true } : {}),
          }}
        >
          {/* Gradient border when heating/active */}
          {hasFill && (
            <View style={{ position: 'absolute', inset: 0 }}>
              <LinearGradient
                {...gradientProps}
                style={{ position: 'absolute', inset: 0, borderRadius: radii.button }}
              />
              <View
                style={{
                  position: 'absolute',
                  inset: 2,
                  backgroundColor: colors.surface,
                  borderRadius: radii.button - 2,
                }}
              />
            </View>
          )}

          {/* Idle outline */}
          {!hasFill && (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                borderWidth: 2,
                borderColor: colors.accent,
                borderRadius: radii.button,
              }}
            />
          )}

          {/* Gradient fill — opacity only (native driver) */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: hasFill ? 2 : 0,
              right: hasFill ? 2 : 0,
              top: hasFill ? 2 : 0,
              bottom: hasFill ? 2 : 0,
              borderRadius: hasFill ? radii.button - 2 : radii.button,
              opacity: fillOpacity,
            }}
          >
            <LinearGradient {...gradientProps} style={{ flex: 1 }} />
          </Animated.View>

          {/* Content */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
            <Power color={fg} size={20} />
            <Text style={{ marginLeft: 8, color: fg, fontWeight: '700', fontSize: 18 }}>{label}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
