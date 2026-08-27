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
- Replaced the HTML hover bubble with an inline SVG bubble to avoid transparent-window clipping artifacts.
- Switched the pet host from an elliptical mask to a bounded transparent canvas so oversized roaches and speech bubbles are not clipped.
- Enlarged the transparent pet canvas and changed hover bubbles to spacious white SVG bubbles with black text and borders.
- Settings now stays open after saving so changes can be previewed continuously.
- Mirrored antenna sway and pointer bias so both antennae keep a balanced length while the roach turns.
- Enlarged and centered the transparent pet canvas to 360x360 so rotated roaches, antennae, legs, and bubbles stay inside the native window.
- Preserved negative native window coordinates at screen edges so the canvas inset does not shift the roach away from the edge.
- Added time-based Cantonese hover dialogue in a dedicated dialogue module.
- Added a configurable startup delay in minutes and seconds; the saved delay is applied on the next launch.
- Kept the native pet windows interactive for hover and click-to-flee; per-pixel click-through would require a Windows hit-test layer.
- Fixed the tray Show action to respect the saved roach count instead of revealing all native pet windows.
- Wrapped hover dialogue text inside an adaptive SVG bubble so longer Cantonese lines stay within the border.
- Reworked the settings action bar so success and error messages stay left of fixed-size buttons without shifting them.
- Anchored hover bubble tails near the roach head and removed the orange hover halo from the black-and-white bubble.
- Joined the bubble body and tail into one SVG outline to remove the visible seam at the tail base.
