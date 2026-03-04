use std::env;
use std::fs;
use std::path::Path;

fn main() {
    // Read the TAURI_HTTP_ALLOWLIST environment variable
    let allowlist = env::var("TAURI_HTTP_ALLOWLIST")
        .unwrap_or_else(|_| {
            // Default allowed domains for production
            "https://commerce-api.qnarigroup.com/**,https://commerce-api-staging.qnarigroup.com/**".to_string()
        });

    // Parse the allowlist (comma-separated URLs)
    let urls: Vec<String> = allowlist
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    // Generate the capabilities file with HTTP permissions
    generate_capabilities_file(&urls);

    tauri_build::build()
}

fn generate_capabilities_file(urls: &[String]) {
    let capabilities_dir = Path::new("capabilities");
    let default_file = capabilities_dir.join("default.json");

    // Read the existing default.json
    let existing_content = fs::read_to_string(&default_file)
        .expect("Failed to read default.json");

    // Parse JSON
    let mut json: serde_json::Value = serde_json::from_str(&existing_content)
        .expect("Failed to parse default.json");

    // Get the permissions array
    if let Some(permissions) = json.get_mut("permissions").and_then(|p| p.as_array_mut()) {
        // Remove any existing http:default or http:allow-fetch permission objects
        permissions.retain(|p| {
            if let Some(perm_str) = p.as_str() {
                perm_str != "http:default"
            } else if let Some(perm_obj) = p.as_object() {
                perm_obj.get("identifier")
                    .and_then(|id| id.as_str())
                    .map(|id| id != "http:allow-fetch")
                    .unwrap_or(true)
            } else {
                true
            }
        });

        // Ensure basic HTTP permissions are present
        let required_perms = vec![
            "http:allow-fetch",
            "http:allow-fetch-send",
            "http:allow-fetch-read-body",
            "http:allow-fetch-cancel",
        ];
        
        for perm in required_perms {
            if !permissions.iter().any(|p| p.as_str() == Some(perm)) {
                permissions.push(serde_json::Value::String(perm.to_string()));
            }
        }

        // Create URL allow list for the permission object
        let url_allow_list: Vec<serde_json::Value> = urls
            .iter()
            .map(|url| {
                serde_json::json!({
                    "url": url
                })
            })
            .collect();

        // Add the HTTP permission object with URL restrictions
        let http_permission = serde_json::json!({
            "identifier": "http:allow-fetch",
            "allow": url_allow_list
        });
        
        permissions.push(http_permission);
    }

    // Serialize the updated JSON
    let updated_content = serde_json::to_string_pretty(&json)
        .expect("Failed to serialize JSON");
    
    // Only write if content has changed to avoid infinite rebuild loop
    if updated_content != existing_content {
        fs::write(&default_file, updated_content)
            .expect("Failed to write default.json");
        println!("cargo:warning=Generated capabilities with {} allowed HTTP URLs for production", urls.len());
    }
}
