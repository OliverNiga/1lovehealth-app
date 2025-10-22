// 2-space indentation

import React from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradientProps } from '../styles/theme';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export default function TemperatureSlider({ label, value, min, max, onChange }: Props) {
  const [sliderWidth, setSliderWidth] = React.useState(0);

  const handleTrackPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    if (sliderWidth > 0) {
      const percentage = locationX / sliderWidth;
      const newValue = min + percentage * (max - min);
      const clampedValue = Math.max(min, Math.min(max, Math.round(newValue)));
      onChange(clampedValue);
    }
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setSliderWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{Math.round(value)}°F</Text>
      </View>

      <View style={styles.sliderContainer} onLayout={handleLayout}>
        {/* Background track - tappable */}
        <Pressable style={styles.backgroundTrack} onPress={handleTrackPress} />

        {/* Gradient fill */}
        <Pressable style={styles.gradientTrack} onPress={handleTrackPress}>
          <LinearGradient
            colors={['#8F48C9', '#20C4DF']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[
              styles.gradientFill,
              {
                width: `${((value - min) / (max - min)) * 100}%`,
              },
            ]}
          />
        </Pressable>

        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          value={value}
          onValueChange={onChange}
          step={1}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="#20C4DF"
        />
      </View>

      <View style={styles.rangeLabels}>
        <Text style={styles.rangeText}>{min}°</Text>
        <Text style={styles.rangeText}>{max}°</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sliderContainer: {
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  backgroundTrack: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
  },
  gradientTrack: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  gradientFill: {
    height: '100%',
    borderRadius: 2,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
    paddingHorizontal: 2,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
