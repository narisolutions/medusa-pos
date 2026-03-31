/// Detect physical keyboard presence and manage OS virtual keyboard.

// ─── Windows ───────────────────────────────────────────────────────────────────
#[cfg(target_os = "windows")]
pub fn has_physical_keyboard() -> bool {
    use windows::Win32::UI::Input::{
        GetRawInputDeviceInfoW, GetRawInputDeviceList, RAWINPUTDEVICELIST,
        RAW_INPUT_DEVICE_INFO_COMMAND, RIM_TYPEKEYBOARD,
    };

    unsafe {
        let mut count: u32 = 0;
        let size = std::mem::size_of::<RAWINPUTDEVICELIST>() as u32;

        if GetRawInputDeviceList(None, &mut count, size) != 0 {
            log::warn!("GetRawInputDeviceList (count) failed");
            return true; // assume keyboard present on failure
        }

        if count == 0 {
            return false;
        }

        let mut devices = vec![RAWINPUTDEVICELIST::default(); count as usize];
        let result = GetRawInputDeviceList(Some(devices.as_mut_ptr()), &mut count, size);
        if result == u32::MAX {
            log::warn!("GetRawInputDeviceList (list) failed");
            return true;
        }

        for dev in &devices {
            if dev.dwType == RIM_TYPEKEYBOARD {
                // Get device name to filter out virtual/RDP keyboards
                let mut name_len: u32 = 0;
                let _ = GetRawInputDeviceInfoW(
                    dev.hDevice,
                    RAW_INPUT_DEVICE_INFO_COMMAND(0x20000007), // RIDI_DEVICENAME
                    None,
                    &mut name_len,
                );

                if name_len > 0 {
                    let mut name_buf = vec![0u16; name_len as usize];
                    let chars = GetRawInputDeviceInfoW(
                        dev.hDevice,
                        RAW_INPUT_DEVICE_INFO_COMMAND(0x20000007),
                        Some(name_buf.as_mut_ptr() as *mut _),
                        &mut name_len,
                    );

                    if chars > 0 {
                        let name = String::from_utf16_lossy(&name_buf[..chars as usize]);
                        let upper = name.to_uppercase();
                        // Skip virtual keyboards (RDP, Hyper-V, Terminal Services)
                        if upper.contains("RDP")
                            || upper.contains("VIRTUAL")
                            || upper.contains("TERMINPUT")
                        {
                            continue;
                        }
                    }
                }

                return true;
            }
        }

        false
    }
}

#[cfg(target_os = "windows")]
pub fn show_virtual_keyboard() {
    use std::process::Command;
    use windows::Win32::UI::WindowsAndMessaging::{
        FindWindowW, IsWindowVisible, ShowWindow, SW_SHOW,
    };
    use windows::core::w;

    log::info!("show_virtual_keyboard called");

    unsafe {
        // Ensure TabTip.exe is running (explorer.exe can launch it without elevation)
        let already_running = FindWindowW(w!("IPTip_Main_Window"), None).is_ok();
        if !already_running {
            log::info!("TabTip not running, launching via explorer");
            let tabtip = r"C:\Program Files\Common Files\microsoft shared\ink\TabTip.exe";
            let _ = Command::new("explorer.exe").arg(tabtip).spawn();
            // Give it a moment to start
            std::thread::sleep(std::time::Duration::from_millis(500));
        }

        // Now find and show the window
        match FindWindowW(w!("IPTip_Main_Window"), None) {
            Ok(hwnd) => {
                if !IsWindowVisible(hwnd).as_bool() {
                    let _ = ShowWindow(hwnd, SW_SHOW);
                }
                log::info!("Touch keyboard shown");
            }
            Err(_) => {
                log::warn!("Touch keyboard window not found after launch attempt");
            }
        }
    }
}

#[cfg(target_os = "windows")]
pub fn hide_virtual_keyboard() {
    use windows::Win32::UI::WindowsAndMessaging::{
        FindWindowW, PostMessageW, SC_CLOSE, WM_SYSCOMMAND,
    };
    use windows::core::w;

    unsafe {
        let hwnd = FindWindowW(w!("IPTip_Main_Window"), None);
        if let Ok(hwnd) = hwnd {
            let _ = PostMessageW(
                hwnd,
                WM_SYSCOMMAND,
                windows::Win32::Foundation::WPARAM(SC_CLOSE as usize),
                windows::Win32::Foundation::LPARAM(0),
            );
        }
    }
}

// ─── Linux ─────────────────────────────────────────────────────────────────────
#[cfg(target_os = "linux")]
pub fn has_physical_keyboard() -> bool {
    use std::fs;

    // Read /proc/bus/input/devices and look for keyboard handlers
    let Ok(contents) = fs::read_to_string("/proc/bus/input/devices") else {
        log::warn!("Cannot read /proc/bus/input/devices");
        return true;
    };

    for block in contents.split("\n\n") {
        let upper = block.to_uppercase();
        // Must have keyboard event handler
        if !upper.contains("EV=") {
            continue;
        }
        // Look for "keyboard" in handlers or name, but skip power buttons
        let has_kbd_handler = block.lines().any(|l| {
            l.starts_with("H: Handlers=") && l.contains("kbd") && l.contains("event")
        });
        if !has_kbd_handler {
            continue;
        }
        // Skip devices that are clearly not real keyboards
        if upper.contains("POWER BUTTON")
            || upper.contains("VIDEO BUS")
            || upper.contains("SLEEP BUTTON")
            || upper.contains("PC SPEAKER")
        {
            continue;
        }
        // Check if it has a full key bitmap (real keyboards have many keys)
        // The EV= line contains a bitmask; keyboards have bit 1 (EV_KEY) set
        // and the KEY= line should be long (many key bits)
        let has_many_keys = block.lines().any(|l| {
            if l.starts_with("B: KEY=") {
                let key_part = &l[7..];
                // Real keyboards have long key bitmaps; power buttons have short ones
                key_part.len() > 20
            } else {
                false
            }
        });
        if has_many_keys {
            return true;
        }
    }

    false
}

#[cfg(target_os = "linux")]
pub fn show_virtual_keyboard() {
    use std::process::Command;
    // Try common Linux virtual keyboards in order of preference
    for cmd in &["onboard", "squeekboard", "florence", "xvkbd"] {
        if Command::new(cmd).spawn().is_ok() {
            return;
        }
    }
    log::warn!("No virtual keyboard found on Linux");
}

#[cfg(target_os = "linux")]
pub fn hide_virtual_keyboard() {
    use std::process::Command;
    for cmd in &["onboard", "squeekboard", "florence", "xvkbd"] {
        let _ = Command::new("pkill").arg(cmd).spawn();
    }
}

// ─── macOS ─────────────────────────────────────────────────────────────────────
#[cfg(target_os = "macos")]
pub fn has_physical_keyboard() -> bool {
    // macOS POS is rare; assume keyboard present for now
    true
}

#[cfg(target_os = "macos")]
pub fn show_virtual_keyboard() {
    log::info!("macOS virtual keyboard not yet implemented");
}

#[cfg(target_os = "macos")]
pub fn hide_virtual_keyboard() {
    log::info!("macOS virtual keyboard not yet implemented");
}
