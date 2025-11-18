// 2-space indentation

import { storage, loadNotificationSettings } from '../utils/storage';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { MockSaunaController as Mock } from '../controllers/MockSaunaController';
import type {
  SaunaSnapshot,
  TemperatureChangeEvent,
  TargetTemperatureChangeEvent,
  StateChangeEvent,
  TimerUpdateEvent,
  ConnectionChangeEvent,
  RedLightChangeEvent,
  PEMFChangeEvent,
  SessionTimerChangeEvent,
} from '../controllers/SaunaControllerInterface';
import { TEMP, type Zone } from '../utils/constants';
import { scheduleInSeconds, cancelNotification } from '../utils/notifications';
import { loadProfiles, saveProfiles, type ZoneProfile, loadSchedules, saveSchedules, type Schedule } from '../utils/storage';
import { nanoid } from 'nanoid/non-secure';
import * as ScheduleManager from '../utils/scheduleManager';

const PERSIST_KEY = 'sauna:lastSnapshot:v1';

type PersistShape = {
  targetTempF: number; // kept for backward compat (we re-derive it)
  zoneTargets: SaunaSnapshot['zoneTargets'];
  redLightOn: boolean;
  pemfLevel: number;
  timerMinutes: number | null;
};

type ControllerAPI = {
  // snapshot-ish state for easy binding
  state: SaunaSnapshot['state'];
  connection: SaunaSnapshot['connection'];
  targetTempF: number;          // derived from zoneTargets
  currentTempF: number;         // derived from zoneCurrents
  zoneTargets: SaunaSnapshot['zoneTargets'];
  zoneCurrents: SaunaSnapshot['zoneCurrents'];
  redLightOn: boolean;
  pemfLevel: number;
  timerMinutes: number | null;
  remainingSeconds: number;
  lastError?: string;

  // derived
  progress: number;            // 0..1 based on averages of zones
  isOn: boolean;               // HEATING or ACTIVE
  isPreheating: boolean;       // HEATING
  isReady: boolean;            // ACTIVE and within 1°F of avg target
  canControl: boolean;         // connection == CONNECTED

  // actions
  startSauna(): Promise<void>;
  stopSauna(): Promise<void>;
  emergencyShutdown(): Promise<void>;

  setZoneTarget(zone: Zone, t: number): Promise<void>;
  setUpperTargetTemp(t: number): Promise<void>;
  setMiddleTargetTemp(t: number): Promise<void>;
  setLowerTargetTemp(t: number): Promise<void>;

  setRedLight(on: boolean): Promise<void>;
  setPEMFLevel(level: number): Promise<void>;
  setSessionTimer(mins: number | null): Promise<void>;

  // convenience getters
  refreshSnapshot(): Promise<void>;

  // profile management
  saveZoneProfile(name: string): Promise<void>;
  getZoneProfiles(): Promise<ZoneProfile[]>;
  loadZoneProfile(id: string): Promise<void>;
  createZoneProfile(data: Omit<ZoneProfile, 'id' | 'createdAt'>): Promise<void>;
  renameZoneProfile(id: string, name: string): Promise<void>;
  deleteZoneProfile(id: string): Promise<void>;
  updateZoneProfile(updated: ZoneProfile): Promise<void>;

  // schedule management
  getSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: Schedule): Promise<Schedule>;
  updateSchedule(id: string, updates: Partial<Schedule>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;
};

export function useSaunaController(): ControllerAPI {
  // core state
  const [state, setState] = useState<SaunaSnapshot['state']>('OFF');
  const [connection, setConnection] = useState<SaunaSnapshot['connection']>('CONNECTED');

  // globals kept only as DERIVED values for compatibility
  const [targetTempF, setTargetTempF] = useState<number>(TEMP.defaultTargetF);
  const [currentTempF, setCurrentTempF] = useState<number>(TEMP.ambientDefaultF);

  const [zoneTargets, setZoneTargets] = useState<SaunaSnapshot['zoneTargets']>({
    Upper: TEMP.defaultTargetF,
    Middle: TEMP.defaultTargetF,
    Lower: TEMP.defaultTargetF,
  });
  const [zoneCurrents, setZoneCurrents] = useState<SaunaSnapshot['zoneCurrents']>({
    Upper: TEMP.ambientDefaultF,
    Middle: TEMP.ambientDefaultF,
    Lower: TEMP.ambientDefaultF,
  });

  const [redLightOn, setRedLightOn] = useState<boolean>(false);
  const [pemfLevel, setPemfLevel] = useState<number>(15);
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  // notifications + hydration
  const readyNotifId = useRef<string | undefined>(undefined);
  const warnNotifId = useRef<string | undefined>(undefined);
  const endNotifId = useRef<string | undefined>(undefined);
  const hydratedRef = useRef(false);

  const clampTemp = (t: number, zone?: Zone) => {
    const max = zone === 'Lower' ? TEMP.maxLowerF : TEMP.maxF;
    return Math.max(TEMP.minF, Math.min(max, Math.round(t)));
  };
  const avg3 = (a: number, b: number, c: number) => (a + b + c) / 3;
  const computeTargetAvg = (zt: SaunaSnapshot['zoneTargets']) => avg3(zt.Upper, zt.Middle, zt.Lower);
  const computeCurrentAvg = (zc: SaunaSnapshot['zoneCurrents']) => avg3(zc.Upper, zc.Middle, zc.Lower);

  // Initial setup: hydrate Mock + apply persisted values, then subscribe
  useEffect(() => {
    console.log('🔄 useSaunaController INITIALIZING/RE-INITIALIZING');
    let off1 = () => {};
    let off2 = () => {};
    let off3 = () => {};
    let off4 = () => {};
    let off5 = () => {};
    let off6 = () => {};
    let off7 = () => {};
    let off8 = () => {};

    (async () => {
      // Snapshot from mock
      const snap = await Mock.getSnapshot();
      console.log('📸 Mock snapshot on init:', JSON.stringify(snap.zoneTargets));

      // Read persisted values
      const saved = await storage.get<PersistShape | null>(PERSIST_KEY, null);
      console.log('💾 Persisted values from storage:', saved ? JSON.stringify(saved.zoneTargets) : 'null');

      if (saved) {
        console.log('✅ Applying persisted values to Mock');
        // Apply persisted values to Mock FIRST (per-zone only)
        await Promise.all([
          Mock.setUpperTargetTemp(saved.zoneTargets.Upper),
          Mock.setMiddleTargetTemp(saved.zoneTargets.Middle),
          Mock.setLowerTargetTemp(saved.zoneTargets.Lower),
          Mock.setRedLight(saved.redLightOn),
          Mock.setPEMFLevel(saved.pemfLevel),
          Mock.setSessionTimer(saved.timerMinutes),
        ]);

        // Re-read snapshot so UI reflects controller truth
        const after = await Mock.getSnapshot();

        // Set UI state from controller and DERIVE globals
        setState(after.state);
        setConnection(after.connection);
        setZoneTargets(after.zoneTargets);
        setZoneCurrents(after.zoneCurrents);
        setRedLightOn(after.redLightOn);
        setPemfLevel(after.pemfLevel);
        setTimerMinutes(after.timerMinutes);
        setRemainingSeconds(after.remainingSeconds);

        setTargetTempF(computeTargetAvg(after.zoneTargets));
        setCurrentTempF(computeCurrentAvg(after.zoneCurrents));
      } else {
        // Use mock defaults; derive globals
        setState(snap.state);
        setConnection(snap.connection);
        setZoneTargets(snap.zoneTargets);
        setZoneCurrents(snap.zoneCurrents);
        setRedLightOn(snap.redLightOn);
        setPemfLevel(snap.pemfLevel);
        setTimerMinutes(snap.timerMinutes);
        setRemainingSeconds(snap.remainingSeconds);

        setTargetTempF(computeTargetAvg(snap.zoneTargets));
        setCurrentTempF(computeCurrentAvg(snap.zoneCurrents));
      }

      // Subscriptions (emit every tick); derive current aggregate from zones
      off1 = Mock.onTemperatureChange((e: TemperatureChangeEvent) => {
        setZoneCurrents(e.zoneCurrents);
        setCurrentTempF(computeCurrentAvg(e.zoneCurrents));
      });
      off2 = Mock.onTargetTemperatureChange((e: TargetTemperatureChangeEvent) => {
        console.log('🎯 Target temperature changed event:', JSON.stringify(e.zoneTargets));
        setZoneTargets(e.zoneTargets);
        setTargetTempF(e.targetTempF);
      });
      off3 = Mock.onStateChange((e: StateChangeEvent) => {
        setState(e.state);
      });
      off4 = Mock.onTimerUpdate((e: TimerUpdateEvent) => {
        setRemainingSeconds(e.remainingSeconds);
      });
      off5 = Mock.onConnectionStatusChange((e: ConnectionChangeEvent) => {
        setConnection(e.connection);
      });
      off6 = Mock.onRedLightChange((e: RedLightChangeEvent) => {
        console.log('💡 Red light changed event:', e.redLightOn);
        setRedLightOn(e.redLightOn);
      });
      off7 = Mock.onPEMFChange((e: PEMFChangeEvent) => {
        console.log('⚡ PEMF changed event:', e.pemfLevel);
        setPemfLevel(e.pemfLevel);
      });
      off8 = Mock.onSessionTimerChange((e: SessionTimerChangeEvent) => {
        console.log('⏱️ Session timer changed event:', e.timerMinutes);
        setTimerMinutes(e.timerMinutes);
      });

      hydratedRef.current = true;
    })();

    return () => {
      off1?.();
      off2?.();
      off3?.();
      off4?.();
      off5?.();
      off6?.();
      off7?.();
      off8?.();
    };
  }, []);

  // Persist values when changed (after hydration)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const payload: PersistShape = {
      targetTempF: computeTargetAvg(zoneTargets), // derived
      zoneTargets,
      redLightOn,
      pemfLevel,
      timerMinutes,
    };
    storage.set(PERSIST_KEY, payload);
  }, [zoneTargets, redLightOn, pemfLevel, timerMinutes]);

  // ---- derived values
  const progress = useMemo(() => {
    const tAvg = computeTargetAvg(zoneTargets);
    const cAvg = computeCurrentAvg(zoneCurrents);
    const denom = Math.max(1, tAvg - TEMP.ambientDefaultF);
    const num = Math.max(0, cAvg - TEMP.ambientDefaultF);
    return Math.max(0, Math.min(1, num / denom));
  }, [zoneTargets, zoneCurrents]);

  const isOn = state === 'HEATING' || state === 'ACTIVE';
  const isPreheating = state === 'HEATING';
  const isReady = state === 'ACTIVE' && Math.abs(currentTempF - targetTempF) <= 1;
  const canControl = connection === 'CONNECTED';

  // ---- safety logic
  useEffect(() => {
    const over =
      currentTempF > TEMP.maxF ||
      zoneCurrents.Upper > TEMP.maxF ||
      zoneCurrents.Middle > TEMP.maxF ||
      zoneCurrents.Lower > TEMP.maxF;

    if (over && (state === 'HEATING' || state === 'ACTIVE')) {
      Mock.stopSauna().catch(() => {});
      setLastError(`Over-temperature detected (> ${TEMP.maxF}°F). Sauna stopped for safety.`);
    }
  }, [currentTempF, zoneCurrents, state]);

  // ---- notifications logic
  useEffect(() => {
    if (!isOn) return;

    // Find the highest target temperature across all zones
    const highestTarget = Math.max(zoneTargets.Upper, zoneTargets.Middle, zoneTargets.Lower);
    // Find the highest current temperature across all zones
    const highestCurrent = Math.max(zoneCurrents.Upper, zoneCurrents.Middle, zoneCurrents.Lower);

    // Check if temperature threshold is reached AND controller says we should fire
    if (highestCurrent >= highestTarget - 0.5 && Mock.shouldFireReadyNotification(highestTarget)) {
      // CRITICAL: Mark notification as fired in the singleton controller
      Mock.markReadyNotificationFired(highestTarget);

      // Cancel any existing notification
      if (readyNotifId.current) {
        cancelNotification(readyNotifId.current).catch(() => {});
        readyNotifId.current = undefined;
      }

      // Check notification settings before firing
      loadNotificationSettings().then((settings) => {
        if (!settings.enabled || !settings.saunaReady) return;

        scheduleInSeconds(1, 'Sauna Ready', `Reached ${Math.round(highestTarget)}°`).then(
          (id) => {
            readyNotifId.current = id;
          },
          () => {}
        );
      });
    }
  }, [isOn, zoneCurrents, zoneTargets]);

  useEffect(() => {
    if (warnNotifId.current) cancelNotification(warnNotifId.current).catch(() => {});
    if (endNotifId.current) cancelNotification(endNotifId.current).catch(() => {});
    warnNotifId.current = undefined;
    endNotifId.current = undefined;

    if (timerMinutes && timerMinutes > 0) {
      loadNotificationSettings().then((settings) => {
        if (!settings.enabled) return;

        const total = timerMinutes * 60;
        const warn = total - 300; // 5 min before end

        // Schedule timer warning if enabled
        if (warn > 0 && settings.timerWarnings) {
          scheduleInSeconds(warn, '5 Minutes Left', 'Extend if you like').then(
            (id) => (warnNotifId.current = id),
            () => {}
          );
        }

        // Schedule session complete if enabled
        if (settings.sessionComplete) {
          scheduleInSeconds(total, 'Session Finished', 'Sauna turned off').then(
            (id) => (endNotifId.current = id),
            () => {}
          );
        }
      });
    }
  }, [timerMinutes]);

  useEffect(() => {
    if (!isOn) {
      // Note: notification tracking is now handled in MockSaunaController.stopSauna()
      if (readyNotifId.current) cancelNotification(readyNotifId.current).catch(() => {});
      if (warnNotifId.current) cancelNotification(warnNotifId.current).catch(() => {});
      if (endNotifId.current) cancelNotification(endNotifId.current).catch(() => {});
      readyNotifId.current = undefined;
      warnNotifId.current = undefined;
      endNotifId.current = undefined;
    }
  }, [isOn]);

  // ---- actions
  const startSauna = useCallback(async () => {
    // Note: notification tracking reset is now handled in MockSaunaController.startSauna()
    if (readyNotifId.current) cancelNotification(readyNotifId.current).catch(() => {});
    await Mock.startSauna();
  }, []);

  const stopSauna = useCallback(async () => {
    await Mock.stopSauna();
  }, []);

  const emergencyShutdown = useCallback(async () => {
    await Mock.emergencyShutdown();
  }, []);

  const setZoneTarget = useCallback(async (zone: Zone, t: number) => {
    const v = clampTemp(t);
    await Mock.setZoneTarget(zone, v);
    setZoneTargets((prev) => {
      const next = { ...prev, [zone]: v };
      setTargetTempF(computeTargetAvg(next));
      return next;
    });
  }, []);

  const setUpperTargetTemp = useCallback(async (t: number) => {
    const v = clampTemp(t);
    await Mock.setUpperTargetTemp(v);
    setZoneTargets((p) => {
      const next = { ...p, Upper: v };
      setTargetTempF(computeTargetAvg(next));
      return next;
    });
  }, []);

  const setMiddleTargetTemp = useCallback(async (t: number) => {
    const v = clampTemp(t);
    await Mock.setMiddleTargetTemp(v);
    setZoneTargets((p) => {
      const next = { ...p, Middle: v };
      setTargetTempF(computeTargetAvg(next));
      return next;
    });
  }, []);

  const setLowerTargetTemp = useCallback(async (t: number) => {
    const v = clampTemp(t, 'Lower');
    await Mock.setLowerTargetTemp(v);
    setZoneTargets((p) => {
      const next = { ...p, Lower: v };
      setTargetTempF(computeTargetAvg(next));
      return next;
    });
  }, []);

  const setRedLight = useCallback(async (on: boolean) => {
    await Mock.setRedLight(on);
    setRedLightOn(on);
  }, []);

  const setPEMFLevel = useCallback(async (level: number) => {
    await Mock.setPEMFLevel(level);
    setPemfLevel(level);
  }, []);

  const setSessionTimer = useCallback(async (mins: number | null) => {
    await Mock.setSessionTimer(mins);
    setTimerMinutes(mins);
  }, []);

  const refreshSnapshot = useCallback(async () => {
    const s = await Mock.getSnapshot();
    setState(s.state);
    setConnection(s.connection);
    setZoneTargets(s.zoneTargets);
    setZoneCurrents(s.zoneCurrents);
    setRedLightOn(s.redLightOn);
    setPemfLevel(s.pemfLevel);
    setTimerMinutes(s.timerMinutes);
    setRemainingSeconds(s.remainingSeconds);
    setLastError(s.lastError);

    // DERIVE globals
    setTargetTempF(computeTargetAvg(s.zoneTargets));
    setCurrentTempF(computeCurrentAvg(s.zoneCurrents));
  }, []);

  // ---- profiles
  const saveZoneProfile = useCallback(async (name: string) => {
    const list = await loadProfiles();
    const profile: ZoneProfile = {
      id: nanoid(),
      name,
      createdAt: Date.now(),
      upper: zoneTargets.Upper,
      middle: zoneTargets.Middle,
      lower: zoneTargets.Lower,
      redLightOn,
      pemfLevel,
      timerMinutes,
    };
    await saveProfiles([profile, ...list].slice(0, 20));
  }, [zoneTargets, redLightOn, pemfLevel, timerMinutes]);

  const getZoneProfiles = useCallback(async () => {
    return loadProfiles();
  }, []);

  const loadZoneProfile = useCallback(async (id: string) => {
    console.log('=== LOAD ZONE PROFILE START ===');
    console.log('Profile ID:', id);

    const list = await loadProfiles();
    console.log('Total profiles loaded:', list.length);

    const p = list.find((x) => x.id === id);
    if (!p) {
      console.log('ERROR: Profile not found!');
      return;
    }

    console.log('Profile found:', p.name);
    console.log('Profile temps - Upper:', p.upper, 'Middle:', p.middle, 'Lower:', p.lower);

    // Clamp all temperatures
    const upperClamped = clampTemp(p.upper, 'Upper');
    const middleClamped = clampTemp(p.middle, 'Middle');
    const lowerClamped = clampTemp(p.lower, 'Lower');

    console.log('Clamped temps - Upper:', upperClamped, 'Middle:', middleClamped, 'Lower:', lowerClamped);

    // Update Mock controller
    console.log('Updating Mock controller...');
    await Promise.all([
      Mock.setUpperTargetTemp(upperClamped),
      Mock.setMiddleTargetTemp(middleClamped),
      Mock.setLowerTargetTemp(lowerClamped),
      Mock.setRedLight(p.redLightOn),
      Mock.setPEMFLevel(p.pemfLevel),
      Mock.setSessionTimer(p.timerMinutes),
    ]);
    console.log('Mock controller updated');

    // Batch all React state updates together
    const newZoneTargets = { Upper: upperClamped, Middle: middleClamped, Lower: lowerClamped };
    console.log('Setting new zoneTargets:', JSON.stringify(newZoneTargets));

    setZoneTargets(newZoneTargets);
    setTargetTempF(computeTargetAvg(newZoneTargets));
    setRedLightOn(p.redLightOn);
    setPemfLevel(p.pemfLevel);
    setTimerMinutes(p.timerMinutes);

    // CRITICAL: Immediately persist to storage BEFORE navigation
    const payload: PersistShape = {
      targetTempF: computeTargetAvg(newZoneTargets),
      zoneTargets: newZoneTargets,
      redLightOn: p.redLightOn,
      pemfLevel: p.pemfLevel,
      timerMinutes: p.timerMinutes,
    };
    await storage.set(PERSIST_KEY, payload);
    console.log('💾 Persisted new values to storage:', JSON.stringify(newZoneTargets));

    console.log('All setState calls completed');
    console.log('=== LOAD ZONE PROFILE END ===');

    // Reset ready notification if any new target is higher than current highest zone
    setZoneCurrents((currents) => {
      const highestCurrent = Math.max(currents.Upper, currents.Middle, currents.Lower);
      const highestNewTarget = Math.max(upperClamped, middleClamped, lowerClamped);
      if (highestNewTarget > highestCurrent) {
        Mock.resetReadyNotification();
      }
      return currents; // Don't modify currents
    });
  }, []);

  const renameZoneProfile = useCallback(async (id: string, name: string) => {
    const list = await loadProfiles();
    const next = list.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p));
    await saveProfiles(next);
  }, []);

  const deleteZoneProfile = useCallback(async (id: string) => {
    const list = await loadProfiles();
    const next = list.filter((p) => p.id !== id);
    await saveProfiles(next);
  }, []);

  const createZoneProfile = useCallback(async (data: Omit<ZoneProfile, 'id' | 'createdAt'>) => {
    const list = await loadProfiles();
    const newProfile: ZoneProfile = {
      id: nanoid(),
      createdAt: Date.now(),
      ...data,
    };
    await saveProfiles([newProfile, ...list].slice(0, 20));
  }, []);

  const updateZoneProfile = useCallback(async (updated: ZoneProfile) => {
    const list = await loadProfiles();
    const idx = list.findIndex((p) => p.id === updated.id);
    if (idx === -1) return;
    const merged: ZoneProfile = { ...list[idx], ...updated, createdAt: list[idx].createdAt };
    const next = [...list];
    next[idx] = merged;
    await saveProfiles(next);
  }, []);

  // Schedule management
  const getSchedules = useCallback(async () => {
    return loadSchedules();
  }, []);

  const createSchedule = useCallback(async (schedule: Schedule) => {
    const list = await loadSchedules();
    list.unshift(schedule);
    await saveSchedules(list);

    // Request notification permissions and schedule notifications
    const hasPermission = await ScheduleManager.requestNotificationPermissions();
    if (hasPermission) {
      await ScheduleManager.scheduleNotifications(schedule);
    }

    return schedule;
  }, []);

  const updateSchedule = useCallback(async (id: string, updates: Partial<Schedule>) => {
    const list = await loadSchedules();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Schedule not found');
    const updated = { ...list[idx], ...updates, updatedAt: Date.now() };
    list[idx] = updated;
    await saveSchedules(list);

    // Reschedule notifications
    if (updated.enabled) {
      await ScheduleManager.scheduleNotifications(updated);
    } else {
      await ScheduleManager.cancelScheduleNotifications(updated.id);
    }

    return updated;
  }, []);

  const deleteSchedule = useCallback(async (id: string) => {
    const list = await loadSchedules();
    const next = list.filter((s) => s.id !== id);
    await saveSchedules(next);

    // Cancel notifications for deleted schedule
    await ScheduleManager.cancelScheduleNotifications(id);
  }, []);

  return {
    state,
    connection,
    targetTempF,   // derived
    currentTempF,  // derived
    zoneTargets,
    zoneCurrents,
    redLightOn,
    pemfLevel,
    timerMinutes,
    remainingSeconds,
    lastError,
    progress,
    isOn,
    isPreheating,
    isReady,
    canControl,
    startSauna,
    stopSauna,
    emergencyShutdown,
    setZoneTarget,
    setUpperTargetTemp,
    setMiddleTargetTemp,
    setLowerTargetTemp,
    setRedLight,
    setPEMFLevel,
    setSessionTimer,
    refreshSnapshot,
    saveZoneProfile,
    getZoneProfiles,
    loadZoneProfile,
    createZoneProfile,
    renameZoneProfile,
    deleteZoneProfile,
    updateZoneProfile,
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
