import { useCallback, useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import schemas from "@/utils/schemas";
import { Printer } from "../hooks";
import { getTauriInvokeErrorMessage } from "@/utils/helpers";
import { useTranslation } from "@/i18n";

interface UsbDeviceInfo {
  vendor_id: number;
  product_id: number;
  description: string;
}

interface SystemPrinterInfo {
  name: string;
  driver_name: string;
  port_name: string;
  is_default: boolean;
}

type PrinterFormValues = {
  name: string;
  type: "receipt";
  connectionType: "local" | "usb" | "network" | "bluetooth";
  address: string;
  port: string;
  vendorId?: number;
  productId?: number;
  isDefault: boolean;
  openCashDrawer: boolean;
  openCashDrawerOnCash: boolean;
  openCashDrawerOnCard: boolean;
  paperWidth: "80mm" | "57mm";
  encoding: "ascii" | "utf8" | "cp852";
};

const initialFormData: PrinterFormValues = {
  name: "",
  type: "receipt",
  connectionType: "local",
  address: "",
  port: "",
  vendorId: undefined,
  productId: undefined,
  isDefault: false,
  openCashDrawer: false,
  openCashDrawerOnCash: false,
  openCashDrawerOnCard: false,
  paperWidth: "80mm",
  encoding: "ascii",
};

function formatVidPid(vendorId: number, productId: number): string {
  return `${vendorId.toString(16).padStart(4, "0")}:${productId.toString(16).padStart(4, "0")}`;
}

const usePrinterModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);

  const openModal = (printer?: Printer) => {
    setEditingPrinter(printer || null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingPrinter(null);
  };

  return {
    isOpen,
    editingPrinter,
    openModal,
    closeModal,
  };
};

// All device-scanning and form state for the printer dialog; index.tsx only renders.
const usePrinterDialog = (
  isOpen: boolean,
  onClose: () => void,
  onSave: (printer: Omit<Printer, "id">) => Promise<void>,
  editingPrinter?: Printer | null
) => {
  const { t } = useTranslation();
  const form = useForm<PrinterFormValues>({
    defaultValues: initialFormData,
  });

  const { control, handleSubmit, reset, watch, setValue, setError, clearErrors } = form;

  const [usbDevices, setUsbDevices] = useState<UsbDeviceInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [systemPrinters, setSystemPrinters] = useState<SystemPrinterInfo[]>([]);
  const [isLoadingSystemPrinters, setIsLoadingSystemPrinters] = useState(false);
  const [systemPrinterError, setSystemPrinterError] = useState<string | null>(null);

  const loadSystemPrinters = useCallback(async () => {
    setIsLoadingSystemPrinters(true);
    setSystemPrinterError(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const printers = await invoke<SystemPrinterInfo[]>("list_system_printers");
      setSystemPrinters(printers);
      if (printers.length === 0) {
        setSystemPrinterError(t("settings.printer.dialog_no_system_printers"));
      }
    } catch (error) {
      setSystemPrinterError(
        getTauriInvokeErrorMessage(error, t("settings.printer.dialog_list_system_printers_failed"))
      );
      setSystemPrinters([]);
    } finally {
      setIsLoadingSystemPrinters(false);
    }
  }, [t]);

  useEffect(() => {
    if (editingPrinter) {
      reset({
        name: editingPrinter.name,
        type: editingPrinter.type,
        connectionType: editingPrinter.connectionType,
        address: editingPrinter.address,
        port: editingPrinter.port || "",
        vendorId: editingPrinter.vendorId,
        productId: editingPrinter.productId,
        isDefault: editingPrinter.isDefault,
        openCashDrawer: editingPrinter.openCashDrawer ?? false,
        openCashDrawerOnCash: editingPrinter.openCashDrawerOnCash ?? false,
        openCashDrawerOnCard: editingPrinter.openCashDrawerOnCard ?? false,
        paperWidth: editingPrinter.paperWidth ?? "80mm",
        encoding: (editingPrinter as PrinterFormValues).encoding ?? "ascii",
      });
    } else {
      reset(initialFormData);
    }
    clearErrors();
    setScanError(null);
    setSystemPrinterError(null);

    if (isOpen) {
      const connType = editingPrinter?.connectionType ?? initialFormData.connectionType;
      if (connType === "local") {
        loadSystemPrinters();
      }
    }
  }, [editingPrinter, isOpen, reset, clearErrors, loadSystemPrinters]);

  const scanUsbDevices = async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const devices = await invoke<UsbDeviceInfo[]>("list_usb_devices");
      setUsbDevices(devices);
      if (devices.length === 0) {
        setScanError(t("settings.printer.dialog_no_usb"));
      }
    } catch (error) {
      setScanError(
        getTauriInvokeErrorMessage(error, t("settings.printer.dialog_scan_usb_failed"))
      );
      setUsbDevices([]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSystemPrinterSelect = (printerName: string) => {
    setValue("address", printerName);
    const printer = systemPrinters.find((p) => p.name === printerName);
    if (printer && !watch("name")) {
      setValue("name", printer.name);
    }
  };

  const handleUsbDeviceSelect = (value: string) => {
    const device = usbDevices.find(
      (d) => `${d.vendor_id}:${d.product_id}` === value
    );
    if (device) {
      setValue("vendorId", device.vendor_id);
      setValue("productId", device.product_id);
      setValue("address", `${device.description} (${formatVidPid(device.vendor_id, device.product_id)})`);
    }
  };

  const handleClose = () => {
    reset(initialFormData);
    setUsbDevices([]);
    setScanError(null);
    setSystemPrinters([]);
    setSystemPrinterError(null);
    onClose();
  };

  const onSubmit: SubmitHandler<PrinterFormValues> = async (values) => {
    try {
      if (values.connectionType === "usb" && (!values.vendorId || !values.productId)) {
        setError("address", { type: "manual", message: t("settings.printer.dialog_error_select_usb") });
        return;
      }
      if (values.connectionType === "local" && !values.address) {
        setError("address", { type: "manual", message: t("settings.printer.dialog_error_select_system") });
        return;
      }
      schemas.printer.parse(values);
      clearErrors();
      await onSave(values);
      handleClose();
    } catch (error) {
      if (error && typeof error === "object" && "errors" in error) {
        const zodError = error as {
          errors: Array<{ path: (keyof PrinterFormValues)[]; message: string }>;
        };
        zodError.errors.forEach((err) => {
          const fieldName = err.path[0];
          if (fieldName) {
            setError(fieldName, { type: "manual", message: err.message });
          }
        });
      }
    }
  };

  const connectionType =
    (watch("connectionType") as PrinterFormValues["connectionType"]) ??
    initialFormData.connectionType;
  const cashDrawerEnabled = watch("openCashDrawer");
  const currentVendorId = watch("vendorId");
  const currentProductId = watch("productId");
  const selectedUsbKey =
    currentVendorId && currentProductId
      ? `${currentVendorId}:${currentProductId}`
      : "";

  return {
    form,
    control,
    watch,
    setValue,
    submit: handleSubmit(onSubmit),
    usbDevices,
    isScanning,
    scanError,
    systemPrinters,
    isLoadingSystemPrinters,
    systemPrinterError,
    scanUsbDevices,
    loadSystemPrinters,
    handleSystemPrinterSelect,
    handleUsbDeviceSelect,
    handleClose,
    connectionType,
    cashDrawerEnabled,
    currentVendorId,
    currentProductId,
    selectedUsbKey,
  };
};

export { usePrinterModal, usePrinterDialog, formatVidPid, initialFormData };
export type { PrinterFormValues, UsbDeviceInfo, SystemPrinterInfo };
