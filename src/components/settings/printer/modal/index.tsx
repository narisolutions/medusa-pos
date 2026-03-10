import React, { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Printer } from "../hooks";

interface PrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (printer: Omit<Printer, "id">) => Promise<void>;
  editingPrinter?: Printer | null;
}

const initialFormData = {
  name: "",
  type: "receipt" as const,
  connectionType: "network" as "usb" | "network" | "bluetooth",
  address: "",
  port: "",
  isDefault: false,
};

const PrinterModal: React.FC<PrinterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPrinter,
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingPrinter) {
      setFormData({
        name: editingPrinter.name,
        type: editingPrinter.type,
        connectionType: editingPrinter.connectionType,
        address: editingPrinter.address,
        port: editingPrinter.port || "",
        isDefault: editingPrinter.isDefault,
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [editingPrinter, isOpen]);

  const validateForm = () => {
    try {
      schemas.printer.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      const newErrors: Record<string, string> = {};
      if (error && typeof error === "object" && "errors" in error) {
        const zodError = error as {
          errors: Array<{ path: string[]; message: string }>;
        };
        zodError.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0]] = err.message;
          }
        });
      }
      setErrors(newErrors);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSave(formData);
      onClose();
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  const connectionConfig = {
    network: { placeholder: "192.168.1.100", label: "IP Address" },
    usb: { placeholder: "/dev/usb/lp0", label: "USB Port/Device" },
    bluetooth: { placeholder: "00:11:22:33:44:55", label: "Bluetooth Address" },
  };

  const config = connectionConfig[formData.connectionType];

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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-lg font-medium">Printer Name</Label>
            <Input
              id="name"
              placeholder="e.g., Receipt Printer 1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12 text-lg px-4"
            />
            {errors.name && <p className="text-base text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-3">
            <Label htmlFor="connectionType" className="text-lg font-medium">Connection Type</Label>
            <select
              id="connectionType"
              value={formData.connectionType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  connectionType: e.target.value as "usb" | "network" | "bluetooth",
                })
              }
              className="flex h-12 w-full rounded-md border border-input bg-transparent px-4 py-2 text-lg shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="network">Network (IP)</option>
              <option value="usb">USB</option>
              <option value="bluetooth">Bluetooth</option>
            </select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="address" className="text-lg font-medium">{config.label}</Label>
            <Input
              id="address"
              placeholder={config.placeholder}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="h-12 text-lg px-4"
            />
            {errors.address && <p className="text-base text-red-600">{errors.address}</p>}
          </div>

          {formData.connectionType === "network" && (
            <div className="space-y-3">
              <Label htmlFor="port" className="text-lg font-medium">Port (Optional)</Label>
              <Input
                id="port"
                placeholder="9100"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                className="h-12 text-lg px-4"
              />
            </div>
          )}

          <div className="flex items-center space-x-3 py-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-5 w-5 rounded border border-theme-border text-primary focus:ring-2 focus:ring-primary"
            />
            <Label htmlFor="isDefault" className="text-lg font-medium">Set as default printer</Label>
          </div>

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
      </DialogContent>
    </Dialog>
  );
};

export default PrinterModal;
