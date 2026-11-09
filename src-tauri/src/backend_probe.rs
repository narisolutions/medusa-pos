//! Asks the Medusa backend's `/health` route and says exactly what happened.
//!
//! The HTTP plugin's fetch reports every failure as "error sending request for url",
//! dropping the cause, so the till couldn't tell a refused port from a missing address
//! or a timeout. This reads the error chain itself.

use std::error::Error as _;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri_plugin_http::reqwest;

/// Enough of a body to recognise a login page, never a whole one.
const BODY_PEEK_BYTES: usize = 512;

/// A Wi-Fi sign-in page or another site answers a health check with HTML. Medusa sends
/// "OK", and a proxy in front of it may send other plain text or JSON, which is still Medusa.
fn looks_like_web_page(body: &str) -> bool {
    let body = body.trim_start().to_lowercase();
    body.starts_with('<')
}

#[derive(Debug, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProbeKind {
    Ok,
    /// The server answered with an error status (e.g. 502: reached, but Medusa is down behind it).
    HttpError,
    /// Something other than Medusa answered: a Wi-Fi login page, another site.
    OtherHost,
    /// The machine is there, but nothing accepts connections on that port.
    Refused,
    /// The address can't be found (DNS).
    NotFound,
    /// No route to the machine.
    Unreachable,
    TimedOut,
    /// The secure connection failed (certificate, TLS).
    Tls,
    Error,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeResult {
    pub kind: ProbeKind,
    pub status: Option<u16>,
    /// Who answered when it wasn't Medusa: the host a redirect ended on, or its Server header.
    pub answered_by: Option<String>,
    /// The underlying error, for the logs and the details sheet.
    pub detail: Option<String>,
    pub elapsed_ms: u64,
}

/// Classifies a failed request from its whole error chain, lowercased.
fn classify_error_chain(chain: &str, is_timeout: bool) -> ProbeKind {
    if is_timeout || chain.contains("timed out") || chain.contains("os error 10060") {
        return ProbeKind::TimedOut;
    }
    // os error 111 (Linux), 61 (macOS), 10061 (Windows).
    if chain.contains("connection refused")
        || chain.contains("actively refused")
        || chain.contains("os error 111")
        || chain.contains("os error 61)")
        || chain.contains("os error 10061")
    {
        return ProbeKind::Refused;
    }
    if chain.contains("dns error")
        || chain.contains("failed to lookup address")
        || chain.contains("no such host")
        || chain.contains("name or service not known")
        || chain.contains("nodename nor servname")
        || chain.contains("temporary failure in name resolution")
    {
        return ProbeKind::NotFound;
    }
    if chain.contains("certificate") || chain.contains("tls") || chain.contains("ssl") {
        return ProbeKind::Tls;
    }
    if chain.contains("unreachable")
        || chain.contains("no route to host")
        || chain.contains("error trying to connect")
        || chain.contains("tcp connect error")
    {
        return ProbeKind::Unreachable;
    }
    ProbeKind::Error
}

fn error_chain(error: &reqwest::Error) -> String {
    let mut parts = vec![error.to_string()];
    let mut source = error.source();
    while let Some(cause) = source {
        parts.push(cause.to_string());
        source = cause.source();
    }
    parts.join(": ")
}

fn host_of(url: &str) -> Option<String> {
    reqwest::Url::parse(url).ok().and_then(|u| u.host_str().map(str::to_lowercase))
}

#[tauri::command]
pub async fn probe_backend(base_url: String, timeout_ms: u64) -> ProbeResult {
    let started = Instant::now();
    let elapsed = || started.elapsed().as_millis() as u64;
    let url = format!("{}/health", base_url.trim_end_matches('/'));

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(timeout_ms))
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            return ProbeResult {
                kind: ProbeKind::Error,
                status: None,
                answered_by: None,
                detail: Some(error.to_string()),
                elapsed_ms: elapsed(),
            }
        }
    };

    let response = match client.get(&url).send().await {
        Ok(response) => response,
        Err(error) => {
            let chain = error_chain(&error);
            return ProbeResult {
                kind: classify_error_chain(&chain.to_lowercase(), error.is_timeout()),
                status: None,
                answered_by: None,
                detail: Some(chain),
                elapsed_ms: elapsed(),
            };
        }
    };

    let status = response.status().as_u16();
    let final_host = response.url().host_str().map(str::to_lowercase);
    let server = response
        .headers()
        .get(reqwest::header::SERVER)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let redirected = final_host.is_some() && final_host != host_of(&url);
    let body = response.bytes().await.unwrap_or_default();
    let peek = String::from_utf8_lossy(&body[..body.len().min(BODY_PEEK_BYTES)]).trim().to_string();

    let (kind, answered_by) = if redirected {
        (ProbeKind::OtherHost, final_host)
    } else if !(200..300).contains(&status) {
        (ProbeKind::HttpError, server)
    } else if looks_like_web_page(&peek) {
        (ProbeKind::OtherHost, server.or(final_host))
    } else {
        (ProbeKind::Ok, None)
    };

    ProbeResult {
        kind,
        status: Some(status),
        answered_by,
        detail: None,
        elapsed_ms: elapsed(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_timeout_wins_over_everything_else() {
        assert_eq!(classify_error_chain("error sending request", true), ProbeKind::TimedOut);
    }

    #[test]
    fn refused_on_every_platform() {
        for chain in [
            "tcp connect error: connection refused (os error 111)",
            "tcp connect error: connection refused (os error 61)",
            "no connection could be made because the target machine actively refused it. (os error 10061)",
        ] {
            assert_eq!(classify_error_chain(chain, false), ProbeKind::Refused, "{chain}");
        }
    }

    #[test]
    fn a_missing_address_is_not_found() {
        assert_eq!(
            classify_error_chain("dns error: failed to lookup address information: name or service not known", false),
            ProbeKind::NotFound
        );
    }

    /// Answers one request with `response` and returns the server's base URL.
    fn serve_once(response: String) -> String {
        use std::io::{Read, Write};
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        std::thread::spawn(move || {
            if let Ok((mut stream, _)) = listener.accept() {
                let mut request = [0u8; 1024];
                let _ = stream.read(&mut request);
                let _ = stream.write_all(response.as_bytes());
            }
        });
        format!("http://127.0.0.1:{port}")
    }

    fn reply(status: &str, headers: &str, body: &str) -> String {
        format!(
            "HTTP/1.1 {status}\r\n{headers}Content-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        )
    }

    fn probe(url: String) -> ProbeResult {
        tauri::async_runtime::block_on(probe_backend(url, 3_000))
    }

    #[test]
    fn medusas_ok_is_ok() {
        let result = probe(serve_once(reply("200 OK", "", "OK")));
        assert_eq!((result.kind, result.status), (ProbeKind::Ok, Some(200)));
    }

    #[test]
    fn a_proxy_that_answers_json_or_text_is_still_ok() {
        assert_eq!(probe(serve_once(reply("200 OK", "", r#"{"status":"ok"}"#))).kind, ProbeKind::Ok);
        assert_eq!(probe(serve_once(reply("200 OK", "", "healthy"))).kind, ProbeKind::Ok);
    }

    #[test]
    fn a_sign_in_page_is_someone_else() {
        let page = reply("200 OK", "Server: portal-1\r\n", "<html><body>Sign in to Wi-Fi</body></html>");
        let result = probe(serve_once(page));
        assert_eq!(result.kind, ProbeKind::OtherHost);
        assert_eq!(result.answered_by.as_deref(), Some("portal-1"));
    }

    #[test]
    fn a_redirect_to_another_host_is_someone_else() {
        let portal = serve_once(reply("200 OK", "", "<html>login</html>"));
        let to_localhost = portal.replace("127.0.0.1", "localhost");
        let result = probe(serve_once(reply("302 Found", &format!("Location: {to_localhost}/login\r\n"), "")));
        assert_eq!(result.kind, ProbeKind::OtherHost);
        assert_eq!(result.answered_by.as_deref(), Some("localhost"));
    }

    #[test]
    fn an_error_status_means_the_shop_system_is_down_behind_a_server() {
        let result = probe(serve_once(reply("502 Bad Gateway", "Server: nginx\r\n", "bad gateway")));
        assert_eq!((result.kind, result.status), (ProbeKind::HttpError, Some(502)));
        assert_eq!(result.answered_by.as_deref(), Some("nginx"));
    }

    #[test]
    fn a_server_that_never_answers_times_out() {
        use std::net::TcpListener;
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://127.0.0.1:{}", listener.local_addr().unwrap().port());
        let result = tauri::async_runtime::block_on(probe_backend(url, 300));
        assert_eq!(result.kind, ProbeKind::TimedOut, "{:?}", result.detail);
        drop(listener);
    }

    #[test]
    fn only_markup_counts_as_a_web_page() {
        assert!(looks_like_web_page("  <!DOCTYPE html><html>"));
        assert!(looks_like_web_page("<HTML>"));
        assert!(!looks_like_web_page("OK"));
        assert!(!looks_like_web_page(r#"{"status":"ok"}"#));
        assert!(!looks_like_web_page(""));
    }

    #[test]
    fn a_closed_local_port_is_refused() {
        let result = tauri::async_runtime::block_on(probe_backend("http://127.0.0.1:1".into(), 3_000));
        assert_eq!(result.kind, ProbeKind::Refused, "{:?}", result.detail);
    }

    #[test]
    fn a_reserved_invalid_domain_is_not_found() {
        let result = tauri::async_runtime::block_on(probe_backend("http://medusa-pos-probe.invalid".into(), 3_000));
        assert_eq!(result.kind, ProbeKind::NotFound, "{:?}", result.detail);
    }

    #[test]
    fn certificate_and_route_failures() {
        assert_eq!(classify_error_chain("invalid peer certificate: unknownissuer", false), ProbeKind::Tls);
        assert_eq!(
            classify_error_chain("tcp connect error: network is unreachable (os error 101)", false),
            ProbeKind::Unreachable
        );
        assert_eq!(classify_error_chain("something odd", false), ProbeKind::Error);
    }
}
