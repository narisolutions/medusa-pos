import React, { useEffect } from "react";
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
  isDefault: false,
  openCashDrawer: false,
  openCashDrawerOnCash: false,
  openCashDrawerOnCard: false,
};

const connectionConfig = {
  network: { placeholder: "192.168.1.100", label: "IP Address" },
  usb: { placeholder: "/dev/usb/lp0", label: "USB Port/Device" },
  bluetooth: { placeholder: "00:11:22:33:44:55", label: "Bluetooth Address" },
};

const PrinterDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingPrinter,
}) => {
  const form = useForm<PrinterFormValues>({
    defaultValues: initialFormData,
  });

  const { control, handleSubmit, reset, watch, setError, clearErrors } = form;

  useEffect(() => {
    if (editingPrinter) {
      reset({
        name: editingPrinter.name,
        type: editingPrinter.type,
        connectionType: editingPrinter.connectionType,
        address: editingPrinter.address,
        port: editingPrinter.port || "",
        isDefault: editingPrinter.isDefault,
        openCashDrawer: editingPrinter.openCashDrawer ?? false,
        openCashDrawerOnCash: editingPrinter.openCashDrawerOnCash ?? false,
        openCashDrawerOnCard: editingPrinter.openCashDrawerOnCard ?? false,
      });
    } else {
      reset(initialFormData);
    }
    clearErrors();
  }, [editingPrinter, isOpen, reset, clearErrors]);

  const handleClose = () => {
    reset(initialFormData);
    onClose();
  };

  const onSubmit: SubmitHandler<PrinterFormValues> = async (values) => {
    try {
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
                      onValueChange={field.onChange}
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
