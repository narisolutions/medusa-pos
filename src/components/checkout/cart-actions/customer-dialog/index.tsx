import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomerDialog } from "./hooks";
import { Loader2, User, X } from "lucide-react";
import { toast } from "sonner";
import { AdminOrder } from "@medusajs/types";
import { useCheckout } from "../../hooks";
import { useTranslation } from "@/i18n";

type CustomerDialogProps = {
  open: boolean;
  onClose: () => void;
  initialEmail?: string | null;
  currentCustomerEmail?: string | null;
  onApply: (customerId: string, email: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  order?: AdminOrder;
};

const CustomerDialog: React.FC<CustomerDialogProps> = ({
  open,
  onClose,
  initialEmail,
  currentCustomerEmail,
  onApply,
  onRemove,
  order,
}) => {
  const {
    email,
    setEmail,
    isLoading,
    customer,
    hasSearched,
    searchCustomer,
    clearCustomer,
    resetSearch,
  } = useCustomerDialog();

  const hasAccount = order?.customer?.has_account || null;
  const { t } = useTranslation();

  // Initialize email when dialog opens
  useEffect(() => {
    if (open) {
      setEmail(initialEmail || "");
      if (!initialEmail) {
        clearCustomer();
      }
    }
  }, [open, initialEmail, setEmail, clearCustomer]);

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      // Reset to original email when closing without applying
      setEmail(initialEmail || "");
      clearCustomer();
    }
  };

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error("Please enter a customer email");
      return;
    }

    await searchCustomer(email.trim());
  };

  const handleApply = async () => {
    if (!customer) {
      toast.error("Please search and select a customer first");
      return;
    }

    try {
      await onApply(customer.id, email.trim());
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to attach customer to order"
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
          : "Failed to remove customer from order"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-xl p-6 md:p-8">
        <DialogTitle className="text-2xl font-semibold">
          {t("checkout.attach_customer_title")}
        </DialogTitle>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetSearch();
                }}
                placeholder={t("checkout.customer_email_placeholder")}
                className="flex-1 h-12 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSearch();
                  }
                }}
                disabled={isLoading}
              />
              <Button
                onClick={handleSearch}
                disabled={isLoading || !email.trim()}
                className="h-12 px-5 text-base text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t("checkout.search_customer_button")
                )}
              </Button>
            </div>
          </div>

          {customer && (
            <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-4">
                <User className="w-6 h-6 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-green-900">
                    {t("checkout.customer_found")}
                  </div>
                  <div className="text-base text-green-700 mt-1 space-y-1">
                    <div>{t("checkout.customer_email_label")}{customer.email}</div>
                    {customer.first_name || customer.last_name ? (
                      <div>
                        {t("checkout.customer_name_label")}{customer.first_name || ""}{" "}
                        {customer.last_name || ""}
                      </div>
                    ) : null}
                    <div className="text-sm text-green-600 mt-1">
                      {t("checkout.customer_phone_label")}{customer.phone || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasSearched && !isLoading && email && !customer && (
            <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="text-base text-yellow-800">
                {t("checkout.no_customer_found_message")}
              </div>
            </div>
          )}

          {hasAccount && (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-blue-900">
                    {t("checkout.current_customer")}
                  </div>
                  <div className="text-base text-blue-700">
                    {currentCustomerEmail}
                  </div>
                </div>
                {onRemove && (
                  <Button
                    variant="outline"
                    onClick={handleRemove}
                    className="h-11 px-4 text-base text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-5 h-5 mr-2" />
                    {t("checkout.remove_customer_button")}
                  </Button>
                )}
              </div>
            </div>
          )}

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
              disabled={!customer || isLoading}
              className="h-12 px-6 text-base bg-primary hover:bg-primary/90 text-white"
            >
              {t("common.apply")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
      currentCustomerEmail={customerEmail}
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
