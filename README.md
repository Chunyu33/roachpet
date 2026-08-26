# RoachPet

RoachPet is a tiny Windows desktop pet built with Tauri 2, Rust, React, and TypeScript. A CSS placeholder cockroach walks around the primary display inside a small transparent always-on-top window.

## Run

```bash
npm install
npm run tauri:dev
```

Build a Windows installer:

```bash
npm run tauri:build
```

## MVP

- Borderless transparent topmost window
- Small moving window, so Wallpaper Engine and other apps remain usable
- Smooth walking with random direction changes and edge bouncing
- Automatic left/right facing
- Click to trigger a short escape run
- Dev-only state/position debug label

## Structure

- `src/components`: cockroach view and CSS
- `src/game`: movement and behavior logic
- `src/types`: shared domain types
- `src-tauri/src`: Tauri startup and screen bounds command

Future extensions include real image assets, configurable behavior, multiple roaches, sound, spray/death effects, Guangdong mode, and a system tray menu.
