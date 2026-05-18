import React, { useEffect, useMemo, useState } from "react";
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
    searchTerm,
    setSearchTerm,
    isSearching,
    isCreating,
    customers,
    selectedCustomer,
    setSelectedCustomer,
    hasSearched,
    searchCustomers,
    createCustomer,
    clearCustomer,
  } = useCustomerDialog();

  const hasAccount = order?.customer?.has_account || null;
  const { t } = useTranslation();
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createCompany, setCreateCompany] = useState("");

  const isBusy = isSearching || isCreating;

  const selectedCustomerLabel = useMemo(() => {
    if (!selectedCustomer) return null;
    const name = [selectedCustomer.first_name, selectedCustomer.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || selectedCustomer.email || selectedCustomer.id;
  }, [selectedCustomer]);

  // Initialize email when dialog opens
  useEffect(() => {
    if (open) {
      setSearchTerm(initialEmail || "");
      if (!initialEmail) {
        clearCustomer();
      }
      setIsCreateMode(false);
    }
  }, [open, initialEmail, setSearchTerm, clearCustomer]);

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      // Reset to original email when closing without applying
      setSearchTerm(initialEmail || "");
      clearCustomer();
      setIsCreateMode(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error(t("checkout.customer_search_required"));
      return;
    }

    setIsCreateMode(false);
    await searchCustomers(searchTerm.trim());
  };

  const handleApply = async () => {
    if (!selectedCustomer) {
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
          : t("checkout.customer_attach_failed")
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

  const handleCreateCustomer = async () => {
    if (!createEmail.trim()) {
      toast.error(t("checkout.customer_create_email_required"));
      return;
    }

    try {
      await createCustomer({
        email: createEmail.trim(),
        first_name: createFirstName.trim() || undefined,
        last_name: createLastName.trim() || undefined,
        phone: createPhone.trim() || undefined,
        company_name: createCompany.trim() || undefined,
      });
      toast.success(t("checkout.customer_created_success"));
      setIsCreateMode(false);
    } catch {
      // `createCustomer` already toasts via `handleErrorToast`.
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl p-6 md:p-8">
        <DialogTitle className="text-2xl font-semibold">
          {t("checkout.customer_attach_title")}
        </DialogTitle>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex gap-3">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  clearCustomer();
                  setIsCreateMode(false);
                }}
                placeholder={t("checkout.customer_search_placeholder")}
                className="flex-1 h-12 text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSearch();
                  }
                }}
                disabled={isBusy}
              />
              <Button
                onClick={handleSearch}
                disabled={isBusy || !searchTerm.trim()}
                className="h-12 px-5 text-base text-white"
              >
                {isBusy ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t("checkout.customer_search_button")
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateMode((v) => !v);
                  setCreateEmail(searchTerm.trim());
                }}
                disabled={isBusy}
                className="h-12 px-5 text-base"
              >
                {t("checkout.customer_create_button")}
              </Button>
            </div>
          </div>

          {customers.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-fg">
                {t("checkout.customer_results_title")}
              </div>
              <div className="max-h-56 overflow-auto rounded-xl border border-theme-border bg-surface">
                {customers.map((c) => {
                  const isSelected = selectedCustomer?.id === c.id;
                  const name = [c.first_name, c.last_name]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCustomer(c)}
                      disabled={isBusy}
                      className={`w-full text-left px-4 py-3 border-b border-theme-border last:border-b-0 transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/30"
                          : "bg-surface hover:bg-surface-hover"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-fg truncate">
                            {name || c.email || c.id}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {c.email || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t("checkout.customer_phone_label")}
                            {c.phone || "—"}
                          </div>
                        </div>
                        {isSelected ? (
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                            {t("checkout.customer_selected_badge")}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedCustomer && (
            <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start gap-4">
                <User className="w-6 h-6 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-green-900">
                    {t("checkout.customer_selected_title")}
                  </div>
                  <div className="text-base text-green-700 mt-1 space-y-1">
                    <div>
                      {t("checkout.customer_email_label")}
                      {selectedCustomer.email || "—"}
                    </div>
                    {selectedCustomer.first_name || selectedCustomer.last_name ? (
                      <div>
                        {t("checkout.customer_name_label")}
                        {selectedCustomer.first_name || ""}{" "}
                        {selectedCustomer.last_name || ""}
                      </div>
                    ) : null}
                    <div className="text-sm text-green-600 mt-1">
                      {t("checkout.customer_phone_label")}
                      {selectedCustomer.phone || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasSearched &&
            !isBusy &&
            searchTerm &&
            customers.length === 0 &&
            !isCreateMode && (
            <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="text-base text-yellow-800">
                {t("checkout.customer_not_found_message")}
              </div>
            </div>
          )}

          {isCreateMode && (
            <div className="p-5 border border-theme-border rounded-xl bg-surface space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-fg">
                  {t("checkout.customer_create_title")}
                </div>
                {selectedCustomerLabel ? (
                  <div className="text-xs text-muted-foreground truncate">
                    {t("checkout.customer_selected_prefix")}
                    {selectedCustomerLabel}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder={t("checkout.customer_email_placeholder")}
                  className="h-11 text-base"
                  disabled={isBusy}
                />
                <Input
                  type="tel"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder={t("checkout.customer_phone_placeholder")}
                  className="h-11 text-base"
                  disabled={isBusy}
                />
                <Input
                  type="text"
                  value={createFirstName}
                  onChange={(e) => setCreateFirstName(e.target.value)}
                  placeholder={t("checkout.customer_first_name_placeholder")}
                  className="h-11 text-base"
                  disabled={isBusy}
                />
                <Input
                  type="text"
                  value={createLastName}
                  onChange={(e) => setCreateLastName(e.target.value)}
                  placeholder={t("checkout.customer_last_name_placeholder")}
                  className="h-11 text-base"
                  disabled={isBusy}
                />
                <Input
                  type="text"
                  value={createCompany}
                  onChange={(e) => setCreateCompany(e.target.value)}
                  placeholder={t("checkout.customer_company_placeholder")}
                  className="h-11 text-base md:col-span-2"
                  disabled={isBusy}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateMode(false)}
                  disabled={isBusy}
                  className="h-11 px-4 text-base"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => void handleCreateCustomer()}
                  disabled={isBusy}
                  className="h-11 px-5 text-base text-white"
                >
                  {isBusy ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    t("checkout.customer_create_submit_button")
                  )}
                </Button>
              </div>
            </div>
          )}

          {hasAccount && (
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-blue-900">
                    {t("checkout.customer_current")}
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
                    {t("checkout.customer_remove_button")}
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
              disabled={!selectedCustomer || isBusy}
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
