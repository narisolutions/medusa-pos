#[cfg(target_os = "windows")]
use windows::{
    core::{HSTRING, PCWSTR, PWSTR},
    Win32::{
        Foundation::HANDLE,
        Graphics::Printing::{
            ClosePrinter, EndDocPrinter, EndPagePrinter, EnumPrintersW, GetDefaultPrinterW,
            OpenPrinterW, StartDocPrinterW, StartPagePrinter, WritePrinter, DOC_INFO_1W,
            PRINTER_DEFAULTSW, PRINTER_ENUM_LOCAL, PRINTER_INFO_2W,
        },
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

        // First call to get required buffer size — returns FALSE (0) when
        // buffer is too small, which is expected.
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

        let ok = EnumPrintersW(
            flags,
            PCWSTR::null(),
            2,
            Some(&mut buffer),
            &mut bytes_needed,
            &mut count,
        );
        if !ok.as_bool() {
            return Err("EnumPrintersW failed on second call".to_string());
        }

        let printers_ptr = buffer.as_ptr() as *const PRINTER_INFO_2W;
        let printers = std::slice::from_raw_parts(printers_ptr, count as usize);

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
    unsafe {
        let mut size: u32 = 0;
        // First call to get required buffer size.
        let _ = GetDefaultPrinterW(PWSTR::null(), &mut size);
        if size == 0 {
            return None;
        }
        let mut buf: Vec<u16> = vec![0u16; size as usize];
        let pwstr = PWSTR(buf.as_mut_ptr());
        let ok = GetDefaultPrinterW(pwstr, &mut size);
        if ok.as_bool() {
            pwstr.to_string().ok()
        } else {
            None
        }
    }
}

/// Send raw bytes (ESC/POS commands) to a named Windows printer via the print spooler.
#[cfg(target_os = "windows")]
pub fn raw_print(printer_name: &str, data: &[u8]) -> Result<(), String> {
    unsafe {
        let h_printer_name = HSTRING::from(printer_name);
        let mut handle = HANDLE::default();

        let mut raw_str: Vec<u16> = "RAW\0".encode_utf16().collect();
        let defaults = PRINTER_DEFAULTSW {
            pDatatype: PWSTR(raw_str.as_mut_ptr()),
            ..Default::default()
        };

        OpenPrinterW(
            PCWSTR(h_printer_name.as_ptr()),
            &mut handle,
            Some(&defaults),
        )
        .map_err(|e| format!("OpenPrinterW failed for '{}': {}", printer_name, e))?;

        let mut doc_name_buf: Vec<u16> = "POS Receipt\0".encode_utf16().collect();
        let mut raw_type_buf: Vec<u16> = "RAW\0".encode_utf16().collect();
        let doc_info = DOC_INFO_1W {
            pDocName: PWSTR(doc_name_buf.as_mut_ptr()),
            pDatatype: PWSTR(raw_type_buf.as_mut_ptr()),
            pOutputFile: PWSTR::null(),
        };

        let job_id = StartDocPrinterW(handle, 1, &doc_info as *const _ as *const _);
        if job_id == 0 {
            let _ = ClosePrinter(handle);
            return Err(format!(
                "StartDocPrinterW failed for '{}'",
                printer_name
            ));
        }

        if !StartPagePrinter(handle).as_bool() {
            let _ = EndDocPrinter(handle);
            let _ = ClosePrinter(handle);
            return Err("StartPagePrinter failed".to_string());
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

        if !write_ok.as_bool() {
            return Err(format!(
                "WritePrinter failed for '{}'",
                printer_name
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
