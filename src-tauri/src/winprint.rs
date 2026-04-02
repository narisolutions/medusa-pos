#[cfg(target_os = "windows")]
use windows::{
    core::{HSTRING, PCWSTR},
    Win32::Graphics::Printing::{
        ClosePrinter, EndDocPrinter, EndPagePrinter, EnumPrintersW, OpenPrinterW,
        StartDocPrinterW, StartPagePrinter, WritePrinter, DOC_INFO_1W, PRINTER_DEFAULTSW,
        PRINTER_ENUM_LOCAL, PRINTER_INFO_2W,
    },
};

#[derive(serde::Serialize, Clone)]
pub struct SystemPrinterInfo {
    pub name: String,
    pub driver_name: String,
    pub port_name: String,
    pub is_default: bool,
}

#[cfg(target_os = "windows")]
pub fn list_system_printers() -> Result<Vec<SystemPrinterInfo>, String> {
    unsafe {
        let flags = PRINTER_ENUM_LOCAL;
        let mut bytes_needed: u32 = 0;
        let mut count: u32 = 0;

        // First call to get required buffer size. EnumPrintersW returns FALSE
        // when the buffer is too small, which the windows crate surfaces as Err.
        let _ = EnumPrintersW(
            flags,
            PCWSTR::null(),
            2,
            None,
            &mut bytes_needed,
            &mut count,
        );

        if bytes_needed == 0 {
            return Ok(Vec::new());
        }

        let mut buffer: Vec<u8> = vec![0u8; bytes_needed as usize];

        EnumPrintersW(
            flags,
            PCWSTR::null(),
            2,
            Some(&mut buffer),
            &mut bytes_needed,
            &mut count,
        )
        .map_err(|e| format!("EnumPrintersW failed: {}", e))?;

        let printers_ptr = buffer.as_ptr() as *const PRINTER_INFO_2W;
        let printers = std::slice::from_raw_parts(printers_ptr, count as usize);

        // Get default printer name
        let default_name = get_default_printer_name().unwrap_or_default();

        let result: Vec<SystemPrinterInfo> = printers
            .iter()
            .map(|p| {
                let name = p.pPrinterName.to_string().unwrap_or_default();
                let driver = p.pDriverName.to_string().unwrap_or_default();
                let port = p.pPortName.to_string().unwrap_or_default();
                SystemPrinterInfo {
                    is_default: name == default_name,
                    name,
                    driver_name: driver,
                    port_name: port,
                }
            })
            .collect();

        Ok(result)
    }
}

#[cfg(target_os = "windows")]
fn get_default_printer_name() -> Option<String> {
    use windows::Win32::Graphics::Printing::GetDefaultPrinterW;
    unsafe {
        let mut size: u32 = 0;
        let _ = GetDefaultPrinterW(windows::core::PWSTR::null(), &mut size);
        if size == 0 {
            return None;
        }
        let mut buf: Vec<u16> = vec![0u16; size as usize];
        let pwstr = windows::core::PWSTR(buf.as_mut_ptr());
        match GetDefaultPrinterW(pwstr, &mut size) {
            Ok(_) => pwstr.to_string().ok(),
            Err(_) => None,
        }
    }
}

/// Send raw bytes (ESC/POS commands) to a named Windows printer via the print spooler.
#[cfg(target_os = "windows")]
pub fn raw_print(printer_name: &str, data: &[u8]) -> Result<(), String> {
    unsafe {
        let h_printer_name = HSTRING::from(printer_name);
        let mut handle = windows::Win32::Foundation::HANDLE::default();

        let raw_str = HSTRING::from("RAW");
        let defaults = PRINTER_DEFAULTSW {
            pDatatype: PCWSTR(raw_str.as_ptr()),
            ..Default::default()
        };

        OpenPrinterW(
            PCWSTR(h_printer_name.as_ptr()),
            &mut handle,
            Some(&defaults),
        )
        .map_err(|e| format!("OpenPrinterW failed for '{}': {}", printer_name, e))?;

        let doc_name = HSTRING::from("POS Receipt");
        let raw_type = HSTRING::from("RAW");
        let doc_info = DOC_INFO_1W {
            pDocName: PCWSTR(doc_name.as_ptr()),
            pDatatype: PCWSTR(raw_type.as_ptr()),
            pOutputFile: PCWSTR::null(),
        };

        let job_id = StartDocPrinterW(handle, 1, &doc_info as *const _ as *const _);
        if job_id == 0 {
            let _ = ClosePrinter(handle);
            return Err(format!(
                "StartDocPrinterW failed for '{}'",
                printer_name
            ));
        }

        if let Err(e) = StartPagePrinter(handle) {
            let _ = EndDocPrinter(handle);
            let _ = ClosePrinter(handle);
            return Err(format!("StartPagePrinter failed: {}", e));
        }

        let mut bytes_written: u32 = 0;
        let write_ok = WritePrinter(
            handle,
            data.as_ptr() as *const _,
            data.len() as u32,
            &mut bytes_written,
        );

        let _ = EndPagePrinter(handle);
        let _ = EndDocPrinter(handle);
        let _ = ClosePrinter(handle);

        if let Err(e) = write_ok {
            return Err(format!(
                "WritePrinter failed for '{}': {}",
                printer_name, e
            ));
        }

        if bytes_written != data.len() as u32 {
            return Err(format!(
                "WritePrinter: wrote {} of {} bytes",
                bytes_written,
                data.len()
            ));
        }

        log::info!(
            "Raw print to '{}': {} bytes sent successfully",
            printer_name,
            bytes_written
        );
        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
pub fn list_system_printers() -> Result<Vec<SystemPrinterInfo>, String> {
    Err("System printer listing is only supported on Windows".to_string())
}

#[cfg(not(target_os = "windows"))]
pub fn raw_print(_printer_name: &str, _data: &[u8]) -> Result<(), String> {
    Err("System printer printing is only supported on Windows".to_string())
}
