//! Self-installs the Medusa POS AppImage into the user's applications menu
//! on first run.
//!
//! Only does anything when the binary is launched as an AppImage (i.e. the
//! `$APPIMAGE` env var is set by the AppImage runtime). On non-AppImage Linux
//! builds, dev builds, and other platforms, all functions are no-ops.
//!
//! State is tracked in `~/.config/medusapos/integration.json` with an
//! explicit schema version and an authoritative list of files we created.
//! We only ever manage files in that list; anything else in the install
//! directory is left alone. See the handover doc's "Forward compatibility"
//! section.

use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

// =========================================================================
// App-specific constants.
// APP_ID must match `identifier` in tauri.conf.json.
// WM_CLASS must match what the running window reports — verify with
// `xprop WM_CLASS` once the dev build is running, and update if needed.
// =========================================================================
const APP_NAME: &str = "Medusa POS"; // human-readable (dialogs, menu)
const APP_EXEC_NAME: &str = "MedusaPOS"; // PascalCase, no spaces; AppImage filename
const APP_SLUG: &str = "medusapos"; // lowercase; used in paths, icon name
const APP_ID: &str = "ge.nari.medusa-pos"; // reverse-DNS, matches tauri.conf.json
const WM_CLASS: &str = "Medusa-pos"; // verified via `xprop WM_CLASS` (res_class derived from APP_ID)

/// Bump when the integration's on-disk layout or state file shape changes.
/// Add a migration arm in `migrate()` for each step.
const CURRENT_SCHEMA_VERSION: u32 = 1;

// =========================================================================
// State file
// =========================================================================

#[derive(Serialize, Deserialize, Debug)]
struct IntegrationState {
    /// Schema version of this file. 0 = pre-versioned / fresh.
    #[serde(default)]
    schema_version: u32,

    /// Whether the user has been asked yet, and what they decided.
    #[serde(default)]
    status: IntegrationStatus,

    /// Authoritative list of files this integrator created.
    /// We never touch a file not on this list.
    #[serde(default)]
    installed_files: Vec<PathBuf>,

    /// Unix epoch seconds of the last successful integration. Diagnostic only.
    #[serde(default)]
    last_integrated_at: Option<u64>,
}

impl Default for IntegrationState {
    fn default() -> Self {
        Self {
            schema_version: 0,
            status: IntegrationStatus::Unknown,
            installed_files: Vec::new(),
            last_integrated_at: None,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Default, PartialEq, Eq, Clone, Copy)]
#[serde(rename_all = "snake_case")]
enum IntegrationStatus {
    #[default]
    Unknown,
    Integrated,
    Declined,
}

// =========================================================================
// Entry point
// =========================================================================

pub async fn maybe_integrate(app: &AppHandle) {
    if let Err(e) = run(app).await {
        // Never crash the app over integration. Log and carry on.
        log::warn!("AppImage integration: {e:#}");
    }
}

async fn run(app: &AppHandle) -> Result<()> {
    // Only act when running from an AppImage.
    let Ok(appimage_str) = env::var("APPIMAGE") else {
        return Ok(());
    };
    let appimage = PathBuf::from(&appimage_str);
    if !appimage.exists() {
        return Ok(());
    }

    let home = dirs::home_dir().context("could not resolve $HOME")?;
    let state_path = state_file_path(&home);

    // Load state (default if missing or corrupt). A corrupt state file
    // triggers a fresh prompt — annoying but safe.
    let mut state = read_state(&state_path).unwrap_or_else(|e| {
        log::warn!("integration state unreadable ({e:#}); treating as fresh");
        IntegrationState::default()
    });

    // Run schema migrations. If the file claims a newer schema than we
    // understand, we leave it alone and bail out.
    if !migrate(&mut state)? {
        return Ok(());
    }

    match state.status {
        IntegrationStatus::Declined => {
            // Respect the user's previous decision.
            Ok(())
        }

        IntegrationStatus::Integrated => {
            // Verify our files are still present; re-create any that are
            // missing. Then if we're running from outside the install path,
            // hand off to the canonical location.
            verify_and_repair(app, &mut state, &home, &appimage)?;
            write_state(&state_path, &state)?;
            relaunch_if_outside_install_path(app, &home, &appimage)?;
            Ok(())
        }

        IntegrationStatus::Unknown => {
            // First-run flow.
            let accepted = ask_user(app).await;
            if !accepted {
                state.status = IntegrationStatus::Declined;
                state.schema_version = CURRENT_SCHEMA_VERSION;
                write_state(&state_path, &state)?;
                return Ok(());
            }

            integrate(app, &mut state, &home, &appimage).context("integration failed")?;
            write_state(&state_path, &state)?;
            relaunch_if_outside_install_path(app, &home, &appimage)?;
            Ok(())
        }
    }
}

// =========================================================================
// Paths
// =========================================================================

fn state_file_path(home: &Path) -> PathBuf {
    home.join(".config").join(APP_SLUG).join("integration.json")
}

fn install_dir(home: &Path) -> PathBuf {
    home.join(".local/share").join(APP_SLUG)
}

fn install_appimage_path(home: &Path) -> PathBuf {
    install_dir(home).join(format!("{APP_EXEC_NAME}.AppImage"))
}

fn desktop_file_path(home: &Path) -> PathBuf {
    home.join(".local/share/applications")
        .join(format!("{APP_ID}.desktop"))
}

fn icon_file_path(home: &Path) -> PathBuf {
    home.join(".local/share/icons/hicolor/512x512/apps")
        .join(format!("{APP_SLUG}.png"))
}

// =========================================================================
// State I/O
// =========================================================================

fn read_state(path: &Path) -> Result<IntegrationState> {
    let bytes = fs::read(path).context("reading state file")?;
    let state: IntegrationState = serde_json::from_slice(&bytes).context("parsing state file")?;
    Ok(state)
}

fn write_state(path: &Path, state: &IntegrationState) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).context("creating state dir")?;
    }
    let bytes = serde_json::to_vec_pretty(state).context("serializing state")?;
    write_atomic(path, &bytes).context("writing state atomically")?;
    Ok(())
}

/// Write to a temp file and rename so a kill mid-write doesn't leave a
/// half-written file in place.
fn write_atomic(path: &Path, contents: &[u8]) -> Result<()> {
    let parent = path.parent().context("path has no parent")?;
    let filename = path.file_name().context("path has no filename")?;
    let tmp = parent.join(format!(
        ".{}.tmp.{}",
        filename.to_string_lossy(),
        std::process::id(),
    ));
    fs::write(&tmp, contents).context("writing temp file")?;
    fs::rename(&tmp, path).context("renaming temp file into place")?;
    Ok(())
}

// =========================================================================
// Migrations
// =========================================================================

/// Apply migrations to bring `state` up to `CURRENT_SCHEMA_VERSION`.
/// Returns `Ok(true)` if we should proceed, `Ok(false)` if the state file
/// is from a newer version of the app and we should leave it alone.
///
/// Future schema changes:
///   - Define what's different in v(N+1).
///   - Add a `N => { /* migrate to N+1 */ state.schema_version = N+1; }` arm.
///   - Bump CURRENT_SCHEMA_VERSION.
///   - Migration steps must be idempotent and forward-only.
fn migrate(state: &mut IntegrationState) -> Result<bool> {
    loop {
        match state.schema_version {
            v if v == CURRENT_SCHEMA_VERSION => return Ok(true),
            v if v > CURRENT_SCHEMA_VERSION => {
                log::warn!(
                    "integration state schema v{v} is newer than this app \
                     understands (v{CURRENT_SCHEMA_VERSION}); leaving it alone"
                );
                return Ok(false);
            }
            0 => {
                // Pre-versioned / fresh state. Promote to v1 baseline.
                state.schema_version = 1;
            }
            // Future migrations:
            // 1 => { /* migrate v1 -> v2 */ state.schema_version = 2; }
            // 2 => { /* migrate v2 -> v3 */ state.schema_version = 3; }
            v => anyhow::bail!("no migration path from schema v{v}"),
        }
    }
}

// =========================================================================
// Integration
// =========================================================================

async fn ask_user(app: &AppHandle) -> bool {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .message(format!(
            "Install {APP_NAME} to your Applications menu?\n\n\
             This will copy {APP_NAME} to ~/.local/share/{APP_SLUG}/ and \
             add it to your applications menu. Future updates will replace \
             this copy automatically.\n\n\
             You can decline and still use the app from this file."
        ))
        .title(format!("Install {APP_NAME}"))
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Install".into(),
            "Not now".into(),
        ))
        .show(move |answer| {
            let _ = tx.send(answer);
        });
    rx.await.unwrap_or(false)
}

fn integrate(
    app: &AppHandle,
    state: &mut IntegrationState,
    home: &Path,
    appimage: &Path,
) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;

    let install = install_dir(home);
    let target_appimage = install_appimage_path(home);
    let apps_dir = home.join(".local/share/applications");
    let icons_dir = home.join(".local/share/icons/hicolor/512x512/apps");
    let desktop_file = desktop_file_path(home);
    let icon_file = icon_file_path(home);

    fs::create_dir_all(&install).context("creating install dir")?;
    fs::create_dir_all(&apps_dir).context("creating applications dir")?;
    fs::create_dir_all(&icons_dir).context("creating icons dir")?;

    // 1. Copy AppImage to canonical location (skip if it's already there).
    if appimage != target_appimage {
        fs::copy(appimage, &target_appimage).context("copying AppImage to install dir")?;
        let mut perms = fs::metadata(&target_appimage)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&target_appimage, perms)?;
    }

    // 2. Copy bundled icon out to the hicolor theme directory.
    let icon_src = app
        .path()
        .resolve("icons/512x512.png", tauri::path::BaseDirectory::Resource)
        .context("resolving bundled icon path")?;
    fs::copy(&icon_src, &icon_file).context("copying icon")?;

    // 3. Write the .desktop entry atomically.
    let desktop_entry = format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Version=1.0\n\
         Name={APP_NAME}\n\
         Comment={APP_NAME} desktop application\n\
         Exec={exec} %U\n\
         Icon={icon}\n\
         Terminal=false\n\
         Categories=Utility;\n\
         StartupWMClass={WM_CLASS}\n\
         StartupNotify=true\n",
        exec = target_appimage.display(),
        icon = APP_SLUG,
    );
    write_atomic(&desktop_file, desktop_entry.as_bytes()).context("writing .desktop entry")?;

    // 4. Record what we created. This list is the authoritative source
    //    of truth about which files belong to us. Anything not on it
    //    is left alone forever.
    state.installed_files = vec![
        target_appimage.clone(),
        desktop_file.clone(),
        icon_file.clone(),
    ];
    state.status = IntegrationStatus::Integrated;
    state.schema_version = CURRENT_SCHEMA_VERSION;
    state.last_integrated_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|d| d.as_secs());

    // 5. Best-effort cache refresh. Many distros do this automatically
    //    when .desktop files change, but explicit calls don't hurt.
    let _ = Command::new("update-desktop-database")
        .arg(&apps_dir)
        .status();
    let _ = Command::new("gtk-update-icon-cache")
        .arg("-q")
        .arg("-t")
        .arg(home.join(".local/share/icons/hicolor"))
        .status();

    Ok(())
}

/// Check that each file we previously installed still exists. If any are
/// missing, re-run integration to put them back. Safe because integrate()
/// overwrites its own outputs idempotently.
fn verify_and_repair(
    app: &AppHandle,
    state: &mut IntegrationState,
    home: &Path,
    fallback_source: &Path,
) -> Result<()> {
    let missing: Vec<&PathBuf> = state
        .installed_files
        .iter()
        .filter(|p| !p.exists())
        .collect();

    if missing.is_empty() {
        return Ok(());
    }

    log::info!(
        "{} integration file(s) missing; re-integrating to repair",
        missing.len()
    );

    // Prefer copying from the install path (which is the current version).
    // Fall back to wherever we're being invoked from.
    let source = if install_appimage_path(home).exists() {
        install_appimage_path(home)
    } else {
        fallback_source.to_path_buf()
    };

    integrate(app, state, home, &source)
}

fn relaunch_if_outside_install_path(app: &AppHandle, home: &Path, appimage: &Path) -> Result<()> {
    let install_path = install_appimage_path(home);
    if appimage != install_path && install_path.exists() {
        Command::new(&install_path)
            .spawn()
            .context("relaunching from install path")?;
        app.exit(0);
    }
    Ok(())
}
