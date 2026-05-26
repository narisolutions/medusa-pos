// hooks/useCustomerSearch.ts
import { useState, useCallback } from "react";
import { getSdk } from "@/config/medusa";
import { AdminCustomer } from "@medusajs/types";
import { handleErrorToast } from "@/utils/helpers";

export const useCustomerSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchCustomers = useCallback(async (term: string) => {
    if (!term.trim()) {
      return;
    }

    setIsSearching(true);
    setCustomers([]);
    setSelectedCustomer(null);
    setHasSearched(true);

    try {
      const sdk = getSdk();

      const { customers: results } = await sdk.admin.customer.list({
        q: term,
        limit: 10,
      });

      const normalized = (results || []) as AdminCustomer[];
      setCustomers(normalized);
    } catch (error) {
      console.error("Failed to search customers:", error);
      handleErrorToast(
        error instanceof Error ? error.message : "Failed to search for customer"
      );
      setCustomers([]);
      setSelectedCustomer(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setCustomers([]);
    setHasSearched(false);
  }, []);

  const resetSearch = useCallback(() => {
    setSearchTerm("");
    setCustomers([]);
    setSelectedCustomer(null);
    setHasSearched(false);
  }, []);

  return {
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
  };
};
