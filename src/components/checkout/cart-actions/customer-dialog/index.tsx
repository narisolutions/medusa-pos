// CustomerDialog/index.tsx
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminOrder, AdminCustomer } from "@medusajs/types";
import { useTranslation } from "@/i18n";

import { useCheckout } from "../../hooks";
import { CustomerSearch } from "./customer-search";
import { CustomerCreateForm } from "./customer-create";

type CustomerDialogProps = {
  open: boolean;
  onClose: () => void;
  initialEmail?: string | null;
  onApply: (customerId: string, email: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  order?: AdminOrder;
};

const CustomerDialog: React.FC<CustomerDialogProps> = ({
  open,
  onClose,
  initialEmail,
  onApply,
  onRemove,
  order,
}) => {
  const { t } = useTranslation();
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);

  const hasAccount = order?.customer?.has_account || null;

  const handleCustomerSelect = (customer: AdminCustomer) => {
    setSelectedCustomer(customer);
  };

  const handleCustomerCreated = (customer: AdminCustomer) => {
    setSelectedCustomer(customer);
    setIsCreateMode(false);
    toast.success(t("checkout.customer_created_success"));
  };

  const handleApply = async () => {
    if (!selectedCustomer) {
      if (onRemove && initialEmail) {
        await handleRemove();
        return;
      }

      toast.error(t("checkout.customer_select_required"));
      return;
    }

    try {
      await onApply(selectedCustomer.id, selectedCustomer.email || "");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("checkout.customer_attach_failed"),
      );
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;

    try {
      await onRemove();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove customer from order",
      );
    }
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setSelectedCustomer(null);
      setIsCreateMode(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl p-6 md:p-8">
        <DialogTitle className="text-2xl font-semibold">
          {isCreateMode ? t("checkout.customer_create_title") : t("checkout.customer_attach_title")}
        </DialogTitle>
        
        <div className="space-y-6">
          {!isCreateMode ? (
            <CustomerSearch
              isOpen={open}
              initialEmail={initialEmail || undefined}
              onCustomerSelect={handleCustomerSelect}
              onCustomerClear={() => setSelectedCustomer(null)}
              selectedCustomer={selectedCustomer}
              onStartCreate={() => setIsCreateMode(true)}
            />
          ) : (
            <CustomerCreateForm
              onCustomerCreated={handleCustomerCreated}
              onCancel={() => setIsCreateMode(false)}
            />
          )}

          {/* Current Customer Display */}
          {hasAccount && initialEmail && (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
              <div>
                <div className="text-base font-semibold text-blue-900">
                  {t("checkout.customer_current")}
                </div>
                <div className="text-base text-blue-700">
                  {initialEmail}
                </div>
              </div>
            </div>
          )}

          {!isCreateMode ? (
            <div className="flex justify-end gap-4 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-12 px-5 text-base"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleApply}
                disabled={!selectedCustomer && !(onRemove && initialEmail)}
                className="h-12 px-6 text-base bg-primary hover:bg-primary/90 text-white"
              >
                {t("common.save")}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Checkout-specific wrapper
type CheckoutCustomerDialogProps = {
  open: boolean;
  onClose: () => void;
};

const CheckoutCustomerDialog: React.FC<CheckoutCustomerDialogProps> = ({
  open,
  onClose,
}) => {
  const { customerEmail, attachCustomerToDraftOrder } = useCheckout();

  return (
    <CustomerDialog
      open={open}
      onClose={onClose}
      initialEmail={customerEmail}
      onApply={async (customerId, email) => {
        await attachCustomerToDraftOrder(customerId, email);
        toast.success(`Customer ${email} attached to order`);
      }}
      onRemove={async () => {
        await attachCustomerToDraftOrder(null, null);
        toast.success("Customer removed from order");
      }}
    />
  );
};

export default CheckoutCustomerDialog;
