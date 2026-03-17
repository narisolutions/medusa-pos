// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// When running inside an AppImage on Linux, the bundled libwayland-client.so
/// from Ubuntu 22.04 can conflict with the host system's newer version,
/// causing a blank screen on distros like Manjaro, Fedora, and Arch.
/// We detect this and re-exec with LD_PRELOAD pointing to the system library.
#[cfg(target_os = "linux")]
fn fixup_appimage_wayland() {
    use std::os::unix::process::CommandExt;

    // Only applies when running inside an AppImage
    if std::env::var("APPIMAGE").is_err() {
        return;
    }

    // Guard against infinite re-exec loop
    if std::env::var("__MEDUSA_REEXEC").is_ok() {
        return;
    }

    // Find the system's libwayland-client
    let system_lib = [
        "/usr/lib/libwayland-client.so",
        "/usr/lib/x86_64-linux-gnu/libwayland-client.so",
        "/usr/lib64/libwayland-client.so",
    ]
    .iter()
    .find(|p| std::path::Path::new(p).exists());

    if let Some(lib_path) = system_lib {
        let exe = match std::env::current_exe() {
            Ok(e) => e,
            Err(_) => return,
        };
        let args: Vec<String> = std::env::args().skip(1).collect();

        // Prepend to existing LD_PRELOAD if any
        let preload = match std::env::var("LD_PRELOAD") {
            Ok(existing) => format!("{}:{}", lib_path, existing),
            Err(_) => lib_path.to_string(),
        };

        // Replace the current process — does not return on success
        let _err = std::process::Command::new(exe)
            .args(&args)
            .env("LD_PRELOAD", preload)
            .env("__MEDUSA_REEXEC", "1")
            .exec();
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    fixup_appimage_wayland();

    medusa_pos_lib::run()
}
