// src/controllers/SaunaControllerInterface.ts
// 2-space indent please

import type { SaunaState, Zone } from '../utils/constants';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export interface ZoneTemps {
  Upper: number;   // °F
  Middle: number;  // °F
  Lower: number;   // °F
}

export interface ZoneTargets extends ZoneTemps {}
export interface ZoneCurrents extends ZoneTemps {}

export interface ZoneProfile {
  id: string;
  name: string;
  targets: ZoneTargets;
  redLight?: boolean;
  pemfLevel?: number;
  // before: timerMinutes?: number;
  timerMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeek =
  | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface SaunaSchedule {
  id: string;
  name: string;
  enabled: boolean;
  days: DayOfWeek[];             // which days this schedule runs (can be multiple)
  timeLocalHHmm: string;         // "06:30" (24h)

  // Zone temperatures (°F)
  upper: number;   // 77-194
  middle: number;  // 77-194
  lower: number;   // 77-176

  // Features
  redLightOn: boolean;
  pemfLevel: number;             // 0-30
  timerMinutes: number;          // 5-60 (doubles as session duration)

  // Optional: associate a profile
  profileId?: string;

  createdAt: string;             // ISO
  updatedAt: string;             // ISO
}

export interface SaunaSnapshot {
  state: SaunaState;             // 'OFF' | 'HEATING' | 'ACTIVE' | 'COOLING' | 'ERROR'
  connection: ConnectionStatus;  // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'
  // Global target & actual
  targetTempF: number;           // °F
  currentTempF: number;          // °F (aggregate/representative reading)
  // Per-zone
  zoneTargets: ZoneTargets;      // °F
  zoneCurrents: ZoneCurrents;    // °F
  // Features
  redLightOn: boolean;
  pemfLevel: number;             // 0..30
  // Timer
  timerMinutes: number | null;   // configured
  remainingSeconds: number;      // countdown live value
  // Safety
  lastError?: string;            // present if state === 'ERROR'
}

/* -------------------------------------------------------------------------- */
/*                                Event Types                                 */
/* -------------------------------------------------------------------------- */

export type TemperatureChangeEvent = {
  currentTempF: number;
  zoneCurrents: ZoneCurrents;
};

export type TargetTemperatureChangeEvent = {
  targetTempF: number;
  zoneTargets: ZoneTargets;
};

export type StateChangeEvent = {
  state: SaunaState;
};

export type TimerUpdateEvent = {
  remainingSeconds: number;
};

export type ConnectionChangeEvent = {
  connection: ConnectionStatus;
};

export type RedLightChangeEvent = {
  redLightOn: boolean;
};

export type PEMFChangeEvent = {
  pemfLevel: number;
};

export type SessionTimerChangeEvent = {
  timerMinutes: number | null;
};

/** Unsubscribe function returned by event listeners. */
export type Unsubscribe = () => void;

/* -------------------------------------------------------------------------- */
/*                            Controller Interface                             */
/* -------------------------------------------------------------------------- */

export interface SaunaController {
  /* --------------------------- Power & State Mgmt -------------------------- */
  startSauna(): Promise<void>;              // Initialize heating sequence
  stopSauna(): Promise<void>;               // Shutdown all systems
  getSaunaState(): Promise<SaunaState>;     // 'OFF' | 'HEATING' | 'ACTIVE' | 'COOLING' | 'ERROR'
  emergencyShutdown(): Promise<void>;       // Immediate safety shutdown (no confirm per spec)

  /* ------------------------------ Temperatures ----------------------------- */
  getTargetTemperature(): Promise<number>;             // °F (aggregate)
  getCurrentTemperature(): Promise<number>;            // °F (aggregate)

  setUpperTargetTemp(tempF: number): Promise<void>;
  setMiddleTargetTemp(tempF: number): Promise<void>;
  setLowerTargetTemp(tempF: number): Promise<void>;

  getUpperCurrentTemp(): Promise<number>;
  getMiddleCurrentTemp(): Promise<number>;
  getLowerCurrentTemp(): Promise<number>;

  /* ----------------------------- Feature Controls -------------------------- */
  setRedLight(on: boolean): Promise<void>;
  getRedLight(): Promise<boolean>;

  setPEMFLevel(level: number): Promise<void>;   // 0..30
  getPEMFLevel(): Promise<number>;

  setSessionTimer(minutes: number | null): Promise<void>; // null to clear timer
  getSessionTimer(): Promise<number | null>;              // configured value

  /* ----------------------------- Data Management --------------------------- */
  saveZoneProfile(name: string, settings: {
    targets: ZoneTargets;
    redLight?: boolean;
    pemfLevel?: number;
    timerMinutes?: number | null;
  }): Promise<ZoneProfile>;

  getZoneProfiles(): Promise<ZoneProfile[]>;
  loadZoneProfile(id: string): Promise<void>;

  createSchedule(data: Omit<SaunaSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SaunaSchedule>;
  getSchedules(): Promise<SaunaSchedule[]>;
  updateSchedule(id: string, data: Partial<Omit<SaunaSchedule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SaunaSchedule>;
  deleteSchedule(id: string): Promise<void>;

  /* ----------------------------- Real-time Updates ------------------------- */
  onTemperatureChange(cb: (evt: TemperatureChangeEvent) => void): Unsubscribe;
  onTargetTemperatureChange(cb: (evt: TargetTemperatureChangeEvent) => void): Unsubscribe;
  onStateChange(cb: (evt: StateChangeEvent) => void): Unsubscribe;
  onTimerUpdate(cb: (evt: TimerUpdateEvent) => void): Unsubscribe;
  onConnectionStatusChange(cb: (evt: ConnectionChangeEvent) => void): Unsubscribe;
  onRedLightChange(cb: (evt: RedLightChangeEvent) => void): Unsubscribe;
  onPEMFChange(cb: (evt: PEMFChangeEvent) => void): Unsubscribe;
  onSessionTimerChange(cb: (evt: SessionTimerChangeEvent) => void): Unsubscribe;

  /* --------------------------- Convenience Accessors ----------------------- */
  /** Returns a full snapshot for quick UI binding. */
  getSnapshot(): Promise<SaunaSnapshot>;

  /** Optional: per-zone set by name to simplify UI bindings. */
  setZoneTarget(zone: Zone, tempF: number): Promise<void>;
  getZoneCurrent(zone: Zone): Promise<number>;
}

/* -------------------------------------------------------------------------- */
/*                         Helper Types & Narrowing                           */
/* -------------------------------------------------------------------------- */

/** Guards a numeric input within allowed range.
 * Default: 77–194°F (Upper/Middle zones)
 * For Lower zone: use maxF = 176
 */
export function clampTempF(tempF: number, minF = 77, maxF = 194): number {
  'worklet'; // harmless in non-Reanimated code; allows future animated usage
  return Math.max(minF, Math.min(maxF, tempF));
}

/** Type predicate for Zone strings. */
export function isZone(x: unknown): x is Zone {
  return x === 'Upper' || x === 'Middle' || x === 'Lower';
}
