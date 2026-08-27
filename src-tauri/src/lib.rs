use std::{
    collections::HashMap,
    sync::{Mutex, OnceLock},
};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, Position, State, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
#[cfg(windows)]
use windows::core::BOOL;
#[cfg(windows)]
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{CreateRectRgn, SetWindowRgn};
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{
    CallWindowProcW, DefWindowProcW, EnumChildWindows, GetWindowLongPtrW, IsWindowVisible,
    SetWindowLongPtrW, SetWindowPos, ShowWindow, GWLP_WNDPROC, GWL_EXSTYLE, GWL_STYLE,
    MA_NOACTIVATE, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, SW_HIDE,
    SW_SHOWNOACTIVATE, WM_MOUSEACTIVATE, WM_NCACTIVATE, WNDPROC, WS_BORDER, WS_CAPTION,
    WS_EX_CLIENTEDGE, WS_EX_DLGMODALFRAME, WS_EX_NOACTIVATE, WS_EX_STATICEDGE, WS_EX_WINDOWEDGE,
    WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU, WS_THICKFRAME,
};

#[cfg(windows)]
static ORIGINAL_WND_PROCS: OnceLock<Mutex<HashMap<isize, isize>>> = OnceLock::new();

const ROACH_WINDOW_COUNT: usize = 10;
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
    for index in 0..ROACH_WINDOW_COUNT {
        let label = if index == 0 {
            "main".to_string()
        } else {
            format!("roach-{index}")
        };
        let window = app
            .get_webview_window(&label)
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

#[tauri::command]
fn set_roach_window_visibility(window: WebviewWindow, visible: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        // 绕过 Tauri/Tao 的 set_visible，避免显示时重新写回标题栏样式。
        let command = if visible { SW_SHOWNOACTIVATE } else { SW_HIDE };
        unsafe {
            let _ = ShowWindow(
                window
                    .hwnd()
                    .map_err(|error| format!("获取桌宠窗口句柄失败: {error}"))?,
                command,
            );
        }
        return Ok(());
    }
    #[cfg(not(windows))]
    window
        .set_visible(visible)
        .map_err(|error| format!("切换桌宠窗口可见性失败: {error}"))
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
                .focused(false)
                .focusable(false)
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
            move_roach_window,
            set_roach_window_visibility
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
        .and_then(|window| {
            #[cfg(windows)]
            {
                window
                    .hwnd()
                    .ok()
                    .map(|hwnd| unsafe { IsWindowVisible(hwnd).as_bool() })
            }
            #[cfg(not(windows))]
            window.is_visible().ok()
        })
        .unwrap_or(true);
    for index in 0..ROACH_WINDOW_COUNT {
        if index >= configured_count {
            continue;
        }
        let label = if index == 0 {
            "main".to_string()
        } else {
            format!("roach-{index}")
        };
        if let Some(window) = app.get_webview_window(&label) {
            if visible {
                let _ = set_native_window_visibility(&window, false);
            } else {
                // 原生样式在窗口创建时已配置，直接使用无激活显示避免边框重建。
                let _ = set_native_window_visibility(&window, true);
            }
        }
    }
}

fn set_native_window_visibility<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
    visible: bool,
) -> tauri::Result<()> {
    #[cfg(windows)]
    {
        let command = if visible { SW_SHOWNOACTIVATE } else { SW_HIDE };
        unsafe {
            let _ = ShowWindow(window.hwnd()?, command);
        }
        return Ok(());
    }
    #[cfg(not(windows))]
    window.set_visible(visible)
}

fn configure_roach_window<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
) -> tauri::Result<()> {
    window.set_always_on_top(true)?;
    window.set_skip_taskbar(true)?;
    // 桌宠只需要鼠标消息，不应因透明区域点击抢走其他应用焦点或触发非客户区绘制。
    window.set_focusable(false)?;
    #[cfg(windows)]
    {
        // 窗口仍处于隐藏状态时清理一次原生样式，后续 show 不再触发非客户区重建。
        remove_native_frame(window)?;
        apply_roach_hit_region(window)?;
    }
    Ok(())
}

/// Windows 透明窗口在获得焦点时可能重新绘制非客户区，显式清掉样式位可阻止标题栏闪现。
#[cfg(windows)]
fn remove_native_frame<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) -> tauri::Result<()> {
    let hwnd = window.hwnd()?;
    let style_mask =
        (WS_BORDER | WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU).0
            as isize;
    let extended_style_mask =
        (WS_EX_CLIENTEDGE | WS_EX_DLGMODALFRAME | WS_EX_STATICEDGE | WS_EX_WINDOWEDGE).0 as isize;
    unsafe {
        let current_style = GetWindowLongPtrW(hwnd, GWL_STYLE);
        SetWindowLongPtrW(hwnd, GWL_STYLE, current_style & !style_mask);
        let current_extended_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        SetWindowLongPtrW(
            hwnd,
            GWL_EXSTYLE,
            (current_extended_style & !extended_style_mask) | WS_EX_NOACTIVATE.0 as isize,
        );
        install_no_activate_proc(hwnd);
        // 鼠标实际通常命中 WebView2 子窗口，因此父窗口之外也要拦截其激活消息。
        let _ = EnumChildWindows(Some(hwnd), Some(install_child_no_activate_proc), LPARAM(0));
        // 通知 DWM 按新的无边框样式重算非客户区，但不改变窗口位置、尺寸或激活状态。
        SetWindowPos(
            hwnd,
            None,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        )
        .map_err(|error| tauri::Error::Io(std::io::Error::other(error.to_string())))?;
    }
    Ok(())
}

#[cfg(windows)]
unsafe extern "system" fn install_child_no_activate_proc(hwnd: HWND, _: LPARAM) -> BOOL {
    install_no_activate_proc(hwnd);
    BOOL(1)
}

#[cfg(windows)]
fn install_no_activate_proc(hwnd: HWND) {
    let procedures = ORIGINAL_WND_PROCS.get_or_init(|| Mutex::new(HashMap::new()));
    let mut procedures = match procedures.lock() {
        Ok(value) => value,
        Err(_) => return,
    };
    if procedures.contains_key(&(hwnd.0 as isize)) {
        return;
    }
    unsafe {
        let previous = SetWindowLongPtrW(
            hwnd,
            GWLP_WNDPROC,
            roach_window_proc as *const () as usize as isize,
        );
        if previous != 0 {
            procedures.insert(hwnd.0 as isize, previous);
        }
    }
}

#[cfg(windows)]
unsafe extern "system" fn roach_window_proc(
    hwnd: HWND,
    message: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if message == WM_MOUSEACTIVATE {
        // 保留鼠标消息分发，但禁止点击桌宠窗口时激活它或触发非客户区绘制。
        return LRESULT(MA_NOACTIVATE as isize);
    }
    if message == WM_NCACTIVATE {
        // 即使系统发送了非客户区激活消息，也不让默认窗口过程绘制标题栏边框。
        return LRESULT(1);
    }
    let previous = ORIGINAL_WND_PROCS
        .get()
        .and_then(|procedures| procedures.lock().ok())
        .and_then(|procedures| procedures.get(&(hwnd.0 as isize)).copied());
    if let Some(previous) = previous {
        let previous: WNDPROC = Some(std::mem::transmute(previous));
        return CallWindowProcW(previous, hwnd, message, wparam, lparam);
    }
    DefWindowProcW(hwnd, message, wparam, lparam)
}

/// Keep the native host canvas bounded to the small pet area while allowing
/// rotated legs, long antennae, and speech bubbles to render without clipping.
#[cfg(windows)]
fn apply_roach_hit_region<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
) -> tauri::Result<()> {
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
