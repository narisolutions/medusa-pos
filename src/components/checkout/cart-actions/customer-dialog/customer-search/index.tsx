// CustomerDialog/CustomerSearch.tsx
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { AdminCustomer } from "@medusajs/types";
import { useCustomerSearch } from "./hooks";

type CustomerSearchProps = {
  initialEmail?: string;
  isOpen?: boolean;
  onCustomerSelect?: (customer: AdminCustomer) => void;
  onCustomerClear?: () => void;
  onStartCreate?: () => void;
  selectedCustomer?: AdminCustomer | null;
};

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  initialEmail = "",
  isOpen = true,
  onCustomerSelect,
  onCustomerClear,
  onStartCreate,
  selectedCustomer: selectedFromParent,
}) => {
  const { t } = useTranslation();
  
  // Each component uses its own hook
  const {
    searchTerm,
    setSearchTerm,
    isSearching,
    customers,
    setCustomers,
    selectedCustomer,
    setSelectedCustomer,
    hasSearched,
    setHasSearched,
    searchCustomers,
    clearSearch,
    resetSearch,
  } = useCustomerSearch();

  // Silent search when the dialog opens with an email already selected.
  useEffect(() => {
    if (!isOpen) {
      resetSearch();
      return;
    }

    if (selectedFromParent) {
      return;
    }

    if (!initialEmail) {
      resetSearch();
      return;
    }

    setSearchTerm(initialEmail);
    void searchCustomers(initialEmail);
  }, [initialEmail, isOpen, resetSearch, searchCustomers, setSearchTerm]);

  // Auto-select when exactly 1 result is returned from a search
  useEffect(() => {
    if (customers.length === 1 && !isSearching && hasSearched && !selectedCustomer) {
      const customer = customers[0];
      setSelectedCustomer(customer);
      onCustomerSelect?.(customer);
    }
  }, [customers, isSearching, hasSearched]);

  // When parent provides a selected customer (e.g., after creating one), sync it
  useEffect(() => {
    if (selectedFromParent) {
      // Add to results list (dedup) and mark as selected
      setCustomers((prev) => {
        const exists = prev.some((c) => c.id === selectedFromParent.id);
        if (exists) return prev.map((c) => (c.id === selectedFromParent.id ? selectedFromParent : c));
        return [selectedFromParent, ...prev];
      });
      setSelectedCustomer(selectedFromParent);
    }
  }, [selectedFromParent, setCustomers, setSelectedCustomer]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error(t("checkout.customer_search_required"));
      return;
    }
    await searchCustomers(searchTerm.trim());
  };

  const handleSelectCustomer = (customer: AdminCustomer) => {
    setSelectedCustomer(customer);
    onCustomerSelect?.(customer);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex gap-3">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              clearSearch();
            }}
            placeholder={t("checkout.customer_search_placeholder")}
            className="flex-1 h-12 text-base"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleSearch();
              }
            }}
            disabled={isSearching}
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchTerm.trim()}
            className="h-12 px-5 text-base text-white"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              t("checkout.customer_search_button")
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onStartCreate}
            disabled={isSearching}
            className="h-12 px-5 text-base"
          >
            {t("checkout.customer_create_button")}
          </Button>
        </div>
      </div>

      {/* Search Results */}
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
                  onClick={() => handleSelectCustomer(c)}
                  disabled={isSearching}
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

      {/* Selected Customer Display */}
      {selectedCustomer && (
        <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <User className="w-6 h-6 text-green-600 mt-0.5" />
              <div className="flex-1 min-w-0">
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
            <Button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCustomers([]);
                setSelectedCustomer(null);
                setHasSearched(false);
                onCustomerClear?.();
              }}
              className="h-9 px-3 shrink-0"
              aria-label={t("common.delete")}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* No Results Found */}
      {hasSearched && !isSearching && searchTerm && customers.length === 0 && (
        <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="text-base text-yellow-800">
            {t("checkout.customer_not_found_message")}
          </div>
        </div>
      )}
    </div>
  );
};
