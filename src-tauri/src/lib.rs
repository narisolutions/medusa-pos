// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::collections::HashMap;
use std::time::Duration;

use escpos::{
    driver::*, errors::PrinterError, printer::Printer, printer_options::PrinterOptions, utils::*,
};
use tauri::Manager;
use tauri::WebviewWindowBuilder;
use tauri_plugin_log::{Target, TargetKind};

mod config;
use config::AppConfig;

// Helper function for Georgian text handling
fn configure_printer_for_georgian<T>(
    _printer: &mut Printer<T>,
    text: &str,
) -> Result<(), PrinterError>
where
    T: Driver,
{
    // Check if text contains Georgian characters
    let has_georgian = text.chars().any(|c| {
        // Georgian Unicode ranges
        (c >= '\u{10A0}' && c <= '\u{10FF}') || // Georgian
        (c >= '\u{2D00}' && c <= '\u{2D2F}') // Georgian Supplement
    });

    if has_georgian {
        log::info!(
            "Georgian text detected in receipt: {} characters",
            text.chars()
                .filter(|c| (c >= &'\u{10A0}' && c <= &'\u{10FF}')
                    || (c >= &'\u{2D00}' && c <= &'\u{2D2F}'))
                .count()
        );
        log::info!("Printer will send Georgian text as UTF-8 - ensure printer supports Unicode");

        // Rust automatically handles UTF-8 encoding
        // Modern thermal printers should handle UTF-8 Georgian characters
        // If characters appear as ? or □, the printer firmware doesn't support Georgian
    }

    Ok(())
}

// Helper function for error mapping
fn map_printer_error<T>(result: Result<T, PrinterError>) -> Result<T, String> {
    result.map_err(|e| e.to_string())
}

fn create_network_printer(
    address: &str,
    port_num: u16,
) -> Result<Printer<NetworkDriver>, PrinterError> {
    let driver = NetworkDriver::open(address, port_num, Some(Duration::from_secs(5)))?;
    Ok(Printer::new(
        driver,
        Protocol::default(),
        Some(PrinterOptions::default()),
    ))
}

fn create_usb_printer(vendor_id: u16, product_id: u16) -> Result<Printer<NativeUsbDriver>, PrinterError> {
    let driver = NativeUsbDriver::open(vendor_id, product_id)?;
    Ok(Printer::new(
        driver,
        Protocol::default(),
        Some(PrinterOptions::default()),
    ))
}

fn parse_usb_ids(vendor_id: Option<u16>, product_id: Option<u16>) -> Result<(u16, u16), String> {
    match (vendor_id, product_id) {
        (Some(vid), Some(pid)) => Ok((vid, pid)),
        _ => Err("USB printer requires both vendor_id and product_id".to_string()),
    }
}

#[derive(serde::Serialize, Clone)]
struct UsbDeviceInfo {
    vendor_id: u16,
    product_id: u16,
    description: String,
}

#[tauri::command]
fn list_usb_devices() -> Result<Vec<UsbDeviceInfo>, String> {
    let devices = rusb::devices().map_err(|e| format!("Failed to enumerate USB devices: {}", e))?;
    let mut result = Vec::new();

    for device in devices.iter() {
        let desc = match device.device_descriptor() {
            Ok(d) => d,
            Err(_) => continue,
        };

        // USB class 7 = Printer. Also include composite devices (class 0)
        // whose interfaces may be printers.
        let dominated_by_printer_class = desc.class_code() == 7;
        let is_composite = desc.class_code() == 0;

        let has_printer_interface = if is_composite {
            if let Ok(config) = device.active_config_descriptor() {
                config.interfaces().any(|iface| {
                    iface.descriptors().any(|id| id.class_code() == 7)
                })
            } else {
                false
            }
        } else {
            false
        };

        if !dominated_by_printer_class && !has_printer_interface {
            continue;
        }

        let handle = device.open().ok();
        let manufacturer = handle
            .as_ref()
            .and_then(|h| h.read_manufacturer_string_ascii(&desc).ok())
            .unwrap_or_default();
        let product = handle
            .as_ref()
            .and_then(|h| h.read_product_string_ascii(&desc).ok())
            .unwrap_or_default();

        let description = if !manufacturer.is_empty() && !product.is_empty() {
            format!("{} {}", manufacturer, product)
        } else if !product.is_empty() {
            product
        } else if !manufacturer.is_empty() {
            manufacturer
        } else {
            format!("USB Printer ({:04x}:{:04x})", desc.vendor_id(), desc.product_id())
        };

        result.push(UsbDeviceInfo {
            vendor_id: desc.vendor_id(),
            product_id: desc.product_id(),
            description,
        });
    }

    Ok(result)
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

fn print_test_page<T: Driver>(
    printer: &mut Printer<T>,
    app_handle: &tauri::AppHandle<tauri::Wry>,
    header: &str,
    app_version: Option<&str>,
    datetime: Option<&str>,
    store_name: Option<&str>,
    sales_channel_name: Option<&str>,
) -> Result<(), String> {
    map_printer_error(printer.init())?;

    let test_georgian = "ტესტი - Test Print - ქართული";
    map_printer_error(configure_printer_for_georgian(printer, test_georgian))?;

    map_printer_error(printer.justify(JustifyMode::CENTER))?;

    match get_logo_path(app_handle) {
        Ok(logo_path) => {
            log::info!("Test print: Using logo path: {}", logo_path);
            let image_configs = vec![
                (Some(384), None, BitImageSize::Normal),
                (Some(256), None, BitImageSize::Normal),
                (Some(192), None, BitImageSize::Normal),
                (None, None, BitImageSize::Normal),
                (Some(384), None, BitImageSize::DoubleWidth),
                (Some(384), None, BitImageSize::DoubleHeight),
            ];

            let mut logo_printed = false;
            for (width, height, size) in image_configs {
                match BitImageOption::new(width, height, size) {
                    Ok(bit_image_option) => {
                        log::info!("Test print: Trying image config - width: {:?}, height: {:?}, size: {:?}", width, height, size);
                        match printer.bit_image_option(&logo_path, bit_image_option) {
                            Ok(_) => {
                                log::info!("Test print: Logo printed successfully with config - width: {:?}, height: {:?}", width, height);
                                map_printer_error(printer.feed())?;
                                logo_printed = true;
                                break;
                            }
                            Err(e) => {
                                log::warn!("Test print: Failed to print logo with config - width: {:?}, height: {:?}: {}", width, height, e);
                                continue;
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("Test print: Failed to create bit image option - width: {:?}, height: {:?}: {}", width, height, e);
                        continue;
                    }
                }
            }

            if !logo_printed {
                log::warn!("Test print: All logo printing attempts failed. Using text header.");
                map_printer_error(printer.bold(true))?;
                map_printer_error(printer.writeln(header))?;
                map_printer_error(printer.bold(false))?;
                map_printer_error(printer.feed())?;
            }
        }
        Err(e) => {
            log::warn!("Test print: Could not locate logo file: {}. Using text header.", e);
            map_printer_error(printer.bold(true))?;
            map_printer_error(printer.writeln(header))?;
            map_printer_error(printer.bold(false))?;
            map_printer_error(printer.feed())?;
        }
    }

    map_printer_error(printer.justify(JustifyMode::LEFT))?;
    map_printer_error(printer.smoothing(true))?;
    map_printer_error(printer.bold(true))?;
    map_printer_error(printer.underline(UnderlineMode::Single))?;
    map_printer_error(printer.writeln("TEST PRINT"))?;
    map_printer_error(printer.bold(false))?;
    map_printer_error(printer.underline(UnderlineMode::None))?;

    map_printer_error(printer.writeln("Medusa POS"))?;
    if let Some(v) = app_version.filter(|s| !s.is_empty()) {
        map_printer_error(printer.writeln(&format!("Version {}", v)))?;
    }
    if let Some(dt) = datetime.filter(|s| !s.is_empty()) {
        map_printer_error(printer.writeln(dt))?;
    }
    if let Some(name) = store_name.filter(|s| !s.is_empty()) {
        map_printer_error(printer.writeln(&format!("Store: {}", name)))?;
    }
    if let Some(ch) = sales_channel_name.filter(|s| !s.is_empty()) {
        map_printer_error(printer.writeln(&format!("Sales channel: {}", ch)))?;
    }
    map_printer_error(printer.feed())?;

    map_printer_error(printer.justify(JustifyMode::CENTER))?;
    map_printer_error(printer.reverse(true))?;
    map_printer_error(printer.writeln("Hello world - Test successful!"))?;
    map_printer_error(printer.feed())?;
    map_printer_error(printer.justify(JustifyMode::RIGHT))?;
    map_printer_error(printer.reverse(false))?;
    map_printer_error(printer.underline(UnderlineMode::None))?;
    map_printer_error(printer.size(2, 3))?;
    map_printer_error(printer.writeln("Thank you"))?;
    map_printer_error(printer.print_cut())?;

    Ok(())
}

fn print_receipt_page<T: Driver>(
    printer: &mut Printer<T>,
    app_handle: &tauri::AppHandle<tauri::Wry>,
    header: &str,
    receipt_data: &str,
) -> Result<(), String> {
    map_printer_error(printer.init())?;

    map_printer_error(configure_printer_for_georgian(printer, receipt_data))?;

    map_printer_error(printer.justify(JustifyMode::CENTER))?;

    match get_logo_path(app_handle) {
        Ok(logo_path) => {
            log::info!("Receipt print: Using logo path: {}", logo_path);
            let image_configs = vec![
                (Some(384), None, BitImageSize::Normal),
                (Some(256), None, BitImageSize::Normal),
                (Some(192), None, BitImageSize::Normal),
                (None, None, BitImageSize::Normal),
                (Some(384), None, BitImageSize::DoubleWidth),
                (Some(384), None, BitImageSize::DoubleHeight),
            ];

            let mut logo_printed = false;
            for (width, height, size) in image_configs {
                match BitImageOption::new(width, height, size) {
                    Ok(bit_image_option) => {
                        log::info!("Receipt print: Trying image config - width: {:?}, height: {:?}, size: {:?}", width, height, size);
                        match printer.bit_image_option(&logo_path, bit_image_option) {
                            Ok(_) => {
                                log::info!("Receipt print: Logo printed successfully with config - width: {:?}, height: {:?}", width, height);
                                map_printer_error(printer.feed())?;
                                logo_printed = true;
                                break;
                            }
                            Err(e) => {
                                log::warn!("Receipt print: Failed to print logo with config - width: {:?}, height: {:?}: {}", width, height, e);
                                continue;
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("Receipt print: Failed to create bit image option - width: {:?}, height: {:?}: {}", width, height, e);
                        continue;
                    }
                }
            }

            if !logo_printed {
                log::warn!("Receipt print: All logo printing attempts failed. Using text header.");
                map_printer_error(printer.bold(true))?;
                map_printer_error(printer.writeln(header))?;
                map_printer_error(printer.bold(false))?;
                map_printer_error(printer.feed())?;
            }
        }
        Err(e) => {
            log::warn!("Receipt print: Could not locate logo file: {}. Using text header.", e);
            map_printer_error(printer.bold(true))?;
            map_printer_error(printer.writeln(header))?;
            map_printer_error(printer.bold(false))?;
            map_printer_error(printer.feed())?;
        }
    }

    map_printer_error(printer.justify(JustifyMode::LEFT))?;
    map_printer_error(printer.writeln(receipt_data))?;
    map_printer_error(printer.feed())?;
    map_printer_error(printer.feed())?;
    map_printer_error(printer.print_cut())?;

    Ok(())
}

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
    log::info!(
        "Starting print test - Connection: {}, Address: {}",
        connection_type,
        address
    );

    match connection_type.as_str() {
        "network" => {
            let port_num = parse_port(port);
            let mut printer = map_printer_error(create_network_printer(&address, port_num))?;
            printer.debug_mode(Some(DebugMode::Dec));
            print_test_page(
                &mut printer,
                &app_handle,
                header,
                app_version.as_deref(),
                datetime.as_deref(),
                store_name.as_deref(),
                sales_channel_name.as_deref(),
            )
        }
        "usb" => {
            let (vid, pid) = parse_usb_ids(vendor_id, product_id)?;
            let mut printer = map_printer_error(create_usb_printer(vid, pid))?;
            print_test_page(
                &mut printer,
                &app_handle,
                header,
                app_version.as_deref(),
                datetime.as_deref(),
                store_name.as_deref(),
                sales_channel_name.as_deref(),
            )
        }
        _ => Err("Unsupported connection type".to_string()),
    }
}

#[tauri::command]
async fn open_cash_drawer(
    connection_type: String,
    address: String,
    port: Option<String>,
    vendor_id: Option<u16>,
    product_id: Option<u16>,
) -> Result<(), String> {
    match connection_type.as_str() {
        "network" => {
            use std::net::{TcpStream, SocketAddr};
            use std::io::Write;
            let port_num = parse_port(port);
            let addr = format!("{}:{}", address, port_num);
            let socket_addr: SocketAddr = addr.parse().map_err(|e: std::net::AddrParseError| e.to_string())?;
            let mut stream = TcpStream::connect_timeout(&socket_addr, Duration::from_secs(3))
                .map_err(|e| e.to_string())?;
            stream.write_all(&[0x1B, 0x70, 0x00, 0x19, 0xFF])
                .map_err(|e| e.to_string())?;
            Ok(())
        }
        "usb" => {
            let (vid, pid) = parse_usb_ids(vendor_id, product_id)?;
            let mut printer = map_printer_error(create_usb_printer(vid, pid))?;
            map_printer_error(printer.init())?;
            map_printer_error(printer.cash_drawer(CashDrawer::Pin2))?;
            Ok(())
        }
        _ => Err("Unsupported connection type".to_string()),
    }
}

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
    match connection_type.as_str() {
        "network" => {
            let port_num = parse_port(port);
            let mut printer = map_printer_error(create_network_printer(&address, port_num))?;
            print_receipt_page(&mut printer, &app_handle, header, &receipt_data)
        }
        "usb" => {
            let (vid, pid) = parse_usb_ids(vendor_id, product_id)?;
            let mut printer = map_printer_error(create_usb_printer(vid, pid))?;
            print_receipt_page(&mut printer, &app_handle, header, &receipt_data)
        }
        _ => Err("Unsupported connection type".to_string()),
    }
}

#[tauri::command]
fn update_splash(app_handle: tauri::AppHandle, message: String, is_error: bool) {
    if let Some(splash) = app_handle.get_webview_window("splash") {
        let escaped = message.replace('\\', "\\\\").replace('\'', "\\'");
        let _ = splash.eval(&format!(
            "updateSplash('{}', {})",
            escaped, is_error
        ));
    }
}

#[tauri::command]
fn close_splash(app_handle: tauri::AppHandle) {
    if let Some(splash) = app_handle.get_webview_window("splash") {
        if let Err(e) = splash.close() {
            log::error!("Failed to close splash window: {}", e);
        }
    }
    if let Some(main) = app_handle.get_webview_window("main") {
        if let Err(e) = main.show() {
            log::error!("Failed to show main window: {}", e);
        }
    }
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
            debug_info.push_str(&format!("Config loaded successfully\n"));
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
                debug_info.push_str(&format!("Logo file exists: true\n"));

                if let Ok(metadata) = logo_path.metadata() {
                    debug_info.push_str(&format!("Logo file size: {} bytes\n", metadata.len()));
                }
            } else {
                debug_info.push_str(&format!("Logo file exists: false\n"));
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
        .setup(|app| {
            WebviewWindowBuilder::new(
                app,
                "splash",
                tauri::WebviewUrl::App("splash.html".into()),
            )
            .title("Medusa POS")
            .inner_size(400.0, 300.0)
            .resizable(false)
            .decorations(false)
            .center()
            .always_on_top(true)
            .build()?;

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(30));
                if let Some(splash) = handle.get_webview_window("splash") {
                    log::warn!("Splash safety timeout reached - force-closing");
                    let _ = splash.close();
                }
                if let Some(main) = handle.get_webview_window("main") {
                    let _ = main.show();
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
            update_splash,
            close_splash,
            print_test,
            open_cash_drawer,
            print_receipt,
            list_usb_devices,
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
