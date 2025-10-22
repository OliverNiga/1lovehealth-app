// src/navigation/icons/GradientFlameIcon.tsx

import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Flame } from 'lucide-react-native';
import { gradientProps } from '../../styles/theme';
import MaskedView from '@react-native-masked-view/masked-view';

type Props = {
  size?: number;
  focused?: boolean;
};

/**
 * Gradient flame icon using Lucide's Flame with gradient fill.
 * Shows a subtle downward shadow when focused/active.
 */
export default function GradientFlameIcon({ size = 44, focused = false }: Props) {
  const [g0, g1] = gradientProps.colors;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        // Subtle downward shadow when focused
        ...(focused && {
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        }),
      }}
    >
      <MaskedView
        maskElement={
          <Flame 
            size={size} 
            color="white" 
            fill="white" 
            strokeWidth={0}
          />
        }
        style={{ width: size, height: size }}
      >
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="flameGrad" x1="0" y1="0.5" x2="1" y2="0.5">
              <Stop offset="0%" stopColor={g0} />
              <Stop offset="100%" stopColor={g1} />
            </LinearGradient>
          </Defs>
          <Rect width={size} height={size} fill="url(#flameGrad)" />
        </Svg>
      </MaskedView>
    </View>
  );
}