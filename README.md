# RoachPet

RoachPet is a playful Windows desktop pet: animated cockroaches roam your screen in transparent, borderless windows.

## Development

```bash
npm install
npm run tauri:dev
```

## Portable build

```bash
npm run tauri:portable
```

The ZIP is created in `src-tauri/target/release/bundle/`. Windows WebView2 Runtime must already be installed; it is not bundled. RoachPet has no automatic updater.

## Features

- Smooth roaming, idle pauses, short bursts, edge bouncing, and click-to-flee
- 1–10 independently moving cockroaches
- Chinese settings for count, size, movement, escape behavior, and startup delay
- System tray controls and time-based Cantonese hover dialogue
- Native no-activate windows that avoid covering other applications or Wallpaper Engine

## Project layout

- `src/components`: rendering and SVG animation
- `src/game`: movement and behavior logic
- `src/types`: shared domain types
- `src-tauri/src`: native window and screen integration
