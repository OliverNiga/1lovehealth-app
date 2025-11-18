// src/components/PEMFSheet.tsx
// 2-space indentation

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, gradientProps } from '../styles/theme';

type Props = {
  visible: boolean;
  level: number;                 // 0..30 (0 = OFF)
  onClose(): void;
  onChange(level: number): void; // live update while scrolling
};

const MIN = 0;
const MAX = 30;

export default function PEMFSheet({ visible, level, onClose, onChange }: Props) {
  // Only sync from prop when the sheet opens (prevents mid-scroll thrash).
  const initial = useMemo(
    () => Math.max(MIN, Math.min(MAX, level ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible]
  );

  const [selected, setSelected] = useState<number>(initial);

  // animations
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // debounce outward changes to avoid flicker when parent re-renders
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emitChange = (val: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(val);
      debounceRef.current = null;
    }, 80);
  };

  useEffect(() => {
    if (visible) {
      setSelected(initial); // sync once on open

      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [visible, initial, slideAnim, fadeAnim]);

  const handleValueChange = (v: number) => {
    const clamped = Math.max(MIN, Math.min(MAX, v));
    setSelected(clamped);
    emitChange(clamped);
  };

  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end',
          opacity: fadeAnim,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <Animated.View
          style={{
            backgroundColor: colors.surface,
            padding: 20,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>PEMF Level</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* PEMF Frequency Chart */}
          <View style={{ marginTop: 16, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 }}>
            {/* Header rows */}
            <View style={{ marginBottom: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                Lower Frequencies = Relaxing
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                Higher Frequencies = Stimulating
              </Text>
            </View>

            {/* Frequency ranges */}
            <View style={{ gap: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#3B82F6', textAlign: 'center' }}>
                <Text style={{ fontWeight: '600' }}>Delta (1-4 Hz):</Text> Relaxation, Stress Relief, Sleep
              </Text>

              <Text style={{ fontSize: 13, color: '#10B981', textAlign: 'center' }}>
                <Text style={{ fontWeight: '600' }}>Theta (4-8 Hz):</Text> Relaxation, Clarity, Creativity
              </Text>

              <Text style={{ fontSize: 13, color: '#F59E0B', textAlign: 'center' }}>
                <Text style={{ fontWeight: '600' }}>Alpha (8-12 Hz):</Text> Relaxation, Focus, Mindfulness
              </Text>

              <Text style={{ fontSize: 13, color: '#EF4444', textAlign: 'center' }}>
                <Text style={{ fontWeight: '600' }}>Beta (12-30 Hz):</Text> Alertness, Cognitive Function
              </Text>
            </View>
          </View>

          {/* Wheel (no gray center highlight) */}
          <View
            style={{
              width: '100%',
              backgroundColor: '#FFF',
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
              marginTop: 16,
            }}
          >
            <Picker
              selectedValue={selected}
              onValueChange={(v) => handleValueChange(v as number)}
              style={{
                width: '100%',
                height: 216,
                backgroundColor: '#FFF',
              }}
              itemStyle={{
                color: '#111827',
                fontSize: 28,
                fontWeight: '800',
              }}
            >
              {Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN).map((v) => (
                <Picker.Item key={v} label={v === 0 ? 'Off' : `${v} hz`} value={v} />
              ))}
            </Picker>
          </View>

          {/* Done */}
          <Pressable onPress={onClose} style={{ marginTop: 16 }}>
            {({ pressed }) => (
              <View
                style={{
                  borderRadius: 24,
                  overflow: 'hidden',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }}
              >
                <LinearGradient {...gradientProps} style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Done</Text>
                </LinearGradient>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
