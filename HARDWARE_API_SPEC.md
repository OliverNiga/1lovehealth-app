# Sauna Hardware API Specification

This document specifies the complete API that the physical sauna control box must implement to work with the mobile app.

## Overview

The mobile app communicates with the sauna hardware over WiFi. The hardware must implement all functions defined in the `SaunaController` interface and provide real-time updates when state changes occur (either from the app or from physical buttons on the sauna).

---

## Connection & Discovery

### Network Discovery
The sauna should be discoverable on the local WiFi network. Recommended approaches:
- **mDNS/Bonjour**: Advertise service as `_sauna._tcp.local`
- **Static IP**: Allow user to manually configure IP address in app settings
- **QR Code**: Provide QR code on sauna with connection details

### Connection Status
The hardware must maintain and report connection status:
- `DISCONNECTED`: No active connection
- `CONNECTING`: Connection attempt in progress
- `CONNECTED`: Active connection established

---

## API Functions

All functions are asynchronous (return Promises). The hardware must respond to these commands:

### Power & State Management

#### `startSauna()`
**Purpose**: Start the sauna heating sequence

**Behavior**:
- Begin heating all zones toward their target temperatures
- Transition state from `OFF` to `HEATING`
- If timer is configured, start the countdown
- Turn on red light if `redLightOn` is true
- Activate PEMF at configured level

**Returns**: Promise<void>

---

#### `stopSauna()`
**Purpose**: Shutdown the sauna

**Behavior**:
- Stop all heating elements
- Turn off red light
- Stop timer countdown (but keep configured timer value)
- Keep PEMF level setting (don't reset to 0)
- Transition state to `COOLING`, then eventually to `OFF` as temperature drops
- Zones cool down naturally toward ambient temperature

**Returns**: Promise<void>

---

#### `emergencyShutdown()`
**Purpose**: Immediate safety shutdown with no confirmation

**Behavior**:
- Immediately cut power to all heating elements
- Turn off red light
- Stop PEMF
- Stop timer
- Set state to `ERROR`
- Set `lastError` to "Emergency shutdown"
- Log the event for safety records

**Returns**: Promise<void>

---

#### `getSaunaState()`
**Purpose**: Get current operational state

**Returns**: Promise<SaunaState>

**Possible States**:
- `OFF`: Sauna is off and at ambient temperature
- `HEATING`: Sauna is actively heating toward target temperature
- `ACTIVE`: Sauna has reached target temperature and is maintaining it
- `COOLING`: Sauna is cooling down after being stopped
- `ERROR`: Error condition (overheat, sensor failure, etc.)

---

### Temperature Control

#### `getTargetTemperature()`
**Purpose**: Get the aggregate target temperature across all zones

**Returns**: Promise<number> - Temperature in Fahrenheit (average of all zone targets)

---

#### `getCurrentTemperature()`
**Purpose**: Get the current aggregate temperature reading

**Returns**: Promise<number> - Temperature in Fahrenheit (average of all zone currents)

**Note**: This is a representative reading, typically the average of all three zones

---

#### `setUpperTargetTemp(tempF: number)`
**Purpose**: Set target temperature for Upper zone only

**Parameters**:
- `tempF`: Target temperature in Fahrenheit (77-194°F)

**Behavior**:
- Clamp value to valid range (77-194°F)
- Set only the Upper zone target
- Recalculate aggregate `targetTempF` as average of all zones
- Trigger `onTargetTemperatureChange` event
- Persist the setting

**Returns**: Promise<void>

---

#### `setMiddleTargetTemp(tempF: number)`
**Purpose**: Set target temperature for Middle zone only

**Parameters**:
- `tempF`: Target temperature in Fahrenheit (77-194°F)

**Behavior**:
- Clamp value to valid range (77-194°F)
- Set only the Middle zone target
- Recalculate aggregate `targetTempF` as average of all zones
- Trigger `onTargetTemperatureChange` event
- Persist the setting

**Returns**: Promise<void>

---

#### `setLowerTargetTemp(tempF: number)`
**Purpose**: Set target temperature for Lower zone only

**Parameters**:
- `tempF`: Target temperature in Fahrenheit (77-176°F)

**Behavior**:
- Clamp value to valid range (77-176°F)
- Set only the Lower zone target
- Recalculate aggregate `targetTempF` as average of all zones
- Trigger `onTargetTemperatureChange` event
- Persist the setting

**Returns**: Promise<void>

---

#### `setZoneTarget(zone: Zone, tempF: number)`
**Purpose**: Generic function to set any zone's target temperature

**Parameters**:
- `zone`: One of `'Upper'`, `'Middle'`, or `'Lower'`
- `tempF`: Target temperature in Fahrenheit (77-194°F for Upper/Middle, 77-176°F for Lower)

**Behavior**:
- Same as individual zone setters above
- Route to appropriate zone based on `zone` parameter
- Apply correct temperature limits based on zone

**Returns**: Promise<void>

---

#### `getUpperCurrentTemp()`
**Purpose**: Get current temperature reading from Upper zone sensor

**Returns**: Promise<number> - Temperature in Fahrenheit

---

#### `getMiddleCurrentTemp()`
**Purpose**: Get current temperature reading from Middle zone sensor

**Returns**: Promise<number> - Temperature in Fahrenheit

---

#### `getLowerCurrentTemp()`
**Purpose**: Get current temperature reading from Lower zone sensor

**Returns**: Promise<number> - Temperature in Fahrenheit

---

#### `getZoneCurrent(zone: Zone)`
**Purpose**: Generic function to get any zone's current temperature

**Parameters**:
- `zone`: One of `'Upper'`, `'Middle'`, or `'Lower'`

**Returns**: Promise<number> - Temperature in Fahrenheit

---

### Red Light Control

#### `setRedLight(on: boolean)`
**Purpose**: Turn red light therapy on or off

**Parameters**:
- `on`: true to turn on, false to turn off

**Behavior**:
- Store the preference
- If sauna is running (`HEATING` or `ACTIVE`), immediately apply the change
- If sauna is off, store preference to apply when sauna starts
- Trigger `onRedLightChange` event
- Persist the setting

**Returns**: Promise<void>

---

#### `getRedLight()`
**Purpose**: Get current red light state

**Returns**: Promise<boolean> - true if on, false if off

---

### PEMF Control

#### `setPEMFLevel(level: number)`
**Purpose**: Set PEMF (Pulsed Electromagnetic Field) intensity level

**Parameters**:
- `level`: Intensity level (0-30)

**Behavior**:
- Clamp value to valid range (0-30)
- Round to nearest integer
- Apply immediately if sauna is running
- Store preference for next session
- Trigger `onPEMFChange` event
- Persist the setting

**Returns**: Promise<void>

**Note**: Level 0 means PEMF is off

---

#### `getPEMFLevel()`
**Purpose**: Get current PEMF level setting

**Returns**: Promise<number> - Level from 0-30

---

### Session Timer

#### `setSessionTimer(minutes: number | null)`
**Purpose**: Set or clear the session timer

**Parameters**:
- `minutes`: Duration in minutes (5-60), or null to disable timer

**Behavior**:
- If `null`: Clear timer, set `remainingSeconds` to 0
- If number:
  - Clamp to range (5-60 minutes)
  - Round to nearest integer
  - Store configured value
  - If sauna is currently running AND remaining > 0, ADD the new minutes to remaining time (extend behavior)
  - If sauna is off or no time remaining, just store the value to start on next session
- Trigger `onSessionTimerChange` event
- Persist the setting

**Returns**: Promise<void>

**Special Behavior**: When timer reaches 0 during a session, automatically call `stopSauna()`

---

#### `getSessionTimer()`
**Purpose**: Get the configured timer value (not the countdown)

**Returns**: Promise<number | null> - Configured minutes (5-60), or null if no timer set

---

### Zone Profiles

Zone profiles allow users to save and recall temperature presets with additional settings.

#### `saveZoneProfile(name: string, settings: object)`
**Purpose**: Save a new temperature profile

**Parameters**:
- `name`: Display name for the profile (e.g., "Hot Session", "Mild Therapy")
- `settings`: Object containing:
  ```typescript
  {
    targets: {
      Upper: number,    // 77-194°F
      Middle: number,   // 77-194°F
      Lower: number     // 77-176°F
    },
    redLight?: boolean,         // optional
    pemfLevel?: number,         // optional, 0-30
    timerMinutes?: number | null // optional, 5-60 or null
  }
  ```

**Behavior**:
- Generate unique ID for profile
- Clamp Upper/Middle temperature values to 77-194°F
- Clamp Lower temperature to 77-176°F
- Clamp PEMF to 0-30
- Clamp timer to 5-60 minutes
- Store timestamps: `createdAt`, `updatedAt`
- Add to profile list
- Persist all profiles

**Returns**: Promise<ZoneProfile> - The created profile with generated ID and timestamps

---

#### `getZoneProfiles()`
**Purpose**: Retrieve all saved profiles

**Returns**: Promise<ZoneProfile[]> - Array of all saved profiles

**Profile Structure**:
```typescript
{
  id: string,              // unique identifier
  name: string,            // display name
  targets: {
    Upper: number,
    Middle: number,
    Lower: number
  },
  redLight?: boolean,
  pemfLevel?: number,
  timerMinutes?: number | null,
  createdAt: string,       // ISO timestamp
  updatedAt: string        // ISO timestamp
}
```

---

#### `loadZoneProfile(id: string)`
**Purpose**: Apply a saved profile's settings to the sauna

**Parameters**:
- `id`: The profile's unique identifier

**Behavior**:
- Find profile by ID
- If not found, do nothing (fail silently or log error)
- Apply all settings from profile:
  - Set `zoneTargets` to profile's targets
  - Set `redLightOn` if defined in profile
  - Set `pemfLevel` if defined in profile
  - Set `timerMinutes` if defined in profile
- Recalculate aggregate `targetTempF`
- Trigger all relevant change events
- Persist current snapshot

**Returns**: Promise<void>

**Note**: This does NOT start the sauna, it only changes the settings

---

#### `updateZoneProfile(updated: ZoneProfile)`
**Purpose**: Update an existing profile

**Parameters**:
- `updated`: Complete ZoneProfile object with modifications

**Behavior**:
- Find profile by `updated.id`
- If not found, do nothing (fail silently or log error)
- Replace existing profile with updated version
- Preserve original `createdAt` timestamp
- Update `updatedAt` to current time
- Apply clamping to temperature values
- Persist all profiles

**Returns**: Promise<void>

---

#### `renameZoneProfile(id: string, name: string)`
**Purpose**: Rename an existing profile

**Parameters**:
- `id`: Profile unique identifier
- `name`: New name for the profile

**Behavior**:
- Find profile by ID
- If not found, do nothing (fail silently or log error)
- Update profile name (trim whitespace)
- Update `updatedAt` timestamp
- Persist all profiles

**Returns**: Promise<void>

---

#### `deleteZoneProfile(id: string)`
**Purpose**: Delete a profile permanently

**Parameters**:
- `id`: Profile unique identifier

**Behavior**:
- Find profile by ID
- Remove from profile list
- If profile doesn't exist, fail silently or log error
- Persist remaining profiles

**Returns**: Promise<void>

---

### Schedules

Schedules allow users to save preset sauna sessions with specific times and settings. Each schedule represents a single day and time.

#### `createSchedule(data: object)`
**Purpose**: Create a new scheduled sauna session

**Parameters**:
- `data`: Object containing:
  ```typescript
  {
    name: string,                  // display name (auto-generated in app)
    enabled: boolean,              // is schedule active
    day: DayOfWeek,               // single day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
    timeLocalHHmm: string,        // "06:30" in 24-hour format

    // Zone temperatures (°F)
    upper: number,                 // 77-194
    middle: number,                // 77-194
    lower: number,                 // 77-176

    // Features
    redLightOn: boolean,           // red light therapy on/off
    pemfLevel: number,             // 0-30
    timerMinutes: number,          // 5-60 (session duration)

    // Optional profile reference
    profileId?: string             // if schedule was created from a profile
  }
  ```

**Behavior**:
- Generate unique ID
- Add `createdAt` and `updatedAt` ISO timestamps
- Clamp Upper/Middle temperatures to 77-194°F
- Clamp Lower temperature to 77-176°F
- Clamp PEMF to 0-30
- Clamp timer to 5-60 minutes
- Store schedule in persistent storage

**Returns**: Promise<SaunaSchedule> - The created schedule with generated ID and timestamps

**Note**: Schedule execution (notifications and auto-start) is handled by the mobile app, not the hardware. Hardware only needs to store and provide CRUD operations for schedules.

---

#### `getSchedules()`
**Purpose**: Retrieve all schedules

**Returns**: Promise<SaunaSchedule[]> - Array of all schedules

**Schedule Structure**:
```typescript
{
  id: string,                   // unique identifier
  name: string,                 // display name (e.g., "Monday - 6:00 AM - 40 min")
  enabled: boolean,             // is schedule active
  day: DayOfWeek,              // 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  timeLocalHHmm: string,       // "06:30" in 24-hour format

  // Zone temperatures (°F)
  upper: number,                // 77-194
  middle: number,               // 77-194
  lower: number,                // 77-176

  // Features
  redLightOn: boolean,
  pemfLevel: number,            // 0-30
  timerMinutes: number,         // 5-60

  // Optional
  profileId?: string,           // if created from a profile

  createdAt: string,            // ISO timestamp
  updatedAt: string             // ISO timestamp
}
```

---

#### `updateSchedule(id: string, data: object)`
**Purpose**: Update an existing schedule

**Parameters**:
- `id`: Schedule unique identifier
- `data`: Partial schedule object with fields to update (any fields from the schedule structure above except `id`, `createdAt`, `updatedAt`)

**Behavior**:
- Find schedule by ID
- Merge new data with existing schedule
- Apply same clamping rules as `createSchedule`
- Update `updatedAt` timestamp to current time
- Persist schedules

**Returns**: Promise<SaunaSchedule> - The updated schedule

---

#### `deleteSchedule(id: string)`
**Purpose**: Delete a schedule permanently

**Parameters**:
- `id`: Schedule unique identifier

**Behavior**:
- Find schedule by ID
- Remove from storage
- If schedule doesn't exist, fail silently or log error
- Persist remaining schedules

**Returns**: Promise<void>

---

### Real-time State Updates

The hardware MUST emit events when state changes, whether triggered by:
- App commands via API
- Physical button presses on the sauna
- Automatic state changes (timer expiring, reaching target temp, etc.)

#### `onTemperatureChange(callback)`
**Purpose**: Subscribe to temperature updates

**Callback receives**:
```typescript
{
  currentTempF: number,      // aggregate current temp
  zoneCurrents: {
    Upper: number,
    Middle: number,
    Lower: number
  }
}
```

**Frequency**: Should emit every 1-2 seconds during operation

**Returns**: Function to unsubscribe

---

#### `onTargetTemperatureChange(callback)`
**Purpose**: Subscribe to target temperature changes

**Callback receives**:
```typescript
{
  targetTempF: number,       // aggregate target
  zoneTargets: {
    Upper: number,
    Middle: number,
    Lower: number
  }
}
```

**When to emit**: Immediately when any zone target changes

**Returns**: Function to unsubscribe

---

#### `onStateChange(callback)`
**Purpose**: Subscribe to sauna state changes

**Callback receives**:
```typescript
{
  state: 'OFF' | 'HEATING' | 'ACTIVE' | 'COOLING' | 'ERROR'
}
```

**When to emit**: Immediately when state transitions

**Returns**: Function to unsubscribe

---

#### `onTimerUpdate(callback)`
**Purpose**: Subscribe to timer countdown updates

**Callback receives**:
```typescript
{
  remainingSeconds: number   // countdown value, never negative
}
```

**Frequency**: Every second when timer is running

**Returns**: Function to unsubscribe

---

#### `onConnectionStatusChange(callback)`
**Purpose**: Subscribe to connection status changes

**Callback receives**:
```typescript
{
  connection: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'
}
```

**When to emit**: When connection state changes

**Returns**: Function to unsubscribe

---

#### `onRedLightChange(callback)`
**Purpose**: Subscribe to red light state changes

**Callback receives**:
```typescript
{
  redLightOn: boolean
}
```

**When to emit**: When red light is toggled (app or physical button)

**Returns**: Function to unsubscribe

---

#### `onPEMFChange(callback)`
**Purpose**: Subscribe to PEMF level changes

**Callback receives**:
```typescript
{
  pemfLevel: number   // 0-30
}
```

**When to emit**: When PEMF level changes (app or physical button)

**Returns**: Function to unsubscribe

---

#### `onSessionTimerChange(callback)`
**Purpose**: Subscribe to session timer configuration changes

**Callback receives**:
```typescript
{
  timerMinutes: number | null
}
```

**When to emit**: When configured timer value changes (not the countdown)

**Returns**: Function to unsubscribe

---

### Snapshot

#### `getSnapshot()`
**Purpose**: Get complete current state in a single call

**Returns**: Promise<SaunaSnapshot>

**Snapshot Structure**:
```typescript
{
  state: 'OFF' | 'HEATING' | 'ACTIVE' | 'COOLING' | 'ERROR',
  connection: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED',
  targetTempF: number,           // aggregate target
  currentTempF: number,          // aggregate current
  zoneTargets: {
    Upper: number,
    Middle: number,
    Lower: number
  },
  zoneCurrents: {
    Upper: number,
    Middle: number,
    Lower: number
  },
  redLightOn: boolean,
  pemfLevel: number,             // 0-30
  timerMinutes: number | null,   // configured value
  remainingSeconds: number,      // live countdown
  lastError?: string             // present if state === 'ERROR'
}
```

**When to use**: App calls this on startup and after reconnection to sync state

---

## Safety Requirements

### Over-Temperature Protection
- Maximum safe temperature: **194°F** for Upper/Middle zones, **176°F** for Lower zone
- If Upper or Middle zone exceeds 194°F, OR if Lower zone exceeds 176°F:
  1. Immediately call `emergencyShutdown()`
  2. Set state to `ERROR`
  3. Set `lastError` to "Over-temperature detected. Sauna stopped for safety."
  4. Log the event
  5. Require manual reset before allowing restart

### Sensor Failure Detection
- Monitor all temperature sensors for failures
- If sensor returns invalid reading or disconnects:
  1. Call `emergencyShutdown()`
  2. Set state to `ERROR`
  3. Set `lastError` to describe which sensor failed
  4. Disable that zone until sensor is repaired

### Automatic Timer Shutdown
- When timer reaches 0 during a session, automatically call `stopSauna()`
- Do NOT allow sauna to run indefinitely without timer or user interaction

---

## Data Persistence

The hardware MUST persist these settings across power cycles:
- Zone target temperatures
- Red light preference
- PEMF level
- Timer configuration
- All saved profiles
- All schedules

**When to persist**: Immediately after any setting changes, so settings survive unexpected power loss.

---

## Physical Button Integration

When user presses buttons on the physical sauna:
1. Update the internal state
2. Execute the action (e.g., change temperature, turn on red light)
3. Emit the appropriate event (e.g., `onTargetTemperatureChange`)
4. App will automatically update UI because it's subscribed to events

**Example**: User presses "Temp Up" button on sauna:
1. Hardware increments `zoneTargets.Upper` by 5°F
2. Hardware recalculates aggregate `targetTempF`
3. Hardware emits `onTargetTemperatureChange` event
4. App receives event and updates UI
5. Both displays (app and physical) stay in sync

---

## Error Handling

All API functions should handle errors gracefully:
- Return rejected Promise with descriptive error message
- Set `state` to `ERROR` for critical failures
- Set `lastError` field with user-friendly description
- Emit `onStateChange` event when entering ERROR state

**Example errors**:
- "Failed to connect to heating element controller"
- "Temperature sensor malfunction detected"
- "Invalid temperature value for Upper zone: 250°F (max is 194°F)"
- "Invalid temperature value for Lower zone: 180°F (max is 176°F)"
- "Invalid timer value: 90 minutes (max is 60 minutes)"
- "Network connection lost"

---

## Testing Recommendations

Hardware team should test:
1. All API functions respond correctly
2. Events emit when state changes (app control AND physical buttons)
3. Auto-reconnection works when WiFi drops temporarily
4. Settings persist across power cycles
5. Safety shutdowns trigger at correct thresholds
6. Timer automatically stops sauna when reaching 0
7. Multiple zones can have different targets and heat independently
8. Profile CRUD operations (create, read, update, rename, delete) work correctly
9. Schedule CRUD operations (create, read, update, delete) work correctly
10. All temperature clamping is applied correctly (77-194°F for Upper/Middle, 77-176°F for Lower)

---

## Summary

This specification defines **31 API functions** and **8 real-time event subscriptions** that enable complete sauna control from the mobile app. The hardware must implement all of these functions and emit real-time events to keep the app synchronized with the physical state, whether changes come from the app or from physical buttons on the sauna.

**Key Points**:
- All temperature values are in Fahrenheit (°F)
- Upper/Middle zones: 77-194°F, Lower zone: 77-176°F
- PEMF levels: 0-30 (0 = off)
- Timer: 5-60 minutes or null
- Profiles and schedules are stored by hardware but managed by the app
- Schedule execution (notifications, auto-start) is handled by the mobile app
- Hardware must persist all settings across power cycles
- Hardware must emit events when state changes from ANY source (app, physical buttons, timers, sensors)
