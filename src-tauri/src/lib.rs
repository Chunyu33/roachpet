use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, Position, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{CreateEllipticRgn, SetWindowRgn};

const ROACH_WINDOW_COUNT: usize = 3;

#[tauri::command]
fn save_behavior_settings(app: AppHandle, settings: serde_json::Value) -> Result<(), String> {
    // 设置窗口不直接操作其他 WebView，由 Rust 统一转发以避免窗口间状态不同步。
    for label in ["main", "roach-1", "roach-2"] {
        let window = app
            .get_webview_window(label)
            .ok_or_else(|| format!("找不到桌宠窗口: {label}"))?;
        window
            .emit("settings-updated", settings.clone())
            .map_err(|error| format!("向窗口 {label} 广播设置失败: {error}"))?;
    }
    Ok(())
}

#[tauri::command]
fn move_roach_window(window: WebviewWindow, x: f64, y: f64) -> Result<(), String> {
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let physical_x = (x * scale).round() as i32;
    let physical_y = (y * scale).round() as i32;
    window
        .set_position(Position::Physical(PhysicalPosition::new(
            physical_x, physical_y,
        )))
        .map_err(|error| format!("移动桌宠窗口失败: {error}"))
}

#[derive(serde::Serialize)]
struct ScreenBounds {
    width: f64,
    height: f64,
}

#[tauri::command]
fn get_screen_bounds(window: tauri::Window) -> Result<ScreenBounds, String> {
    let monitor = window
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("No primary monitor found")?;
    let size = monitor.size();
    let scale = monitor.scale_factor();
    Ok(ScreenBounds {
        width: size.width as f64 / scale,
        height: size.height as f64 / scale,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .ok_or("main window missing")?;
            configure_roach_window(&window)?;
            // 每只蟑螂使用一个小窗口，避免重新引入全屏透明层遮挡 Wallpaper Engine。
            for index in 1..ROACH_WINDOW_COUNT {
                let label = format!("roach-{index}");
                let child = WebviewWindowBuilder::new(
                    app.handle(),
                    &label,
                    WebviewUrl::App("index.html".into()),
                )
                .title("RoachPet")
                .inner_size(120.0, 120.0)
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .shadow(false)
                .visible(false)
                .position(160.0 * index as f64, 120.0 * index as f64)
                .build()?;
                configure_roach_window(&child)?;
            }
            let settings_item = MenuItemBuilder::with_id("settings", "设置").build(app)?;
            let toggle_item = MenuItemBuilder::with_id("toggle", "显示 / 隐藏蟑螂").build(app)?;
            let exit_item = MenuItemBuilder::with_id("exit", "退出").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&settings_item, &toggle_item, &exit_item])
                .build()?;
            let tray_icon = app
                .default_window_icon()
                .cloned()
                .ok_or("default tray icon missing")?;
            TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
                .menu(&menu)
                .tooltip("RoachPet")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "settings" => {
                        let _ = open_settings_window(app);
                    }
                    "toggle" => toggle_roach_windows(app),
                    "exit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_screen_bounds,
            save_behavior_settings,
            move_roach_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running RoachPet");
}

fn open_settings_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("settings") {
        window.show()?;
        window.set_focus()?;
        return Ok(());
    }
    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("settings.html".into()))
        .title("RoachPet 设置")
        .inner_size(420.0, 360.0)
        .resizable(false)
        .center()
        .build()?;
    Ok(())
}

fn toggle_roach_windows<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let visible = app
        .get_webview_window("main")
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(true);
    for label in ["main", "roach-1", "roach-2"] {
        if let Some(window) = app.get_webview_window(label) {
            let _ = if visible {
                window.hide()
            } else {
                window.show()
            };
        }
    }
}

fn configure_roach_window(window: &WebviewWindow) -> tauri::Result<()> {
    window.set_always_on_top(true)?;
    window.set_skip_taskbar(true)?;
    #[cfg(windows)]
    apply_roach_hit_region(window)?;
    Ok(())
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
