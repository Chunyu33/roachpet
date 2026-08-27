use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, Position, State, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{CreateRectRgn, SetWindowRgn};

const ROACH_WINDOW_COUNT: usize = 3;
// 透明宿主需覆盖最大旋转包围盒，避免腿、触须和气泡被窗口边缘裁剪。
const ROACH_CANVAS_SIZE: f64 = 360.0;

#[tauri::command]
fn save_behavior_settings(
    app: AppHandle,
    configured_count: State<'_, Mutex<usize>>,
    settings: serde_json::Value,
) -> Result<(), String> {
    // Rust 记录数量供托盘菜单使用，避免显示操作绕过前端设置状态。
    let count = settings
        .get("roachCount")
        .and_then(serde_json::Value::as_u64)
        .map(|value| value as usize)
        .unwrap_or(1)
        .clamp(1, ROACH_WINDOW_COUNT);
    *configured_count
        .lock()
        .map_err(|_| "桌宠数量状态锁定失败".to_string())? = count;
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
fn set_roach_count(configured_count: State<'_, Mutex<usize>>, count: usize) -> Result<(), String> {
    // 启动时前端把 localStorage 中的数量同步过来，确保托盘首次显示也遵循设置。
    *configured_count
        .lock()
        .map_err(|_| "桌宠数量状态锁定失败".to_string())? = count.clamp(1, ROACH_WINDOW_COUNT);
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
        .manage(Mutex::new(1usize))
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
                .inner_size(ROACH_CANVAS_SIZE, ROACH_CANVAS_SIZE)
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
            set_roach_count,
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
    let configured_count = app
        .try_state::<Mutex<usize>>()
        .and_then(|state| state.lock().ok().map(|count| *count))
        .unwrap_or(1)
        .clamp(1, ROACH_WINDOW_COUNT);
    let visible = app
        .get_webview_window("main")
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(true);
    for (index, label) in ["main", "roach-1", "roach-2"].into_iter().enumerate() {
        if index >= configured_count {
            continue;
        }
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

/// Keep the native host canvas bounded to the small pet area while allowing
/// rotated legs, long antennae, and speech bubbles to render without clipping.
#[cfg(windows)]
fn apply_roach_hit_region(window: &tauri::WebviewWindow) -> tauri::Result<()> {
    let scale = window.scale_factor()?;
    let edge = |value: f64| (value * scale).round() as i32;
    // Use a transparent rectangular canvas instead of an ellipse. The old
    // ellipse clipped long antennae, rotated legs, and hover speech bubbles.
    // 透明宿主限制在 360x360，只覆盖桌宠附近区域，避免影响其他应用。
    let region = unsafe {
        CreateRectRgn(
            edge(0.0),
            edge(0.0),
            edge(ROACH_CANVAS_SIZE),
            edge(ROACH_CANVAS_SIZE),
        )
    };
    unsafe { SetWindowRgn(window.hwnd()?, Some(region), true) };
    Ok(())
}
