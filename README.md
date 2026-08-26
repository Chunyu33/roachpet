# RoachPet

RoachPet is a small Windows desktop pet built with Tauri 2, Rust, React, and TypeScript. Stylized cockroaches wander across the primary display in small transparent always-on-top windows.

## Run

```bash
npm install
npm run tauri:dev
```

Build a Windows installer:

```bash
npm run tauri:build
```

## Current MVP

- Small borderless transparent windows that do not cover Wallpaper Engine or other apps
- Click-through transparent window corners with clickable cockroach hit regions
- Replaceable SVG sprite at `src/assets/roach.svg`
- Smooth movement with edge bouncing, random turns, random idle pauses, and escape behavior
- Three independent roach windows by default (settings support 1–3)
- Behavior values centralized in `src/game/behaviorConfig.ts`

## Structure

- `src/assets`: replaceable visual assets
- `src/components`: roach rendering
- `src/game`: movement and behavior logic
- `src/types`: shared domain types
- `src-tauri/src`: native windows, hit regions, and screen bounds

The system tray menu opens a lightweight settings window for roach count, speed, idle frequency, and escape duration.
