use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub backend_url: String,
    #[serde(default)]
    pub store_urls: HashMap<String, String>,
}

impl AppConfig {
    pub fn config_file_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
        let app_data_dir = if cfg!(target_os = "windows") {
            // Windows: Use APPDATA first, then LOCALAPPDATA
            match std::env::var("APPDATA") {
                Ok(appdata) => PathBuf::from(appdata).join("medusa-pos"),
                Err(_) => match std::env::var("LOCALAPPDATA") {
                    Ok(localappdata) => PathBuf::from(localappdata).join("medusa-pos"),
                    Err(_) => {
                        log::warn!("Neither APPDATA nor LOCALAPPDATA found on Windows");
                        PathBuf::from("./config")
                    }
                },
            }
        } else {
            // Unix-like systems: Use HOME with XDG base directory specification
            match std::env::var("HOME") {
                Ok(home) => {
                    let xdg_data_home = std::env::var("XDG_DATA_HOME")
                        .unwrap_or_else(|_| format!("{}/.local/share", home));
                    PathBuf::from(xdg_data_home).join("medusa-pos")
                }
                Err(_) => {
                    log::warn!("HOME environment variable not found");
                    PathBuf::from("./config")
                }
            }
        };

        std::fs::create_dir_all(&app_data_dir)?;
        let config_path = app_data_dir.join("config.json");
        // Only log config path in debug mode (sensitive information)
        #[cfg(debug_assertions)]
        log::debug!("Using config path: {:?}", config_path);
        Ok(config_path)
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = Self::config_file_path()?;

        if config_path.exists() {
            let config_content = std::fs::read_to_string(&config_path)?;
            let config: AppConfig = serde_json::from_str(&config_content)?;

            // Validate the configuration
            if config.backend_url.is_empty() {
                return Err("Backend URL is empty in configuration".into());
            }

            log::info!("Configuration loaded successfully");
            // Don't log backend URL in production (sensitive information)
            #[cfg(debug_assertions)]
            log::debug!("Backend URL: {}", config.backend_url);
            Ok(config)
        } else {
            log::error!("Configuration file not found at: {:?}", config_path);
            Err("Configuration file not found".into())
        }
    }

    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let config_path = Self::config_file_path()?;
        let config_json = serde_json::to_string_pretty(self)?;
        std::fs::write(&config_path, config_json)?;
        log::info!("Configuration saved successfully");
        Ok(())
    }

    pub fn exists() -> bool {
        let exists = Self::config_file_path()
            .map(|path| path.exists())
            .unwrap_or_else(|e| {
                log::error!("Error checking config file existence: {}", e);
                false
            });

        exists
    }
}
