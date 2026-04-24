import React, { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import schemas from "@/utils/schemas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer } from "../hooks";
import { getTauriInvokeErrorMessage } from "@/utils/helpers";
import { Loader2, RefreshCw } from "lucide-react";
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (printer: Omit<Printer, "id">) => Promise<void>;
  editingPrinter?: Printer | null;
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

const PrinterDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingPrinter,
}) => {
  const { t } = useTranslation();
  const connectionConfig = {
    local: { placeholder: t("settings.printer.dialog_system_printer_placeholder"), label: t("settings.printer.dialog_system_printer_label") },
    network: { placeholder: "192.168.1.100", label: t("settings.printer.dialog_ip_label") },
    usb: { placeholder: t("settings.printer.dialog_usb_placeholder"), label: t("settings.printer.dialog_usb_label") },
    bluetooth: { placeholder: "00:11:22:33:44:55", label: t("settings.printer.dialog_bluetooth_label") },
  };
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
  }, [editingPrinter, isOpen, reset, clearErrors]);

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

  const loadSystemPrinters = async () => {
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
  const config = connectionConfig[connectionType];
  const cashDrawerEnabled = watch("openCashDrawer");
  const currentVendorId = watch("vendorId");
  const currentProductId = watch("productId");
  const selectedUsbKey =
    currentVendorId && currentProductId
      ? `${currentVendorId}:${currentProductId}`
      : "";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {editingPrinter ? t("settings.printer.dialog_title_edit") : t("settings.printer.dialog_title_add")}
          </DialogTitle>
          <DialogDescription className="text-lg text-fg-muted mt-2">
            {t("settings.printer.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("settings.printer.dialog_name_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("settings.printer.dialog_name_placeholder")}
                      className="h-12 text-lg px-4"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="connectionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("settings.printer.dialog_connection_type_label")}
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setValue("address", "");
                        if (value === "usb") {
                          setValue("vendorId", undefined);
                          setValue("productId", undefined);
                        }
                        if (value === "local" && systemPrinters.length === 0) {
                          loadSystemPrinters();
                        }
                      }}
                      value={field.value}
                    >
                      <SelectTrigger className="h-12 text-lg px-4">
                        {field.value === "local" && <span>{t("settings.printer.dialog_local")}</span>}
                        {field.value === "network" && (
                          <span>{t("settings.printer.dialog_network")}</span>
                        )}
                        {field.value === "usb" && <span>{t("settings.printer.dialog_usb_item")}</span>}
                        {field.value === "bluetooth" && (
                          <span>{t("settings.printer.dialog_bluetooth_item")}</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">{t("settings.printer.dialog_local")}</SelectItem>
                        <SelectItem value="network">{t("settings.printer.dialog_network")}</SelectItem>
                        <SelectItem value="usb">{t("settings.printer.dialog_usb_item")}</SelectItem>
                        <SelectItem value="bluetooth">{t("settings.printer.dialog_bluetooth_item")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            {connectionType === "local" ? (
              <FormField
                control={control}
                name="address"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-lg font-medium">
                        {config.label}
                      </FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadSystemPrinters}
                        disabled={isLoadingSystemPrinters}
                        className="h-8 text-sm"
                      >
                        {isLoadingSystemPrinters ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1.5" />
                        )}
                        {isLoadingSystemPrinters ? t("common.loading") : t("common.refresh")}
                      </Button>
                    </div>
                    <FormControl>
                      <Select
                        onValueChange={handleSystemPrinterSelect}
                        value={watch("address") || ""}
                      >
                        <SelectTrigger className="h-12 text-lg px-4">
                          {watch("address") ? (
                            <span className="truncate">{watch("address")}</span>
                          ) : (
                            <span className="text-fg-muted">
                              {config.placeholder}
                            </span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {systemPrinters.length === 0 && !isLoadingSystemPrinters && (
                            <div className="px-3 py-4 text-base text-fg-muted text-center">
                              {t("settings.printer.dialog_click_refresh_hint")}
                            </div>
                          )}
                          {systemPrinters.map((printer) => (
                            <SelectItem key={printer.name} value={printer.name}>
                              <div className="flex flex-col">
                                <span>{printer.name}</span>
                                <span className="text-sm text-fg-muted">
                                  {printer.port_name}
                                  {printer.is_default && ` ${t("settings.printer.dialog_default_badge")}`}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {systemPrinterError && (
                      <p className="text-sm text-destructive mt-1">{systemPrinterError}</p>
                    )}
                    <FormMessage className="text-base" />
                  </FormItem>
                )}
              />
            ) : connectionType === "usb" ? (
              <FormField
                control={control}
                name="address"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-lg font-medium">
                        {config.label}
                      </FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={scanUsbDevices}
                        disabled={isScanning}
                        className="h-8 text-sm"
                      >
                        {isScanning ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1.5" />
                        )}
                        {isScanning ? t("settings.printer.dialog_scanning") : t("settings.printer.dialog_scan_devices")}
                      </Button>
                    </div>
                    <FormControl>
                      <Select
                        onValueChange={handleUsbDeviceSelect}
                        value={selectedUsbKey}
                      >
                        <SelectTrigger className="h-12 text-lg px-4">
                          {selectedUsbKey ? (
                            <span className="truncate">
                              {usbDevices.find(
                                (d) =>
                                  `${d.vendor_id}:${d.product_id}` ===
                                  selectedUsbKey
                              )?.description ||
                                watch("address") ||
                                formatVidPid(currentVendorId!, currentProductId!)}
                            </span>
                          ) : (
                            <span className="text-fg-muted">
                              {config.placeholder}
                            </span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {usbDevices.length === 0 && !isScanning && (
                            <div className="px-3 py-4 text-base text-fg-muted text-center">
                              {t("settings.printer.dialog_click_scan_hint")}
                            </div>
                          )}
                          {usbDevices.map((device) => (
                            <SelectItem
                              key={`${device.vendor_id}:${device.product_id}`}
                              value={`${device.vendor_id}:${device.product_id}`}
                            >
                              <div className="flex flex-col">
                                <span>{device.description}</span>
                                <span className="text-sm text-fg-muted">
                                  {formatVidPid(device.vendor_id, device.product_id)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {scanError && (
                      <p className="text-sm text-destructive mt-1">{scanError}</p>
                    )}
                    <FormMessage className="text-base" />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium">
                      {config.label}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={config.placeholder}
                        className="h-12 text-lg px-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-base" />
                  </FormItem>
                )}
              />
            )}

            {connectionType === "network" && (
              <FormField
                control={control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-medium">
                      {t("settings.printer.dialog_port_label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="9100"
                        className="h-12 text-lg px-4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-base" />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={control}
              name="isDefault"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between py-2">
                    <FormLabel className="text-lg font-medium">
                      {t("settings.printer.dialog_is_default_label")}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="openCashDrawer"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between py-2">
                    <FormLabel className="text-lg font-medium">
                      {t("settings.printer.dialog_cash_drawer_label")}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            {cashDrawerEnabled && (
              <div className="space-y-3 pl-4 border-l-2 border-theme-border">
                <p className="text-base font-medium text-fg-muted">{t("settings.printer.dialog_open_drawer_on")}</p>
                <FormField
                  control={control}
                  name="openCashDrawerOnCash"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-lg font-normal cursor-pointer">
                          {t("settings.printer.dialog_cash_payments")}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="openCashDrawerOnCard"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-lg font-normal cursor-pointer">
                          {t("settings.printer.dialog_card_payments")}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={control}
              name="paperWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">{t("settings.printer.dialog_paper_width_label")}</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value ?? "80mm"}>
                      <SelectTrigger className="h-12 text-lg px-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="80mm">{t("settings.printer.dialog_paper_80mm")}</SelectItem>
                        <SelectItem value="57mm">{t("settings.printer.dialog_paper_57mm")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="encoding"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">{t("settings.printer.encoding")}</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value ?? "ascii"}>
                      <SelectTrigger className="h-12 text-lg px-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ascii">{t("settings.printer.encoding_ascii")}</SelectItem>
                        <SelectItem value="utf8">{t("settings.printer.encoding_utf8")}</SelectItem>
                        <SelectItem value="cp852">{t("settings.printer.encoding_cp852")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <p className="text-sm text-fg-muted mt-1">
                    {field.value === "ascii" && t("settings.printer.dialog_encoding_ascii_desc")}
                    {field.value === "utf8" && t("settings.printer.dialog_encoding_utf8_desc")}
                    {field.value === "cp852" && t("settings.printer.dialog_encoding_cp852_desc")}
                  </p>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-12 px-6 text-lg min-w-[48px]"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="default"
                className="h-12 px-6 text-lg min-w-[48px] text-white bg-primary hover:bg-primary/90"
              >
                {editingPrinter ? t("settings.printer.dialog_update_button") : t("settings.printer.add")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PrinterDialog;
