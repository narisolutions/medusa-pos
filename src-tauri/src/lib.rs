// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::collections::HashMap;

use tauri::{Emitter, Manager};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_pos_hardware::printing::{self, Align, PrintOp, PrinterTarget, QrEcc};
use tauri_plugin_pos_hardware::{keyboard, serial, usb, winprint};

mod config;
#[cfg(target_os = "linux")]
mod appimage_integrate;
use config::AppConfig;

/// Logo raster width in dots — 384 is the printable width of an 80mm head.
const LOGO_MAX_WIDTH: u32 = 384;
/// QR module size in dots. At 6, a few-hundred-byte payload stays inside the
/// 384-dot printable width of 80mm paper and a phone still resolves it.
const QR_MODULE_SIZE: u8 = 6;

fn parse_usb_ids(vendor_id: Option<u16>, product_id: Option<u16>) -> Result<(u16, u16), String> {
    match (vendor_id, product_id) {
        (Some(vid), Some(pid)) => Ok((vid, pid)),
        _ => Err("USB printer requires both vendor_id and product_id".to_string()),
    }
}

#[tauri::command]
fn list_system_printers() -> Result<Vec<winprint::SystemPrinterInfo>, String> {
    winprint::list_system_printers()
}

#[tauri::command]
fn list_usb_devices() -> Result<Vec<usb::UsbDeviceInfo>, String> {
    usb::list_usb_devices()
}

fn parse_port(port: Option<String>) -> u16 {
    port.and_then(|p| p.parse().ok()).unwrap_or(9100)
}

fn get_logo_path(app_handle: &tauri::AppHandle<tauri::Wry>) -> Result<String, String> {
    // 1. First check app-local store logo (saved via store settings)
    if let Ok(logos_dir) = app_handle.path().app_local_data_dir() {
        let logos_path = logos_dir.join("logos");
        for ext in ["png", "jpg", "jpeg", "webp"] {
            let path = logos_path.join(format!("store_logo.{}", ext));
            if path.exists() {
                log::info!("Found store logo at: {}", path.display());
                return Ok(path.to_string_lossy().to_string());
            }
        }
    }

    // 2. Fallback to bundled resource (legacy)
    if let Ok(resource_path) = app_handle.path().resolve(
        "resources/store_logo_thermal.png",
        tauri::path::BaseDirectory::Resource,
    ) {
        if resource_path.exists() {
            log::info!("Found bundled logo at: {}", resource_path.display());
            return Ok(resource_path.to_string_lossy().to_string());
        }
    }

    Err("Logo file not found".to_string())
}

fn get_company_header(company_name: Option<&str>) -> &str {
    company_name
        .filter(|s| !s.is_empty())
        .unwrap_or("POS")
}

/// Resolve the frontend's connection fields into a plugin print target.
fn printer_target(
    connection_type: &str,
    address: &str,
    port: Option<String>,
    vendor_id: Option<u16>,
    product_id: Option<u16>,
) -> Result<PrinterTarget, String> {
    match connection_type {
        "network" => Ok(PrinterTarget::Network {
            host: address.to_string(),
            port: parse_port(port),
        }),
        "usb" => {
            let (vendor_id, product_id) = parse_usb_ids(vendor_id, product_id)?;
            Ok(PrinterTarget::Usb {
                vendor_id,
                product_id,
            })
        }
        "local" => Ok(PrinterTarget::System {
            name: address.to_string(),
        }),
        _ => Err("Unsupported connection type".to_string()),
    }
}

fn text(content: &str) -> PrintOp {
    PrintOp::Text {
        text: content.to_string(),
        bold: false,
        align: None,
        size: None,
    }
}

/// Bold, centered store name — the header when no logo file is configured.
fn text_header(header: &str) -> Vec<PrintOp> {
    vec![
        PrintOp::Text {
            text: header.to_string(),
            bold: true,
            align: Some(Align::Center),
            size: None,
        },
        PrintOp::Feed { lines: 1 },
    ]
}

/// Logo raster, or the text header when no logo file exists.
fn header_ops(app_handle: &tauri::AppHandle<tauri::Wry>, header: &str) -> Vec<PrintOp> {
    match get_logo_path(app_handle) {
        Ok(path) => vec![
            PrintOp::Image {
                path,
                max_width: Some(LOGO_MAX_WIDTH),
            },
            PrintOp::Feed { lines: 1 },
        ],
        Err(e) => {
            log::warn!("No logo file ({e}); printing a text header instead");
            text_header(header)
        }
    }
}

/// Run a job, and if it had a logo, retry once with a text header instead.
/// A bad image fails while encoding, before any bytes reach the head, so the
/// retry can't duplicate output — and reconnect-per-job survives it.
fn print_job_with_logo_fallback(
    target: &PrinterTarget,
    header: &str,
    logo_ops: &[PrintOp],
    body: Vec<PrintOp>,
) -> Result<(), String> {
    let mut ops = logo_ops.to_vec();
    ops.extend(body.iter().cloned());

    match printing::print_job(target, &ops) {
        Ok(()) => Ok(()),
        Err(e) if matches!(logo_ops.first(), Some(PrintOp::Image { .. })) => {
            log::warn!("Print with logo failed ({e}); retrying with a text header");
            let mut retry = text_header(header);
            retry.extend(body);
            printing::print_job(target, &retry)
        }
        Err(e) => Err(e),
    }
}

// The argument list is the frontend's invoke contract, not a design choice.
#[allow(clippy::too_many_arguments)]
#[tauri::command]
async fn print_test(
    app_handle: tauri::AppHandle<tauri::Wry>,
    connection_type: String,
    address: String,
    port: Option<String>,
    vendor_id: Option<u16>,
    product_id: Option<u16>,
    company_name: Option<String>,
    app_version: Option<String>,
    datetime: Option<String>,
    store_name: Option<String>,
    sales_channel_name: Option<String>,
) -> Result<(), String> {
    let header = get_company_header(company_name.as_deref());
    log::info!("Starting print test - Connection: {connection_type}, Address: {address}");

    let target = printer_target(&connection_type, &address, port, vendor_id, product_id)?;

    let mut body = vec![
        PrintOp::Text {
            text: "TEST PRINT".to_string(),
            bold: true,
            align: None,
            size: None,
        },
        text("Medusa POS"),
    ];
    if let Some(v) = app_version.filter(|s| !s.is_empty()) {
        body.push(text(&format!("Version {v}")));
    }
    if let Some(dt) = datetime.filter(|s| !s.is_empty()) {
        body.push(text(&dt));
    }
    if let Some(name) = store_name.filter(|s| !s.is_empty()) {
        body.push(text(&format!("Store: {name}")));
    }
    if let Some(channel) = sales_channel_name.filter(|s| !s.is_empty()) {
        body.push(text(&format!("Sales channel: {channel}")));
    }
    body.extend([
        PrintOp::Feed { lines: 1 },
        PrintOp::Text {
            text: "Hello world - Test successful!".to_string(),
            bold: false,
            align: Some(Align::Center),
            size: None,
        },
        PrintOp::Feed { lines: 1 },
        PrintOp::Text {
            text: "Thank you".to_string(),
            bold: false,
            align: Some(Align::Right),
            size: Some((2, 3)),
        },
        PrintOp::Cut,
    ]);

    print_job_with_logo_fallback(&target, header, &header_ops(&app_handle, header), body)
}

#[tauri::command]
async fn open_cash_drawer(
    connection_type: String,
    address: String,
    port: Option<String>,
    vendor_id: Option<u16>,
    product_id: Option<u16>,
) -> Result<(), String> {
    let target = printer_target(&connection_type, &address, port, vendor_id, product_id)?;
    printing::open_cash_drawer(&target)
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
async fn print_receipt(
    app_handle: tauri::AppHandle<tauri::Wry>,
    connection_type: String,
    address: String,
    port: Option<String>,
    vendor_id: Option<u16>,
    product_id: Option<u16>,
    receipt_data: String,
    company_name: Option<String>,
) -> Result<(), String> {
    let header = get_company_header(company_name.as_deref());
    let target = printer_target(&connection_type, &address, port, vendor_id, product_id)?;

    let body = vec![
        text(&receipt_data),
        PrintOp::Feed { lines: 2 },
        PrintOp::Cut,
    ];

    print_job_with_logo_fallback(&target, header, &header_ops(&app_handle, header), body)
}

/// Hand-off ticket: the human-readable section, then the QR the receiving till
/// scans. It can't reuse `print_receipt`, which cuts straight after the body and
/// leaves nowhere to put the code.
#[allow(clippy::too_many_arguments)]
#[tauri::command]
async fn print_handoff_ticket(
    app_handle: tauri::AppHandle<tauri::Wry>,
    connection_type: String,
    address: String,
    port: Option<String>,
    vendor_id: Option<u16>,
    product_id: Option<u16>,
    ticket_text: String,
    qr_payload: String,
    company_name: Option<String>,
) -> Result<(), String> {
    let header = get_company_header(company_name.as_deref());
    let target = printer_target(&connection_type, &address, port, vendor_id, product_id)?;

    let body = vec![
        text(&ticket_text),
        PrintOp::Feed { lines: 1 },
        PrintOp::QrCode {
            data: qr_payload,
            size: Some(QR_MODULE_SIZE),
            correction: Some(QrEcc::M),
        },
        PrintOp::Feed { lines: 2 },
        PrintOp::Cut,
    ];

    print_job_with_logo_fallback(&target, header, &header_ops(&app_handle, header), body)
}

#[tauri::command]
fn list_serial_ports() -> Result<Vec<serial::SerialPortInfo>, String> {
    serial::list_serial_ports()
}

/// Start a reader; framed scans arrive on the `pos-hardware://serial-scan` event.
/// `idle_ms` 0 means terminator-only framing, which is what a COM-mode scanner
/// normally does — an idle fallback costs that latency on every scan.
#[tauri::command]
fn open_serial_scanner(
    app_handle: tauri::AppHandle<tauri::Wry>,
    state: tauri::State<'_, serial::SerialState>,
    path: String,
    baud: u32,
    idle_ms: Option<u64>,
) -> Result<(), String> {
    serial::open_scanner(app_handle, &state, path, baud, idle_ms.unwrap_or(0))
}

#[tauri::command]
fn close_serial_scanner(
    state: tauri::State<'_, serial::SerialState>,
    path: String,
) -> Result<(), String> {
    serial::close_scanner(&state, &path)
}

#[tauri::command]
fn check_physical_keyboard() -> bool {
    keyboard::has_physical_keyboard()
}

#[tauri::command]
fn toggle_virtual_keyboard() {
    keyboard::toggle_virtual_keyboard();
}

#[tauri::command]
fn check_config_exists() -> bool {
    AppConfig::exists()
}

#[tauri::command]
fn load_config() -> Result<AppConfig, String> {
    match AppConfig::load() {
        Ok(config) => {
            log::info!("Configuration loaded successfully");
            Ok(config)
        }
        Err(e) => {
            log::error!("Failed to load configuration: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
fn set_active_backend(store_id: String) -> Result<(), String> {
    let mut config = AppConfig::load().map_err(|e| e.to_string())?;
    match config.store_urls.get(&store_id) {
        Some(url) => {
            config.backend_url = url.clone();
            config.save().map_err(|e| {
                log::error!("Failed to save configuration: {}", e);
                e.to_string()
            })
        }
        None => Err(format!("Store ID {} not found in store_urls", store_id)),
    }
}

#[tauri::command]
fn clear_active_backend() -> Result<(), String> {
    let mut config = AppConfig::load().unwrap_or_else(|_| AppConfig {
        backend_url: String::new(),
        store_urls: HashMap::new(),
    });
    config.backend_url = String::new();
    config.save().map_err(|e| {
        log::error!("Failed to save configuration: {}", e);
        e.to_string()
    })
}

#[tauri::command]
fn save_store_url(store_id: String, backend_url: String) -> Result<(), String> {
    let mut config = AppConfig::load().unwrap_or_else(|_| AppConfig {
        backend_url: backend_url.clone(),
        store_urls: HashMap::new(),
    });
    config.store_urls.insert(store_id, backend_url);
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
fn load_store_urls() -> Result<HashMap<String, String>, String> {
    match AppConfig::load() {
        Ok(config) => Ok(config.store_urls),
        Err(_) => Ok(HashMap::new()),
    }
}

#[tauri::command]
fn delete_store_url(store_id: String) -> Result<(), String> {
    if let Ok(mut config) = AppConfig::load() {
        config.store_urls.remove(&store_id);
        config.save().map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn debug_config_info() -> Result<String, String> {
    let mut debug_info = String::new();

    // Add OS info
    debug_info.push_str(&format!("OS: {}\n", std::env::consts::OS));

    // Add environment variables
    if let Ok(home) = std::env::var("HOME") {
        debug_info.push_str(&format!("HOME: {}\n", home));
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        debug_info.push_str(&format!("APPDATA: {}\n", appdata));
    }
    if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
        debug_info.push_str(&format!("LOCALAPPDATA: {}\n", localappdata));
    }

    // Add config file path
    match AppConfig::config_file_path() {
        Ok(path) => {
            debug_info.push_str(&format!("Config path: {}\n", path.display()));
            debug_info.push_str(&format!("Config exists: {}\n", path.exists()));
        }
        Err(e) => {
            debug_info.push_str(&format!("Config path error: {}\n", e));
        }
    }

    // Try to load config
    match AppConfig::load() {
        Ok(config) => {
            debug_info.push_str("Config loaded successfully\n");
            debug_info.push_str(&format!("Backend URL: {}\n", config.backend_url));
        }
        Err(e) => {
            debug_info.push_str(&format!("Config load error: {}\n", e));
        }
    }

    Ok(debug_info)
}

#[tauri::command]
fn get_config_file_path() -> Result<String, String> {
    match AppConfig::config_file_path() {
        Ok(path) => {
            let path_str = path.to_string_lossy().to_string();
            Ok(path_str)
        }
        Err(e) => {
            log::error!("Failed to get config file path: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
fn save_logo_file(
    app_handle: tauri::AppHandle<tauri::Wry>,
    bytes: Vec<u8>,
    extension: String,
) -> Result<String, String> {
    let logos_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("logos");

    std::fs::create_dir_all(&logos_dir).map_err(|e| e.to_string())?;

    for ext in ["png", "jpg", "jpeg", "webp", "svg"] {
        let old = logos_dir.join(format!("store_logo.{}", ext));
        if old.exists() {
            let _ = std::fs::remove_file(&old);
        }
    }

    let file_path = logos_dir.join(format!("store_logo.{}", extension));
    std::fs::write(&file_path, bytes).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_logo_file(app_handle: tauri::AppHandle<tauri::Wry>) -> Result<(), String> {
    let logos_dir = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("logos");

    for ext in ["png", "jpg", "jpeg", "webp", "svg"] {
        let path = logos_dir.join(format!("store_logo.{}", ext));
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn debug_logo_path(app_handle: tauri::AppHandle<tauri::Wry>) -> Result<String, String> {
    let mut debug_info = String::new();

    // Add current working directory
    if let Ok(cwd) = std::env::current_dir() {
        debug_info.push_str(&format!("Current working directory: {}\n", cwd.display()));
    } else {
        debug_info.push_str("Failed to get current working directory\n");
    }

    // Try to get logo path
    match get_logo_path(&app_handle) {
        Ok(path) => {
            debug_info.push_str(&format!("Logo path resolved: {}\n", path));

            // Check if file exists and get info
            let logo_path = std::path::Path::new(&path);
            if logo_path.exists() {
                debug_info.push_str("Logo file exists: true\n");

                if let Ok(metadata) = logo_path.metadata() {
                    debug_info.push_str(&format!("Logo file size: {} bytes\n", metadata.len()));
                }
            } else {
                debug_info.push_str("Logo file exists: false\n");
            }
        }
        Err(e) => {
            debug_info.push_str(&format!("Logo path resolution failed: {}\n", e));
        }
    }

    // Try different base directories
    let base_dirs = vec![
        ("Resource", tauri::path::BaseDirectory::Resource),
        ("AppData", tauri::path::BaseDirectory::AppData),
        ("AppLocalData", tauri::path::BaseDirectory::AppLocalData),
        ("AppConfig", tauri::path::BaseDirectory::AppConfig),
    ];

    for (name, base_dir) in base_dirs {
        if let Ok(path) = app_handle.path().resolve("", base_dir) {
            debug_info.push_str(&format!("{} directory: {}\n", name, path.display()));
        }
    }

    Ok(debug_info)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Work around WebKitGTK EGL crash in AppImage builds. The bundled Mesa/EGL
    // libraries from Ubuntu 22.04 conflict with the host system's GPU stack on
    // distros like Manjaro/Fedora, causing a blank white screen with
    // "Could not create default EGL display: EGL_BAD_PARAMETER".
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            unsafe { std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1"); }
        }
    }

    // Set log level based on build mode
    // Debug mode: show all logs (Debug, Info, Warn, Error)
    // Release mode: only show warnings and errors (more secure, less verbose)
    let log_level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Warn
    };

    tauri::Builder::default()
        .manage(serial::SerialState::default())
        .setup(|app| {
            // On Linux AppImage builds, offer to integrate into the apps menu
            // and relaunch from a stable install path on first run. No-ops when
            // not running as an AppImage. Spawned so it never blocks startup.
            #[cfg(target_os = "linux")]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    appimage_integrate::maybe_integrate(&handle).await;
                });
            }

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last_state = keyboard::has_physical_keyboard();
                log::info!("Initial keyboard state: has_physical={}", last_state);
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(10));
                    let current = keyboard::has_physical_keyboard();
                    if current != last_state {
                        log::info!("Keyboard state changed: has_physical={}", current);
                        let _ = handle.emit("keyboard-state-changed", current);
                        last_state = current;
                    }
                }
            });
            Ok(())
        })
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    // Always write to log directory for troubleshooting
                    Target::new(TargetKind::LogDir { file_name: None }),
                    // Only show logs in webview during development
                    #[cfg(debug_assertions)]
                    Target::new(TargetKind::Webview),
                ])
                .level(log_level)
                .level_for("reqwest", log::LevelFilter::Warn)
                .level_for("rustls_platform_verifier", log::LevelFilter::Warn)
                .level_for("tauri_plugin_updater", log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            check_physical_keyboard,
            toggle_virtual_keyboard,
            list_serial_ports,
            open_serial_scanner,
            close_serial_scanner,
            print_test,
            open_cash_drawer,
            print_receipt,
            print_handoff_ticket,
            list_usb_devices,
            list_system_printers,
            check_config_exists,
            load_config,
            set_active_backend,
            clear_active_backend,
            save_store_url,
            load_store_urls,
            delete_store_url,
            get_config_file_path,
            debug_config_info,
            debug_logo_path,
            save_logo_file,
            delete_logo_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
