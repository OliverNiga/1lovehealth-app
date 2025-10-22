// 2-space indentation

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sun, Activity, TimerReset } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { colors, spacing, radii, typography } from '../styles/theme';
import { TEMP } from '../utils/constants';
import { useSaunaController } from '../hooks/useSaunaController';
import type { ZoneProfile } from '../utils/storage';
import TemperatureSlider from '../components/TemperatureSlider';
import FeatureControl from '../components/FeatureControl';
import TimerSheet from '../components/TimerSheet';
import PEMFSheet from '../components/PEMFSheet';

type RouteParams = { profileId: string };

export default function ProfileEditScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as RouteParams;

  const { getZoneProfiles, updateZoneProfile } = useSaunaController();

  const [initial, setInitial] = useState<ZoneProfile | null>(null);
  const [name, setName] = useState('');
  const [upper, setUpper] = useState(0);
  const [middle, setMiddle] = useState(0);
  const [lower, setLower] = useState(0);
  const [pemfLevel, setPemfLevel] = useState(0);
  const [redLightOn, setRedLightOn] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [pemfOpen, setPemfOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await getZoneProfiles();
      const p = list.find((x) => x.id === params.profileId) || null;
      setInitial(p);
      if (p) {
        setName(p.name);
        setUpper(p.upper);
        setMiddle(p.middle);
        setLower(p.lower);
        setPemfLevel(p.pemfLevel);
        setRedLightOn(p.redLightOn);
        setTimerMinutes(p.timerMinutes);
      }
    })();
  }, [getZoneProfiles, params.profileId]);

  const clamp = (v: number, zone?: 'Upper' | 'Middle' | 'Lower') => {
    const max = zone === 'Lower' ? TEMP.maxLowerF : TEMP.maxF;
    return Math.max(TEMP.minF, Math.min(max, Math.round(v)));
  };

  const onSave = useCallback(async () => {
    if (!initial) return;
    const updated: ZoneProfile = {
      ...initial,
      name: name.trim() || initial.name,
      upper: clamp(Number(upper), 'Upper'),
      middle: clamp(Number(middle), 'Middle'),
      lower: clamp(Number(lower), 'Lower'),
      pemfLevel: Math.max(0, Math.round(Number(pemfLevel))),
      redLightOn,
      timerMinutes:
        timerMinutes == null || Number.isNaN(Number(timerMinutes))
          ? null
          : Math.max(5, Math.min(60, Math.round(Number(timerMinutes)))),
    };
    await updateZoneProfile(updated);
    Toast.show({ type: 'success', text1: 'Profile updated', text2: `"${updated.name}"` });
    nav.goBack();
  }, [initial, name, upper, middle, lower, pemfLevel, redLightOn, timerMinutes, updateZoneProfile, nav]);

  if (!initial) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.outer }}>
        <Text style={{ ...typography.caption }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing.outer }}>
        {/* Name Input */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.divider,
            borderRadius: radii.card,
            padding: spacing.outer,
            marginBottom: 16,
          }}
        >
          <Text style={{ ...typography.caption, marginBottom: 6 }}>Profile Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={{
              borderWidth: 1,
              borderColor: colors.divider,
              borderRadius: radii.chip,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: colors.textPrimary,
              fontSize: 16,
            }}
            placeholder="e.g., Evening Session"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Temperature Sliders */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.divider,
            borderRadius: radii.card,
            padding: spacing.outer,
            marginBottom: 16,
          }}
        >
          <Text style={{ ...typography.h2, marginBottom: 16, textAlign: 'center' }}>Zone Temperatures</Text>

          <TemperatureSlider
            label="Upper Zone"
            value={upper}
            min={TEMP.minF}
            max={TEMP.maxF}
            onChange={setUpper}
          />

          <TemperatureSlider
            label="Middle Zone"
            value={middle}
            min={TEMP.minF}
            max={TEMP.maxF}
            onChange={setMiddle}
          />

          <TemperatureSlider
            label="Lower Zone"
            value={lower}
            min={TEMP.minF}
            max={TEMP.maxLowerF}
            onChange={setLower}
          />
        </View>

        {/* Feature Controls */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <FeatureControl
            title="Red Light"
            value={redLightOn ? 'ON' : 'OFF'}
            icon={<Sun size={20} />}
            onPress={() => setRedLightOn(!redLightOn)}
            variant="redlight"
            isActive={redLightOn}
          />
          <FeatureControl
            title="PEMF"
            value={pemfLevel === 0 ? 'Off' : `${pemfLevel} hz`}
            icon={<Activity size={20} />}
            onPress={() => setPemfOpen(true)}
            variant="pemf"
          />
          <FeatureControl
            title="Timer"
            value={timerMinutes ? `${timerMinutes} min` : 'Off'}
            icon={<TimerReset size={20} />}
            onPress={() => setTimerOpen(true)}
          />
        </View>

        {/* Action Buttons */}
        <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 20 }}>
          <Pressable onPress={onSave} style={{ width: '60%' }}>
            <LinearGradient
              colors={['#20C4DF', '#8F48C9']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 24,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.button,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Save</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => nav.goBack()} style={{ alignItems: 'center', paddingVertical: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </View>
      </View>

      {/* Modals */}
      <TimerSheet
        visible={timerOpen}
        minutes={timerMinutes ?? 45}
        onClose={() => setTimerOpen(false)}
        onChange={(m) => setTimerMinutes(m)}
      />

      <PEMFSheet
        visible={pemfOpen}
        level={pemfLevel}
        onClose={() => setPemfOpen(false)}
        onChange={(level) => setPemfLevel(level)}
      />
    </ScrollView>
  );
}
