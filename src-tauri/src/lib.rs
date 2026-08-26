use tauri::Manager;
#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{CreateEllipticRgn, SetWindowRgn};

#[derive(serde::Serialize)]
struct ScreenBounds { width: f64, height: f64 }

#[tauri::command]
fn get_screen_bounds(window: tauri::Window) -> Result<ScreenBounds, String> {
    let monitor = window.primary_monitor().map_err(|e| e.to_string())?.ok_or("No primary monitor found")?;
    let size = monitor.size();
    let scale = monitor.scale_factor();
    Ok(ScreenBounds { width: size.width as f64 / scale, height: size.height as f64 / scale })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").ok_or("main window missing")?;
            window.set_always_on_top(true)?;
            window.set_skip_taskbar(true)?;
            #[cfg(windows)]
            apply_roach_hit_region(&window)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_screen_bounds])
        .run(tauri::generate_context!())
        .expect("error while running RoachPet");
}

/// Limit native hit-testing to the cockroach area, so the transparent corners
/// of the small host window do not intercept desktop clicks.
#[cfg(windows)]
fn apply_roach_hit_region(window: &tauri::WebviewWindow) -> tauri::Result<()> {
    let scale = window.scale_factor()?;
    let edge = |value: f64| (value * scale).round() as i32;
    let region = unsafe { CreateEllipticRgn(edge(12.0), edge(12.0), edge(108.0), edge(108.0)) };
    unsafe { SetWindowRgn(window.hwnd()?, Some(region), true) };
    Ok(())
}
