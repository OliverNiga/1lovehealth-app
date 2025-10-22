// 2-space indentation

import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { nanoid } from 'nanoid/non-secure';

import { colors, spacing, radii } from '../styles/theme';
import { useSaunaController } from '../hooks/useSaunaController';
import { TEMP, TIMER, PEMF } from '../utils/constants';
import type { RootStackParamList } from '../navigation/RootStack';
import type { Schedule, ZoneProfile } from '../utils/storage';
import type { DayOfWeek } from '../controllers/SaunaControllerInterface';
import { generateScheduleName } from '../utils/scheduleHelpers';

import DaySelector from '../components/DaySelector';
import TimePickerButton from '../components/TimePickerButton';
import TemperatureSlider from '../components/TemperatureSlider';
import FeatureControl from '../components/FeatureControl';
import TimerSheet from '../components/TimerSheet';
import PEMFSheet from '../components/PEMFSheet';
import { Sun, Activity, TimerReset } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScheduleEditScreen'>;
type RouteProps = RouteProp<RootStackParamList, 'ScheduleEditScreen'>;

export default function ScheduleEditScreen() {
  const nav = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const scheduleId = route.params?.scheduleId;

  const {
    getSchedules,
    createSchedule,
    updateSchedule,
    getZoneProfiles,
  } = useSaunaController();

  // Form state
  const [day, setDay] = useState<DayOfWeek | null>(null);
  const [time, setTime] = useState('06:00');
  const [upper, setUpper] = useState(TEMP.defaultTargetF);
  const [middle, setMiddle] = useState(TEMP.defaultTargetF);
  const [lower, setLower] = useState(TEMP.defaultTargetF);
  const [pemfLevel, setPemfLevel] = useState(PEMF.defaultLevel);
  const [redLightOn, setRedLightOn] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(TIMER.defaultMinutes);

  // Profile selector
  const [profiles, setProfiles] = useState<ZoneProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>();

  // Sheets
  const [timerOpen, setTimerOpen] = useState(false);
  const [pemfOpen, setPemfOpen] = useState(false);

  // Load existing schedule or profiles
  useEffect(() => {
    const loadData = async () => {
      // Load profiles for selector
      const profileList = await getZoneProfiles();
      setProfiles(profileList);

      // Load existing schedule if editing
      if (scheduleId) {
        const schedules = await getSchedules();
        const schedule = schedules.find((s) => s.id === scheduleId);
        if (schedule) {
          setDay(schedule.day);
          setTime(schedule.timeLocalHHmm);
          setUpper(schedule.upper);
          setMiddle(schedule.middle);
          setLower(schedule.lower);
          setPemfLevel(schedule.pemfLevel);
          setRedLightOn(schedule.redLightOn);
          setTimerMinutes(schedule.timerMinutes);
          setSelectedProfileId(schedule.profileId);
        }
      }
    };

    loadData();
  }, [scheduleId, getSchedules, getZoneProfiles]);

  // Update header title
  useLayoutEffect(() => {
    nav.setOptions({
      title: scheduleId ? 'Edit Schedule' : 'New Schedule',
    });
  }, [nav, scheduleId]);

  const handleSelectDay = useCallback((selectedDay: DayOfWeek) => {
    setDay(selectedDay);
  }, []);

  const handleProfileSelect = useCallback(
    (profileId: string) => {
      if (profileId === '') {
        // Clear profile selection
        setSelectedProfileId(undefined);
        return;
      }

      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        setSelectedProfileId(profileId);
        setUpper(profile.upper);
        setMiddle(profile.middle);
        setLower(profile.lower);
        setRedLightOn(profile.redLightOn);
        setPemfLevel(profile.pemfLevel);
        if (profile.timerMinutes) setTimerMinutes(profile.timerMinutes);
      }
    },
    [profiles]
  );

  const handleSave = useCallback(async () => {
    // Validation
    if (!day) {
      Alert.alert('Required', 'Please select a day');
      return;
    }

    // Auto-generate the schedule name
    const generatedName = generateScheduleName(day, time, timerMinutes);

    const scheduleData: Schedule = {
      id: scheduleId || nanoid(),
      name: generatedName,
      enabled: true,
      day,
      timeLocalHHmm: time,
      upper,
      middle,
      lower,
      redLightOn,
      pemfLevel,
      timerMinutes,
      profileId: selectedProfileId,
      profileName: selectedProfileId ? profiles.find((p) => p.id === selectedProfileId)?.name : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      if (scheduleId) {
        // Update existing
        await updateSchedule(scheduleId, scheduleData);
        Toast.show({
          type: 'success',
          text1: 'Schedule Updated',
        });
      } else {
        // Create new
        await createSchedule(scheduleData);
        Toast.show({
          type: 'success',
          text1: 'Schedule Created',
        });
      }

      nav.goBack();
    } catch (error) {
      console.error('Error saving schedule:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to save schedule',
      });
    }
  }, [
    scheduleId,
    day,
    time,
    upper,
    middle,
    lower,
    redLightOn,
    pemfLevel,
    timerMinutes,
    selectedProfileId,
    profiles,
    createSchedule,
    updateSchedule,
    nav,
  ]);

  const handleCancel = useCallback(() => {
    nav.goBack();
  }, [nav]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.outer,
        }}
      >
        {/* Day of Week */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
            Day
          </Text>
          <DaySelector mode="single" selectedDay={day} onSelectDay={handleSelectDay} />
        </View>

        {/* Start Time */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
            Start Time
          </Text>
          <TimePickerButton value={time} onChange={setTime} />
        </View>

        {/* Profile Selector (Optional) */}
        {profiles.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
              Load from Profile (Optional)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => handleProfileSelect('')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: !selectedProfileId ? colors.accent : colors.divider,
                  backgroundColor: !selectedProfileId ? colors.accent : colors.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: !selectedProfileId ? '#FFFFFF' : colors.textSecondary,
                  }}
                >
                  None
                </Text>
              </Pressable>

              {profiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  onPress={() => handleProfileSelect(profile.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: selectedProfileId === profile.id ? colors.accent : colors.divider,
                    backgroundColor: selectedProfileId === profile.id ? colors.accent : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: selectedProfileId === profile.id ? '#FFFFFF' : colors.textSecondary,
                    }}
                  >
                    {profile.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Temperature Settings */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 }}>
            Temperature
          </Text>
          <TemperatureSlider
            label="Upper"
            value={upper}
            min={TEMP.minF}
            max={TEMP.maxF}
            onChange={setUpper}
          />
          <TemperatureSlider
            label="Middle"
            value={middle}
            min={TEMP.minF}
            max={TEMP.maxF}
            onChange={setMiddle}
          />
          <TemperatureSlider
            label="Lower"
            value={lower}
            min={TEMP.minF}
            max={TEMP.maxLowerF}
            onChange={setLower}
          />
        </View>

        {/* Features */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 }}>
            Features
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
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
              value={`${timerMinutes} min`}
              icon={<TimerReset size={20} />}
              onPress={() => setTimerOpen(true)}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 40 }}>
          <Pressable onPress={handleSave} style={{ width: '60%' }}>
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

          <Pressable onPress={handleCancel} style={{ alignItems: 'center', paddingVertical: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sheets */}
      <TimerSheet
        visible={timerOpen}
        minutes={timerMinutes}
        onClose={() => setTimerOpen(false)}
        onChange={setTimerMinutes}
      />
      <PEMFSheet
        visible={pemfOpen}
        level={pemfLevel}
        onClose={() => setPemfOpen(false)}
        onChange={setPemfLevel}
      />
    </View>
  );
}
