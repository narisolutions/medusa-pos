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
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer } from "../hooks";
import { getTauriInvokeErrorMessage } from "@/utils/helpers";
import { Loader2, RefreshCw } from "lucide-react";

interface UsbDeviceInfo {
  vendor_id: number;
  product_id: number;
  description: string;
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
  connectionType: "usb" | "network" | "bluetooth";
  address: string;
  port: string;
  vendorId?: number;
  productId?: number;
  isDefault: boolean;
  openCashDrawer: boolean;
  openCashDrawerOnCash: boolean;
  openCashDrawerOnCard: boolean;
};

const initialFormData: PrinterFormValues = {
  name: "",
  type: "receipt",
  connectionType: "network",
  address: "",
  port: "",
  vendorId: undefined,
  productId: undefined,
  isDefault: false,
  openCashDrawer: false,
  openCashDrawerOnCash: false,
  openCashDrawerOnCard: false,
};

const connectionConfig = {
  network: { placeholder: "192.168.1.100", label: "IP Address" },
  usb: { placeholder: "Select or scan for a USB printer", label: "USB Device" },
  bluetooth: { placeholder: "00:11:22:33:44:55", label: "Bluetooth Address" },
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
  const form = useForm<PrinterFormValues>({
    defaultValues: initialFormData,
  });

  const { control, handleSubmit, reset, watch, setValue, setError, clearErrors } = form;

  const [usbDevices, setUsbDevices] = useState<UsbDeviceInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

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
      });
    } else {
      reset(initialFormData);
    }
    clearErrors();
    setScanError(null);
  }, [editingPrinter, isOpen, reset, clearErrors]);

  const scanUsbDevices = async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const devices = await invoke<UsbDeviceInfo[]>("list_usb_devices");
      setUsbDevices(devices);
      if (devices.length === 0) {
        setScanError("No USB printers found. Make sure your printer is plugged in and powered on.");
      }
    } catch (error) {
      setScanError(
        getTauriInvokeErrorMessage(error, "Failed to scan USB devices")
      );
      setUsbDevices([]);
    } finally {
      setIsScanning(false);
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
    onClose();
  };

  const onSubmit: SubmitHandler<PrinterFormValues> = async (values) => {
    try {
      if (values.connectionType === "usb" && (!values.vendorId || !values.productId)) {
        setError("address", { type: "manual", message: "Please scan and select a USB printer" });
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {editingPrinter ? "Edit Printer" : "Add New Printer"}
          </DialogTitle>
          <DialogDescription className="text-lg text-fg-muted mt-2">
            Configure your printer settings. Click save when you're done.
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
                    Printer Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Receipt Printer 1"
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
                    Connection Type
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "usb") {
                          setValue("address", "");
                          setValue("vendorId", undefined);
                          setValue("productId", undefined);
                        }
                      }}
                      value={field.value}
                    >
                      <SelectTrigger className="h-12 text-lg px-4">
                        {field.value === "network" && (
                          <span>Network (IP)</span>
                        )}
                        {field.value === "usb" && <span>USB</span>}
                        {field.value === "bluetooth" && (
                          <span>Bluetooth</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="network">Network (IP)</SelectItem>
                        <SelectItem value="usb">USB</SelectItem>
                        <SelectItem value="bluetooth">Bluetooth</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            {connectionType === "usb" ? (
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
                        {isScanning ? "Scanning..." : "Scan Devices"}
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
                              Click &quot;Scan Devices&quot; to detect USB printers
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
                      Port (Optional)
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
                      Set as default printer
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
                      Open cash drawer
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
                <p className="text-base font-medium text-fg-muted">Open drawer on</p>
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
                          Cash payments
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
                          Card payments
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="h-12 px-6 text-lg min-w-[48px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                className="h-12 px-6 text-lg min-w-[48px] text-white bg-primary hover:bg-primary/90"
              >
                {editingPrinter ? "Update" : "Add"} Printer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PrinterDialog;
