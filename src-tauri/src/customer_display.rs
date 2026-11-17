//! The customer display: a second, buyer-facing window on another monitor of this till.
//! The window is made here rather than from the webview, so the frontend needs no
//! permission to create windows or move them between monitors.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder, WindowEvent};

/// Matches `CUSTOMER_DISPLAY_WINDOW` in the frontend and `capabilities/customer-display.json`.
pub const LABEL: &str = "customer-display";
pub const MAIN_LABEL: &str = "main";

/// The display only listens: it has no use for any of the app's commands (printing, the
/// cash drawer, the backend address), so none is answered there.
pub fn may_invoke_commands(window_label: &str) -> bool {
    window_label != LABEL
}

/// Wraps the app's command handler so a call from the display's window is refused.
pub fn till_only<R: tauri::Runtime>(
    handler: impl Fn(tauri::ipc::Invoke<R>) -> bool + Send + Sync + 'static,
) -> impl Fn(tauri::ipc::Invoke<R>) -> bool + Send + Sync + 'static {
    move |invoke| {
        if may_invoke_commands(invoke.message.webview_ref().label()) {
            handler(invoke)
        } else {
            invoke.resolver.reject("not available to the customer display");
            true
        }
    }
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub name: Option<String>,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    /// The monitor the till's own window is on: never the place for the customer's screen.
    pub is_till: bool,
}

#[derive(Deserialize, Clone, Debug)]
pub struct MonitorRef {
    pub name: Option<String>,
    pub x: i32,
    pub y: i32,
}

/// The saved monitor among those connected: name and position first, then the name alone
/// (a rearranged desk), then the position alone (a name the OS reports differently).
/// None while the till's own screen is unknown: then nothing rules it out as the target.
pub fn pick_monitor<'a>(wanted: &MonitorRef, available: &'a [MonitorInfo]) -> Option<&'a MonitorInfo> {
    if !available.iter().any(|m| m.is_till) {
        return None;
    }
    let candidates = available.iter().filter(|m| !m.is_till);
    let by_name = |m: &&MonitorInfo| wanted.name.is_some() && m.name == wanted.name;
    let by_position = |m: &&MonitorInfo| m.x == wanted.x && m.y == wanted.y;
    candidates
        .clone()
        .find(|m| by_name(m) && by_position(m))
        .or_else(|| candidates.clone().find(by_name))
        .or_else(|| candidates.clone().find(by_position))
}

fn monitors(app: &AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let till = app
        .get_webview_window(MAIN_LABEL)
        .and_then(|w| w.current_monitor().ok().flatten())
        .map(|m| (*m.position(), m.name().cloned()));
    let all = app.available_monitors().map_err(|e| e.to_string())?;
    Ok(all
        .iter()
        .map(|m| MonitorInfo {
            name: m.name().cloned(),
            x: m.position().x,
            y: m.position().y,
            width: m.size().width,
            height: m.size().height,
            is_till: till.as_ref().is_some_and(|(pos, name)| *pos == *m.position() && *name == m.name().cloned()),
        })
        .collect())
}

#[tauri::command]
pub async fn list_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
    monitors(&app)
}

/// Opens the display on the saved monitor, or leaves it where it is when it is already
/// there. Closes it and answers `false` when that monitor is not connected, so an
/// unplugged screen never drags the window over the till.
#[tauri::command]
pub async fn ensure_customer_display(app: AppHandle, monitor: MonitorRef) -> Result<bool, String> {
    let available = monitors(&app)?;
    let Some(target) = pick_monitor(&monitor, &available).cloned() else {
        close(&app);
        return Ok(false);
    };
    let inside = PhysicalPosition::new(target.x + 40, target.y + 40);

    if let Some(window) = app.get_webview_window(LABEL) {
        let current = window.current_monitor().ok().flatten().map(|m| *m.position());
        if current != Some(PhysicalPosition::new(target.x, target.y)) {
            let _ = window.set_fullscreen(false);
            window.set_position(inside).map_err(|e| e.to_string())?;
            window.set_fullscreen(true).map_err(|e| e.to_string())?;
        }
        return Ok(true);
    }

    let mut builder = WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::App("index.html".into()))
        .title("Customer display")
        .decorations(false)
        // Never focusable: a tap on the customer's screen must not take the scanner's keystrokes.
        .focusable(false)
        .focused(false)
        .skip_taskbar(true)
        .visible(false)
        .background_color(tauri::webview::Color(9, 9, 11, 255));
    // WebView2 refuses a second webview in the same data directory with other browser arguments.
    if let Some(args) = main_browser_args(&app) {
        builder = builder.additional_browser_args(&args);
    }
    let window = builder.build().map_err(|e| e.to_string())?;
    window.set_position(inside).map_err(|e| e.to_string())?;
    window.set_fullscreen(true).map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;

    // Should the OS focus it anyway, the till takes focus straight back.
    let handle = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Focused(true) = event {
            if let Some(main) = handle.get_webview_window(MAIN_LABEL) {
                let _ = main.set_focus();
            }
        }
    });
    if let Some(main) = app.get_webview_window(MAIN_LABEL) {
        let _ = main.set_focus();
    }
    Ok(true)
}

/// The main window's browser arguments, as configured, so the two can never drift apart.
fn main_browser_args(app: &AppHandle) -> Option<String> {
    app.config()
        .app
        .windows
        .iter()
        .find(|window| window.label == MAIN_LABEL)
        .and_then(|window| window.additional_browser_args.clone())
}

pub fn close(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(LABEL) {
        let _ = window.destroy();
    }
}

#[tauri::command]
pub async fn close_customer_display(app: AppHandle) {
    close(&app);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn monitor(name: &str, x: i32, is_till: bool) -> MonitorInfo {
        MonitorInfo { name: Some(name.into()), x, y: 0, width: 1920, height: 1080, is_till }
    }

    fn wanted(name: Option<&str>, x: i32) -> MonitorRef {
        MonitorRef { name: name.map(Into::into), x, y: 0 }
    }

    #[test]
    fn finds_the_saved_monitor() {
        let all = [monitor("DP-1", 0, true), monitor("HDMI-1", 1920, false)];
        assert_eq!(pick_monitor(&wanted(Some("HDMI-1"), 1920), &all).unwrap().x, 1920);
    }

    #[test]
    fn follows_a_monitor_moved_on_the_desk_by_its_name() {
        let all = [monitor("DP-1", 0, true), monitor("HDMI-1", -1280, false)];
        assert_eq!(pick_monitor(&wanted(Some("HDMI-1"), 1920), &all).unwrap().x, -1280);
    }

    #[test]
    fn falls_back_to_the_position_when_the_name_changed() {
        let all = [monitor("DP-1", 0, true), monitor("Generic PnP", 1920, false)];
        assert_eq!(pick_monitor(&wanted(Some("HDMI-1"), 1920), &all).unwrap().x, 1920);
    }

    #[test]
    fn is_none_when_the_monitor_is_unplugged() {
        let all = [monitor("DP-1", 0, true)];
        assert!(pick_monitor(&wanted(Some("HDMI-1"), 1920), &all).is_none());
    }

    #[test]
    fn never_picks_the_tills_own_screen() {
        let all = [monitor("DP-1", 0, true)];
        assert!(pick_monitor(&wanted(Some("DP-1"), 0), &all).is_none());
    }

    #[test]
    fn picks_nothing_while_the_tills_screen_is_unknown() {
        let all = [monitor("DP-1", 0, false), monitor("HDMI-1", 1920, false)];
        assert!(pick_monitor(&wanted(Some("HDMI-1"), 1920), &all).is_none());
        assert!(pick_monitor(&wanted(None, 0), &all).is_none());
    }

    #[test]
    fn answers_commands_to_the_till_only() {
        assert!(may_invoke_commands(MAIN_LABEL));
        assert!(!may_invoke_commands(LABEL));
    }
}
