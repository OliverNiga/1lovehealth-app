import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { colors, gradientProps } from '../styles/theme';

type Props = {
  current: number;
  target: number;
  /** 0..1 estimate toward target (used while heating) */
  progress: number;
  size?: number;
  fontScale?: number;
};

export default function TemperatureCircle({
  current,
  target,
  progress,
  size = 280,
  fontScale = 1,
}: Props) {
  const STROKE = 16;
  const R = (size - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;

  // Clamp and “lock full” once target reached (a tiny tolerance helps)
  const displayedProgress = useMemo(() => {
    if (current >= target - 0.5) return 1;
    return Math.max(0, Math.min(1, progress));
  }, [current, target, progress]);

  // Unique gradient id per instance (prevents clashes when multiple circles mount)
  const gradId = useRef(`ringGrad_${Math.random().toString(36).slice(2, 9)}`).current;

  // Animate dashoffset from CIRC → 0 (clockwise, starting at top via rotation -90)
  const anim = useRef(new Animated.Value(displayedProgress)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: displayedProgress,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // strokeDashoffset is not supported by native driver
    }).start();
  }, [displayedProgress, anim]);

  const dashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRC, 0],
  });

  const [g0, g1] = gradientProps.colors;
  const currentText = `${Math.round(current)}°`;
  const targetText = `Target ${Math.round(target)}°`;

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '90deg' }] }} // <-- rotate SVG 90deg
      >
        <Defs>
          <SvgGrad id={gradId} x1="0" y1="0.5" x2="1" y2="0.5">
            <Stop offset="0%" stopColor={g0} />
            <Stop offset="100%" stopColor={g1} />
          </SvgGrad>
        </Defs>

        {/* background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          stroke={colors.divider}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />

        {/* progress */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={R}
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRC}, ${CIRC}`}
          strokeDashoffset={dashoffset as unknown as number}
          transform={[{ rotate: '270deg' }]}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>

      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 72 * fontScale,
          lineHeight: 80 * fontScale,
          fontWeight: '800',
        }}
      >
        {currentText}
      </Text>

      <View
        className="px-3 py-1 rounded-full mt-2"
        style={{ borderWidth: 1, borderColor: g0 }}
      >
        <Text style={{ color: g0, fontWeight: '700' }}>{targetText}</Text>
      </View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
