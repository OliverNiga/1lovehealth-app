export const TEMP = {
  minF: 77,
  maxF: 194,        // Upper & Middle zones max
  maxLowerF: 176,   // Lower zone max
  defaultTargetF: 140,
  ambientDefaultF: 71,
};

export const TIMER = {
  minMinutes: 5,
  maxMinutes: 60,
  defaultMinutes: 45,
};

export const PEMF = {
  min: 0,
  max: 30,
  defaultLevel: 15,
};

export const LOOP = {
  // controller tick frequency
  hz: 1,
};

export const ZONES = ['Upper', 'Middle', 'Lower'] as const;
export type Zone = typeof ZONES[number];

export const STATES = ['OFF', 'HEATING', 'ACTIVE', 'COOLING', 'ERROR'] as const;
export type SaunaState = typeof STATES[number];
