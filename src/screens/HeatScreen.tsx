// 2-space indentation

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useSaunaController } from '../hooks/useSaunaController';
import ControlButton from '../components/ControlButton';
import FeatureControl from '../components/FeatureControl';
import ZoneRow from '../components/ZoneRow';
import { Sun, Activity, TimerReset, Menu, Wifi } from 'lucide-react-native';
import { colors } from '../styles/theme';
import { TEMP } from '../utils/constants';
import TimerSheet from '../components/TimerSheet';
import PEMFSheet from '../components/PEMFSheet';

export default function HeatScreen() {
  const nav = useNavigation();
  const c = useSaunaController();
  const [timerOpen, setTimerOpen] = useState(false);
  const [pemfOpen, setPemfOpen] = useState(false);

  // Remove the refresh-on-focus loop; live subscriptions already update temps

  const onPressPrimary = useCallback(() => {
    if (c.isOn) c.stopSauna();
    else c.startSauna();
  }, [c]);

  const inc = (v: number, zone?: 'Upper' | 'Middle' | 'Lower') => {
    const max = zone === 'Lower' ? TEMP.maxLowerF : TEMP.maxF;
    return Math.min(max, Math.round(v + 1));
  };
  const dec = (v: number) => Math.max(TEMP.minF, Math.round(v - 1));

  const CARD_MIN_HEIGHT = 500;
  const CARD_TOP_PAD = 56;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View className="px-5 pt-2 pb-1">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: 50, height: 50 * (1128/1200) }}
            resizeMode="contain"
          />

          <Pressable
            style={{ padding: 8, marginTop: -4 }}
            onPress={() => {
              // TODO: open WiFi sheet / pairing later
            }}
            accessibilityLabel="WiFi"
          >
            <Wifi size={24} color={colors.accent} />
          </Pressable>
        </View>
      </View>

      {/* CARD (Zones-only view) */}
      <View
        className="mx-4 mt-2 rounded-card p-4"
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.divider,
          position: 'relative',
          paddingTop: CARD_TOP_PAD,
          minHeight: CARD_MIN_HEIGHT,
        }}
      >
        {/* Status text */}
        <View style={{ position: 'absolute', left: 16, top: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>
            Status: {c.isOn ? (c.isPreheating ? 'Heating Up' : 'Session Active') : 'Off'}
          </Text>
        </View>

        {/* Kebab */}
        <Pressable
          onPress={() => {
            // If you use a RootStack parent for profiles:
            nav.getParent()?.navigate('ProfilesScreen' as never);
          }}
          style={{ position: 'absolute', right: 12, top: 12, padding: 12 }}
          accessibilityLabel="Menu"
        >
          <Menu size={24} color={colors.textSecondary} />
        </Pressable>

        {/* Zones + Start/Stop */}
        <View style={{ flexGrow: 1, justifyContent: 'space-between' }}>
          <View>
            <View style={{ marginTop: 20 }}>
              <ZoneRow
                title="Upper"
                current={c.zoneCurrents.Upper}
                target={c.zoneTargets.Upper}
                onInc={() => c.setUpperTargetTemp(inc(c.zoneTargets.Upper, 'Upper'))}
                onDec={() => c.setUpperTargetTemp(dec(c.zoneTargets.Upper))}
              />
            </View>
            <ZoneRow
              title="Middle"
              current={c.zoneCurrents.Middle}
              target={c.zoneTargets.Middle}
              onInc={() => c.setMiddleTargetTemp(inc(c.zoneTargets.Middle, 'Middle'))}
              onDec={() => c.setMiddleTargetTemp(dec(c.zoneTargets.Middle))}
            />
            <ZoneRow
              title="Lower"
              current={c.zoneCurrents.Lower}
              target={c.zoneTargets.Lower}
              onInc={() => c.setLowerTargetTemp(inc(c.zoneTargets.Lower, 'Lower'))}
              onDec={() => c.setLowerTargetTemp(dec(c.zoneTargets.Lower))}
            />
          </View>

          <View style={{ marginTop: 10 }}>
            <View className="self-center w-11/12">
              <ControlButton
                isOn={c.isOn}
                isPreheating={c.isPreheating}
                progress={c.progress}
                onPress={onPressPrimary}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Feature row */}
      <View className="flex-row px-3 mt-3">
        <FeatureControl
          title="Red Light"
          value={c.redLightOn ? 'ON' : 'OFF'}
          icon={<Sun size={20} />}
          onPress={() => c.setRedLight(!c.redLightOn)}
          variant="redlight"
          isActive={c.redLightOn}
        />
        <FeatureControl
          title="PEMF"
          value={c.pemfLevel === 0 ? 'Off' : `${c.pemfLevel} hz`}
          icon={<Activity size={20} />}
          onPress={() => setPemfOpen(true)}
          variant="pemf"
        />
        <FeatureControl
          title="Timer"
          value={c.timerMinutes ? `${c.timerMinutes} min` : 'Off'}
          icon={<TimerReset size={20} />}
          onPress={() => setTimerOpen(true)}
        />

        {/* Sheets */}
        <TimerSheet
          visible={timerOpen}
          minutes={c.timerMinutes ?? 45}
          onClose={() => setTimerOpen(false)}
          onChange={(m) => c.setSessionTimer(m)}
        />
        <PEMFSheet
          visible={pemfOpen}
          level={c.pemfLevel}
          onClose={() => setPemfOpen(false)}
          onChange={(level) => c.setPEMFLevel(level)}
        />
      </View>
    </SafeAreaView>
  );
}
