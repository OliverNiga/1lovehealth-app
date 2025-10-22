// 2-space indentation

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, gradientProps } from '../styles/theme';

type Props = {
  visible: boolean;
  minutes: number | null;
  onClose(): void;
  onChange(m: number): void; // live update while scrolling
};

const MIN = 5;
const MAX = 60;

export default function TimerSheet({ visible, minutes, onClose, onChange }: Props) {
  // Only derive from prop when (re)opening
  const initial = useMemo(
    () => Math.max(MIN, Math.min(MAX, minutes ?? 45)),
    // NOTE: We don't want minutes changes to affect the sheet while visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible]
  );

  const [selected, setSelected] = useState<number>(initial);

  // open/close animations
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // debounce outward onChange to avoid flicker from rapid parent re-renders
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
      // Sync from prop only on open
      setSelected(initial);

      slideAnim.setValue(300);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      // Clean up any pending debounce when closing
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    }
  }, [visible, initial, slideAnim, fadeAnim]);

  const handleValueChange = (v: number) => {
    const clamped = Math.max(MIN, Math.min(MAX, v));
    setSelected(clamped);
    emitChange(clamped); // debounced to prevent flicker
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
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Session Timer</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Wheel (same UI iOS & Android) */}
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
                height: 216, // native-like height
                backgroundColor: '#FFF',
              }}
              itemStyle={{
                color: '#111827',
                fontSize: 28,
                fontWeight: '800',
              }}
            >
              {Array.from({ length: MAX - MIN + 1 }, (_, i) => i + MIN).map((v) => (
                <Picker.Item key={v} label={`${v} min`} value={v} />
              ))}
            </Picker>

            {/* Removed gray selection band to eliminate highlight */}
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
