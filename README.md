# RoachPet

RoachPet is a small Windows desktop pet built with Tauri 2, Rust, React, and TypeScript. Stylized cockroaches wander across the primary display in small transparent always-on-top windows.

## Run

```bash
npm install
npm run tauri:dev
```

Build a portable Windows release:

```bash
npm run tauri:portable
```

The ZIP is written to `src-tauri/target/release/bundle/`. Windows WebView2 Runtime must already be installed; it is not bundled. RoachPet does not provide automatic updates.

## Current MVP

- Small borderless transparent windows that do not cover Wallpaper Engine or other apps
- Click-through transparent window corners with clickable cockroach hit regions
- Structured inline SVG sprite (`src/components/RoachSprite.tsx`) with independently animated legs, head, abdomen, and antennae
- Smooth acceleration/deceleration, curved turns, edge bouncing, random idle pauses, short run bursts, and flee behavior
- One roach window by default (settings support 1–10 independent roaches)
- Behavior values centralized in `src/game/behaviorConfig.ts`

## Structure

- `src/assets`: replaceable visual assets and future sprite files
- `src/components`: roach rendering and SVG animation
- `src/game`: movement and behavior logic
- `src/types`: shared domain types
- `src-tauri/src`: native windows, hit regions, and screen bounds

The system tray menu opens a lightweight settings window for roach count, speed, idle frequency, and escape duration.
