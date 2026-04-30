import { useState, useCallback } from "react";
import { getSdk } from "@/config/medusa";
import { AdminCustomer } from "@medusajs/types";
import { handleErrorToast } from "@/utils/helpers";

export const useCustomerDialog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<AdminCustomer | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchCustomers = useCallback(async (term: string) => {
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

      if (normalized.length === 1) {
        setSelectedCustomer(normalized[0]);
      }
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

  const createCustomer = useCallback(
    async (payload: {
      email: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
      company_name?: string;
    }): Promise<AdminCustomer> => {
      setIsCreating(true);

      try {
        const sdk = getSdk();
        const { customer } = await sdk.admin.customer.create(payload);
        const created = customer as AdminCustomer;

        setCustomers((prev) => {
          const withoutCreated = prev.filter((c) => c.id !== created.id);
          return [created, ...withoutCreated];
        });
        setSelectedCustomer(created);
        setHasSearched(true);

        return created;
      } catch (error) {
        console.error("Failed to create customer:", error);
        handleErrorToast(
          error instanceof Error ? error.message : "Failed to create customer"
        );
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  const clearCustomer = useCallback(() => {
    setCustomers([]);
    setSelectedCustomer(null);
    setHasSearched(false);
  }, []);

  const resetSearch = useCallback(() => {
    setHasSearched(false);
    setCustomers([]);
    setSelectedCustomer(null);
  }, []);

  return {
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
    resetSearch,
  };
};

