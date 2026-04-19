# 1Love Health — Smart Sauna Controller

A React Native mobile app for controlling a WiFi-enabled infrared sauna dome. Built for 1Love Health, the app lets you manage temperature zones, therapeutic features, saved profiles, and recurring schedules all from your phone.

---

## Features

### Real-Time Temperature Control
- Start/stop sessions with live temperature feedback updated every second
- Control three independent heating zones (Upper, Middle, Lower) with configurable target temperatures
- Animated circular progress ring showing current vs target temperature
- Per-zone progress bars and automatic over-temperature protection

### Therapeutic Features
- **Red Light Therapy** — toggle on/off
- **PEMF (Pulsed Electromagnetic Field)** — 0–30 intensity slider
- **Session Timer** — 5–60 minute countdown with audible end-of-session notification

### Profiles
- Save your current zone temps, features, and timer as a named profile
- Load any saved profile instantly to apply all settings at once
- Full CRUD — create, rename, and delete up to 20 profiles stored locally

### Scheduled Sessions
- Set recurring weekly schedules (any combination of Mon–Sun)
- Each schedule carries its own zone targets, feature config, and duration
- Push notifications fire at schedule time with a one-tap session launch
- Enable/disable individual schedules without deleting them

### Smart Notifications
- **Session Ready** — alerts when target temp is reached (fires once per session to avoid spam)
- **5-Minute Warning** — heads-up before timer expires
- **Session Complete** — notifies when the sauna stops
- All notification types are individually toggleable in Settings

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 + Expo 54 |
| Language | TypeScript 5.9 |
| Styling | NativeWind 4 (TailwindCSS for React Native) |
| Navigation | React Navigation 7 (bottom tabs + native stack) |
| Animations | React Native Reanimated 4 + React Native SVG |
| Storage | AsyncStorage |
| Notifications | Expo Notifications |
| Icons | Lucide React Native |

---

## Architecture

```
MockSaunaController  ←→  Real WiFi Hardware (swap-in)
        ↓
  Event Subscriptions (8 real-time event types)
        ↓
  useSaunaController (custom hook — all state + actions)
        ↓
  Screens & Components
        ↓
  AsyncStorage (persistence)
```

The app is built around a `SaunaController` TypeScript interface that fully specifies the hardware API. The included `MockSaunaController` is a drop-in simulation (1 Hz update loop, realistic heating/cooling rates) — replacing it with a real WiFi controller requires no changes to the UI layer.

### Navigation Structure
```
App
├── Schedule Tab
├── Heat Tab  (main control)
└── Settings Tab
    ├── Profiles → Profile Edit
    └── Schedule Edit
```

### Key Files

| File | Role |
|---|---|
| `src/hooks/useSaunaController.ts` | All state, actions, persistence, and notifications |
| `src/controllers/SaunaControllerInterface.ts` | TypeScript contract for hardware implementations |
| `src/controllers/MockSaunaController.ts` | Simulation with realistic thermal model |
| `src/screens/HeatScreen.tsx` | Primary control UI |
| `src/screens/ProfilesScreen.tsx` | Profile management |
| `src/screens/ScheduleScreen.tsx` | Recurring schedule management |
| `src/utils/scheduleManager.ts` | Schedule execution and notification scheduling |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo`)
- iOS Simulator / Android Emulator, or the Expo Go app

### Install & Run

```bash
git clone https://github.com/your-username/sauna-now.git
cd sauna-now
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

### Connecting Real Hardware

1. Implement the `SaunaController` interface in `src/controllers/SaunaControllerInterface.ts`
2. Replace the `MockSaunaController` import in `src/hooks/useSaunaController.ts` with your implementation
3. No other changes required

---

## Screenshots

> Add screenshots here

---

## License

MIT
