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
