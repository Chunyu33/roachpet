# Changelog

## Unreleased

- Added a replaceable stylized SVG cockroach asset.
- Added centralized behavior configuration with validation.
- Added random idle pauses and independent roach state updates.
- Added three small native roach windows so multiple pets remain compatible with Wallpaper Engine and click-through desktop interaction.
- Added a system tray menu with Show / Hide, Settings, and Exit actions.
- Added a lightweight settings window with live behavior updates.
- Localized the settings UI and tray actions in Chinese.
- Improved the settings layout with a fixed bottom action bar and coordinated scrolling.
- Made settings delivery explicit through a Rust-side broadcast command.
- Fixed settings save delivery by routing the payload through a Rust command.
- Fixed native pet positioning by moving each host window through Rust.
- Increased roaming visibility with independent two-dimensional movement and edge bouncing.
- Added structured SVG insect animation with alternating tripod gait, independent head and antenna motion, and subtle body bob.
- Added smooth acceleration/deceleration, curved turns, occasional run bursts, and flee direction based on the click position.
- Corrected mirrored leg coordinates so all six legs render on both sides.
- Removed the dev overlay background that could appear as a gray half-dome inside the clipped transparent window.
- Extended antennae for a more recognizable silhouette.
- Persisted the saved roach count on startup and hide unused native pet windows immediately.
- Refined settings spacing, scrollbar placement, and button sizing; removed the dev overlay artifact from pet windows.
