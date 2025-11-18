// src/controllers/MockSaunaController.ts
// 2-space indentation

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TEMP, TIMER, PEMF, LOOP, ZONES, type Zone, type SaunaState } from '../utils/constants';
import type {
  SaunaController,
  SaunaSnapshot,
  ZoneTargets,
  ZoneCurrents,
  ZoneProfile,
  SaunaSchedule,
  Unsubscribe,
  TemperatureChangeEvent,
  TargetTemperatureChangeEvent,
  StateChangeEvent,
  TimerUpdateEvent,
  ConnectionChangeEvent,
  RedLightChangeEvent,
  PEMFChangeEvent,
  SessionTimerChangeEvent,
} from './SaunaControllerInterface';
import { clampTempF } from './SaunaControllerInterface';

/* -------------------------------------------------------------------------- */
/*                              Helpers & Storage                              */
/* -------------------------------------------------------------------------- */

const K = {
  SNAPSHOT: '@mock/snapshot/v1',
  PROFILES: '@mock/profiles/v1',
  SCHEDULES: '@mock/schedules/v1',
};

function nowIso() { return new Date().toISOString(); }

async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const s = await AsyncStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function saveJSON<T>(key: string, value: T): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function avg(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
}

/* -------------------------------------------------------------------------- */
/*                            Mock Sauna Controller                            */
/* -------------------------------------------------------------------------- */

type Listeners<T> = Set<(evt: T) => void>;

class MockSaunaControllerImpl implements SaunaController {
  /* ------------------------------- Sim config ------------------------------ */
  private tickMs = Math.round(1000 / LOOP.hz);
  private rateUpFps = 1.5;   // +°F per second while heating
  private rateDownFps = 1.0; // -°F per second while cooling
  private epsilon = 1;       // °F considered "at target"

  /* --------------------------------- State -------------------------------- */
  private state: SaunaState = 'OFF';
  private connection: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' = 'CONNECTED';

  private targetTempF = TEMP.defaultTargetF;
  private zoneTargets: ZoneTargets = { Upper: TEMP.defaultTargetF, Middle: TEMP.defaultTargetF, Lower: TEMP.defaultTargetF };
  private zoneCurrents: ZoneCurrents = { Upper: TEMP.ambientDefaultF, Middle: TEMP.ambientDefaultF, Lower: TEMP.ambientDefaultF };

  private redLightOn = false;
  private pemfLevel = PEMF.defaultLevel;

  private timerMinutes: number | null = TIMER.defaultMinutes;
  private remainingSeconds = 0;

  private profiles: ZoneProfile[] = [];
  private schedules: SaunaSchedule[] = [];

  // Notification tracking (persists across screen changes)
  private readyNotificationFired = false;
  private lastNotificationTargetTemp: number | null = null;

  private loop: ReturnType<typeof setInterval> | null = null;

  /* -------------------------------- Events -------------------------------- */
  private tempListeners: Listeners<TemperatureChangeEvent> = new Set();
  private targetTempListeners: Listeners<TargetTemperatureChangeEvent> = new Set();
  private stateListeners: Listeners<StateChangeEvent> = new Set();
  private timerListeners: Listeners<TimerUpdateEvent> = new Set();
  private connListeners: Listeners<ConnectionChangeEvent> = new Set();
  private redLightListeners: Listeners<RedLightChangeEvent> = new Set();
  private pemfListeners: Listeners<PEMFChangeEvent> = new Set();
  private sessionTimerListeners: Listeners<SessionTimerChangeEvent> = new Set();

  /* ------------------------------ Constructor ----------------------------- */
  constructor() {
    // attempt to hydrate persisted data (fire & forget)
    this.hydrate();
    this.startLoop();
  }

  private async hydrate() {
    const snap = await loadJSON<Partial<SaunaSnapshot>>(K.SNAPSHOT, {});
    if (snap.targetTempF) this.targetTempF = clampTempF(snap.targetTempF, TEMP.minF, TEMP.maxF);
    if (snap.zoneTargets) this.zoneTargets = {
      Upper: clampTempF(snap.zoneTargets.Upper ?? this.zoneTargets.Upper, TEMP.minF, TEMP.maxF),
      Middle: clampTempF(snap.zoneTargets.Middle ?? this.zoneTargets.Middle, TEMP.minF, TEMP.maxF),
      Lower: clampTempF(snap.zoneTargets.Lower ?? this.zoneTargets.Lower, TEMP.minF, TEMP.maxLowerF),
    };
    if (typeof snap.redLightOn === 'boolean') this.redLightOn = snap.redLightOn;
    if (typeof snap.pemfLevel === 'number') this.pemfLevel = Math.max(PEMF.min, Math.min(PEMF.max, snap.pemfLevel));
    if (typeof snap.timerMinutes !== 'undefined') this.timerMinutes = snap.timerMinutes;

    this.profiles = await loadJSON<ZoneProfile[]>(K.PROFILES, []);
    this.schedules = await loadJSON<SaunaSchedule[]>(K.SCHEDULES, []);
    this.emitAll();
  }

  private persistSnapshot() {
    const snapshot = this.buildSnapshot();
    void saveJSON(K.SNAPSHOT, snapshot);
  }

  private persistProfiles() { void saveJSON(K.PROFILES, this.profiles); }
  private persistSchedules() { void saveJSON(K.SCHEDULES, this.schedules); }

  /* ------------------------------ Main loop 1Hz --------------------------- */
  private startLoop() {
    if (this.loop) return;
    this.loop = setInterval(() => this.tick(), this.tickMs);
  }

  private stopLoop() {
    if (!this.loop) return;
    clearInterval(this.loop);
    this.loop = null;
  }

  private tick() {
    // Temperature integration
    const stepUp = this.rateUpFps * (this.tickMs / 1000);
    const stepDown = this.rateDownFps * (this.tickMs / 1000);

    // Move each zone toward its target depending on state
    if (this.state === 'HEATING' || this.state === 'ACTIVE') {
      ZONES.forEach(z => {
        const cur = this.zoneCurrents[z];
        const tgt = this.zoneTargets[z];
        if (cur < tgt) this.zoneCurrents[z] = Math.min(tgt, cur + stepUp);
        else if (cur > tgt + this.epsilon) this.zoneCurrents[z] = Math.max(tgt, cur - stepDown * 0.5); // small settle
      });
    } else if (this.state === 'COOLING' || this.state === 'OFF' || this.state === 'ERROR') {
      ZONES.forEach(z => {
        const cur = this.zoneCurrents[z];
        const amb = TEMP.ambientDefaultF;
        if (cur > amb) this.zoneCurrents[z] = Math.max(amb, cur - stepDown);
        else if (cur < amb) this.zoneCurrents[z] = Math.min(amb, cur + stepUp * 0.2); // drift toward ambient
      });
    }

    // Determine aggregate current
    const current = this.getAggregateCurrentUnsafe();

    // Determine highest current zone temperature
    const highestCurrent = Math.max(this.zoneCurrents.Upper, this.zoneCurrents.Middle, this.zoneCurrents.Lower);
    const highestTarget = Math.max(this.zoneTargets.Upper, this.zoneTargets.Middle, this.zoneTargets.Lower);

    // State transitions
    if (this.state === 'HEATING') {
      // Transition to ACTIVE when the highest zone reaches its target (not average)
      if (highestCurrent >= highestTarget - this.epsilon) {
        this.setState('ACTIVE');
      }
    }
    if (this.state === 'ACTIVE') {
      // no-op here; could add logic later
    }
    if (this.state === 'COOLING') {
      const nearAmbient = ZONES.every(z => Math.abs(this.zoneCurrents[z] - TEMP.ambientDefaultF) <= 0.5);
      if (nearAmbient) this.setState('OFF');
    }

    // Overheat safety
    if (ZONES.some(z => this.zoneCurrents[z] > TEMP.maxF)) {
      // Auto stop & go ERROR then COOLING
      this.lastError = 'Overheat detected — shutting down';
      this.setState('ERROR');
      // Immediately force heaters off; begin cooling
      this.stopSauna().catch(() => {});
    }

    // Timer countdown (only when heating/active)
    if ((this.state === 'HEATING' || this.state === 'ACTIVE') && this.timerMinutes && this.remainingSeconds > 0) {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - this.tickMs / 1000);
      this.emitTimer();
      if (this.remainingSeconds === 0) {
        // timer expired → stop
        void this.stopSauna();
      }
    }

    // Emit temps each tick
    this.emitTemps();
    this.persistSnapshot();
  }

  private getAggregateCurrentUnsafe(): number {
    return avg([this.zoneCurrents.Upper, this.zoneCurrents.Middle, this.zoneCurrents.Lower]);
  }

  /* ------------------------------- Error note ------------------------------ */
  private lastError: string | undefined = undefined;

  /* --------------------------------- Events -------------------------------- */
  private emitTemps() {
    const evt: TemperatureChangeEvent = {
      currentTempF: this.getAggregateCurrentUnsafe(),
      zoneCurrents: { ...this.zoneCurrents },
    };
    this.tempListeners.forEach(cb => cb(evt));
  }
  private emitTargetTemps() {
    const evt: TargetTemperatureChangeEvent = {
      targetTempF: this.targetTempF,
      zoneTargets: { ...this.zoneTargets },
    };
    this.targetTempListeners.forEach(cb => cb(evt));
  }
  private emitState() {
    const evt: StateChangeEvent = { state: this.state };
    this.stateListeners.forEach(cb => cb(evt));
  }
  private emitTimer() {
    const evt: TimerUpdateEvent = { remainingSeconds: Math.max(0, Math.floor(this.remainingSeconds)) };
    this.timerListeners.forEach(cb => cb(evt));
  }
  private emitConn() {
    const evt: ConnectionChangeEvent = { connection: this.connection };
    this.connListeners.forEach(cb => cb(evt));
  }
  private emitRedLight() {
    const evt: RedLightChangeEvent = { redLightOn: this.redLightOn };
    this.redLightListeners.forEach(cb => cb(evt));
  }
  private emitPEMF() {
    const evt: PEMFChangeEvent = { pemfLevel: this.pemfLevel };
    this.pemfListeners.forEach(cb => cb(evt));
  }
  private emitSessionTimer() {
    const evt: SessionTimerChangeEvent = { timerMinutes: this.timerMinutes };
    this.sessionTimerListeners.forEach(cb => cb(evt));
  }
  private emitAll() {
    this.emitTemps();
    this.emitTargetTemps();
    this.emitState();
    this.emitTimer();
    this.emitConn();
    this.emitRedLight();
    this.emitPEMF();
    this.emitSessionTimer();
  }

  private setState(next: SaunaState) {
    if (this.state === next) return;
    this.state = next;
    this.emitState();
  }

  /* --------------------------- Interface methods --------------------------- */

  async startSauna(): Promise<void> {
    this.lastError = undefined;
    // Reset notification tracking for new session
    this.readyNotificationFired = false;
    this.lastNotificationTargetTemp = null;

    // Initialize timer on start if configured but not running
    if (this.timerMinutes && this.remainingSeconds <= 0) {
      this.remainingSeconds = this.timerMinutes * 60;
      this.emitTimer();
    }

    // Update targetTempF to match the average of current zone targets
    this.targetTempF = Math.round(avg(Object.values(this.zoneTargets)));

    this.setState('HEATING');
    this.persistSnapshot();
  }

  async stopSauna(): Promise<void> {
    // Reset notification tracking when sauna stops
    this.readyNotificationFired = false;
    this.lastNotificationTargetTemp = null;

    // Turn features off per spec
    this.redLightOn = false;
    // Don't zero out PEMF; keep last value for next session
    // Timer stops but retains configured minutes
    this.remainingSeconds = 0;
    this.emitTimer();

    // Enter cooling (unless already OFF)
    if (this.state !== 'OFF') this.setState('COOLING');
    this.persistSnapshot();
  }

  async getSaunaState(): Promise<SaunaState> {
    return this.state;
  }

  async emergencyShutdown(): Promise<void> {
    this.lastError = 'Emergency shutdown';
    this.setState('ERROR');
    await this.stopSauna();
  }

  /* ------------------------------ Temperatures ----------------------------- */

  async getTargetTemperature(): Promise<number> {
    return this.targetTempF;
  }

  async getCurrentTemperature(): Promise<number> {
    return this.getAggregateCurrentUnsafe();
  }

  async setUpperTargetTemp(tempF: number): Promise<void> {
    this.zoneTargets.Upper = clampTempF(tempF, TEMP.minF, TEMP.maxF);
    this.targetTempF = Math.round(avg(Object.values(this.zoneTargets)));
    this.emitTargetTemps();
    this.persistSnapshot();
  }
  async setMiddleTargetTemp(tempF: number): Promise<void> {
    this.zoneTargets.Middle = clampTempF(tempF, TEMP.minF, TEMP.maxF);
    this.targetTempF = Math.round(avg(Object.values(this.zoneTargets)));
    this.emitTargetTemps();
    this.persistSnapshot();
  }
  async setLowerTargetTemp(tempF: number): Promise<void> {
    this.zoneTargets.Lower = clampTempF(tempF, TEMP.minF, TEMP.maxLowerF);
    this.targetTempF = Math.round(avg(Object.values(this.zoneTargets)));
    this.emitTargetTemps();
    this.persistSnapshot();
  }

  async getUpperCurrentTemp(): Promise<number> { return this.zoneCurrents.Upper; }
  async getMiddleCurrentTemp(): Promise<number> { return this.zoneCurrents.Middle; }
  async getLowerCurrentTemp(): Promise<number> { return this.zoneCurrents.Lower; }

  /* ----------------------------- Feature Controls -------------------------- */

  async setRedLight(on: boolean): Promise<void> {
    // Store the preference; it will only actually activate when sauna is running
    this.redLightOn = !!on;
    this.emitRedLight();
    this.persistSnapshot();
  }
  async getRedLight(): Promise<boolean> { return this.redLightOn; }

  async setPEMFLevel(level: number): Promise<void> {
    const v = Math.max(PEMF.min, Math.min(PEMF.max, Math.round(level)));
    this.pemfLevel = v;
    this.emitPEMF();
    this.persistSnapshot();
  }
  async getPEMFLevel(): Promise<number> { return this.pemfLevel; }

  async setSessionTimer(minutes: number | null): Promise<void> {
    if (minutes === null) {
      this.timerMinutes = null;
      this.remainingSeconds = 0;
    } else {
      const v = Math.max(TIMER.minMinutes, Math.min(TIMER.maxMinutes, Math.round(minutes)));
      // extend behavior: if running, add to remaining
      if (this.remainingSeconds > 0 && (this.state === 'HEATING' || this.state === 'ACTIVE')) {
        this.remainingSeconds += v * 60;
      } else {
        this.timerMinutes = v;
        // don't start countdown until sauna starts
      }
    }
    this.emitSessionTimer();
    this.emitTimer();
    this.persistSnapshot();
  }

  async getSessionTimer(): Promise<number | null> {
    return this.timerMinutes;
  }

  /* ----------------------------- Data Management --------------------------- */

  async saveZoneProfile(
    name: string,
    settings: { targets: ZoneTargets; redLight?: boolean; pemfLevel?: number; timerMinutes?: number | null; }
  ): Promise<ZoneProfile> {
    const p: ZoneProfile = {
      id: crypto.randomUUID(),
      name,
      targets: {
        Upper: clampTempF(settings.targets.Upper, TEMP.minF, TEMP.maxF),
        Middle: clampTempF(settings.targets.Middle, TEMP.minF, TEMP.maxF),
        Lower: clampTempF(settings.targets.Lower, TEMP.minF, TEMP.maxLowerF),
      },
      redLight: settings.redLight,
      pemfLevel: typeof settings.pemfLevel === 'number' ? Math.max(PEMF.min, Math.min(PEMF.max, Math.round(settings.pemfLevel))) : undefined,
      timerMinutes: typeof settings.timerMinutes === 'number' ? Math.max(TIMER.minMinutes, Math.min(TIMER.maxMinutes, Math.round(settings.timerMinutes))) : null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.profiles.unshift(p);
    this.persistProfiles();
    return p;
  }

  async getZoneProfiles(): Promise<ZoneProfile[]> {
    return [...this.profiles];
  }

  async loadZoneProfile(id: string): Promise<void> {
    const p = this.profiles.find(x => x.id === id);
    if (!p) return;
    this.zoneTargets = { ...p.targets };
    this.targetTempF = Math.round(avg(Object.values(p.targets)));
    if (typeof p.redLight === 'boolean') this.redLightOn = p.redLight;
    if (typeof p.pemfLevel === 'number') this.pemfLevel = p.pemfLevel;
    if (typeof p.timerMinutes !== 'undefined') this.timerMinutes = p.timerMinutes;
    this.persistSnapshot();
  }

  async createSchedule(data: Omit<SaunaSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SaunaSchedule> {
    const s: SaunaSchedule = {
      id: crypto.randomUUID(),
      name: data.name,
      enabled: data.enabled,
      days: data.days,
      timeLocalHHmm: data.timeLocalHHmm,
      // Clamp temperatures
      upper: clampTempF(data.upper, TEMP.minF, TEMP.maxF),
      middle: clampTempF(data.middle, TEMP.minF, TEMP.maxF),
      lower: clampTempF(data.lower, TEMP.minF, TEMP.maxLowerF),
      // Clamp features
      redLightOn: data.redLightOn,
      pemfLevel: Math.max(PEMF.min, Math.min(PEMF.max, Math.round(data.pemfLevel))),
      timerMinutes: Math.max(TIMER.minMinutes, Math.min(TIMER.maxMinutes, Math.round(data.timerMinutes))),
      profileId: data.profileId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.schedules.unshift(s);
    this.persistSchedules();
    return s;
  }

  async getSchedules(): Promise<SaunaSchedule[]> {
    return [...this.schedules];
  }

  async updateSchedule(id: string, data: Partial<Omit<SaunaSchedule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SaunaSchedule> {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Schedule not found');

    // Apply clamping to updated fields
    const updates: Partial<SaunaSchedule> = { ...data };
    if (typeof data.upper === 'number') updates.upper = clampTempF(data.upper, TEMP.minF, TEMP.maxF);
    if (typeof data.middle === 'number') updates.middle = clampTempF(data.middle, TEMP.minF, TEMP.maxF);
    if (typeof data.lower === 'number') updates.lower = clampTempF(data.lower, TEMP.minF, TEMP.maxLowerF);
    if (typeof data.pemfLevel === 'number') updates.pemfLevel = Math.max(PEMF.min, Math.min(PEMF.max, Math.round(data.pemfLevel)));
    if (typeof data.timerMinutes === 'number') updates.timerMinutes = Math.max(TIMER.minMinutes, Math.min(TIMER.maxMinutes, Math.round(data.timerMinutes)));

    const next = { ...this.schedules[idx], ...updates, updatedAt: nowIso() };
    this.schedules[idx] = next;
    this.persistSchedules();
    return next;
  }

  async deleteSchedule(id: string): Promise<void> {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Schedule not found');
    this.schedules.splice(idx, 1);
    this.persistSchedules();
  }

  /* ----------------------------- Real-time Updates ------------------------- */

  onTemperatureChange(cb: (evt: TemperatureChangeEvent) => void): Unsubscribe {
    this.tempListeners.add(cb);
    // emit immediately
    cb({ currentTempF: this.getAggregateCurrentUnsafe(), zoneCurrents: { ...this.zoneCurrents } });
    return () => this.tempListeners.delete(cb);
  }

  onTargetTemperatureChange(cb: (evt: TargetTemperatureChangeEvent) => void): Unsubscribe {
    this.targetTempListeners.add(cb);
    // emit immediately
    cb({ targetTempF: this.targetTempF, zoneTargets: { ...this.zoneTargets } });
    return () => this.targetTempListeners.delete(cb);
  }

  onStateChange(cb: (evt: StateChangeEvent) => void): Unsubscribe {
    this.stateListeners.add(cb);
    cb({ state: this.state });
    return () => this.stateListeners.delete(cb);
  }

  onTimerUpdate(cb: (evt: TimerUpdateEvent) => void): Unsubscribe {
    this.timerListeners.add(cb);
    cb({ remainingSeconds: Math.max(0, Math.floor(this.remainingSeconds)) });
    return () => this.timerListeners.delete(cb);
  }

  onConnectionStatusChange(cb: (evt: ConnectionChangeEvent) => void): Unsubscribe {
    this.connListeners.add(cb);
    cb({ connection: this.connection });
    return () => this.connListeners.delete(cb);
  }

  onRedLightChange(cb: (evt: RedLightChangeEvent) => void): Unsubscribe {
    this.redLightListeners.add(cb);
    cb({ redLightOn: this.redLightOn });
    return () => this.redLightListeners.delete(cb);
  }

  onPEMFChange(cb: (evt: PEMFChangeEvent) => void): Unsubscribe {
    this.pemfListeners.add(cb);
    cb({ pemfLevel: this.pemfLevel });
    return () => this.pemfListeners.delete(cb);
  }

  onSessionTimerChange(cb: (evt: SessionTimerChangeEvent) => void): Unsubscribe {
    this.sessionTimerListeners.add(cb);
    cb({ timerMinutes: this.timerMinutes });
    return () => this.sessionTimerListeners.delete(cb);
  }

  /* --------------------------- Convenience Accessors ----------------------- */

  async getSnapshot(): Promise<SaunaSnapshot> {
    return this.buildSnapshot();
  }

  async setZoneTarget(zone: Zone, tempF: number): Promise<void> {
    const v = clampTempF(tempF, TEMP.minF, TEMP.maxF);
    this.zoneTargets[zone] = v;
    this.persistSnapshot();
  }

  async getZoneCurrent(zone: Zone): Promise<number> {
    return this.zoneCurrents[zone];
  }

  /* --------------------------------- Utils -------------------------------- */
  private buildSnapshot(): SaunaSnapshot {
    return {
      state: this.state,
      connection: this.connection,
      targetTempF: this.targetTempF,
      currentTempF: this.getAggregateCurrentUnsafe(),
      zoneTargets: { ...this.zoneTargets },
      zoneCurrents: { ...this.zoneCurrents },
      redLightOn: this.redLightOn,
      pemfLevel: this.pemfLevel,
      timerMinutes: this.timerMinutes,
      remainingSeconds: Math.max(0, Math.floor(this.remainingSeconds)),
      lastError: this.lastError,
    };
  }

  /* ---------------------- Notification Tracking Methods --------------------- */

  shouldFireReadyNotification(targetTemp: number): boolean {
    if (this.readyNotificationFired) return false;
    if (this.lastNotificationTargetTemp === targetTemp) return false;
    return true;
  }

  markReadyNotificationFired(targetTemp: number): void {
    this.readyNotificationFired = true;
    this.lastNotificationTargetTemp = targetTemp;
  }

  resetReadyNotification(): void {
    this.readyNotificationFired = false;
    this.lastNotificationTargetTemp = null;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Export                                   */
/* -------------------------------------------------------------------------- */

export const MockSaunaController = new MockSaunaControllerImpl();
export default MockSaunaController;
