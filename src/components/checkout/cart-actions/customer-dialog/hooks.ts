import { useState, useCallback } from "react";
import { getSdk } from "@/config/medusa";
import { AdminCustomer } from "@medusajs/types";
import { handleErrorToast } from "@/utils/helpers";

export const useCustomerDialog = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchCustomer = useCallback(async (searchEmail: string) => {
    setIsLoading(true);
    setCustomer(null);
    setHasSearched(true);

    try {
      const sdk = getSdk();

      // Fetch customers list and filter by email
      const { customers } = await sdk.admin.customer.list({
        email: searchEmail,
        limit: 1,
      });

      if (customers && customers.length > 0) {
        const foundCustomer = customers[0] as AdminCustomer;

        if (
          foundCustomer.email?.toLowerCase() === searchEmail.toLowerCase()
        ) {
          setCustomer(foundCustomer);
        } else {
          handleErrorToast("No customer found with this email");
          setCustomer(null);
        }
      } else {
        handleErrorToast("No registered customer found with this email");
        setCustomer(null);
      }
    } catch (error) {
      console.error("Failed to search customer:", error);
      handleErrorToast(
        error instanceof Error
          ? error.message
          : "Failed to search for customer"
      );
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCustomer = useCallback(() => {
    setCustomer(null);
    setHasSearched(false);
  }, []);

  const resetSearch = useCallback(() => {
    setHasSearched(false);
  }, []);

  return {
    email,
    setEmail,
    isLoading,
    customer,
    hasSearched,
    searchCustomer,
    clearCustomer,
    resetSearch,
  };
};

