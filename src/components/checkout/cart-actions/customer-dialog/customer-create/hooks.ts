// hooks/useCustomerCreate.ts
import { useState, useCallback } from "react";
import { getSdk } from "@/config/medusa";
import { AdminCustomer } from "@medusajs/types";
import { handleErrorToast } from "@/utils/helpers";
import { Forms } from "@/types/form";

const getMedusaErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as Record<string, unknown>;
  const response = record.response as Record<string, unknown> | undefined;
  const body = record.body as Record<string, unknown> | undefined;
  const data = response?.data as Record<string, unknown> | undefined;

  const candidateValues = [
    data?.message,
    data?.error,
    body?.message,
    body?.error,
    record.message,
    record.error,
    record.detail,
    response?.statusText,
  ];

  for (const value of candidateValues) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const getDuplicateCustomerEmailMessage = (error: unknown): string | null => {
  const message = getMedusaErrorMessage(error);

  if (!message) {
    return null;
  }

  const normalized = message.toLowerCase();
  const status =
    error && typeof error === "object"
      ? (error as { status?: number; response?: { status?: number } }).status ??
        (error as { response?: { status?: number } }).response?.status
      : undefined;

  if (
    status === 400 &&
    normalized.includes("email") &&
    (normalized.includes("exist") ||
      normalized.includes("already") ||
      normalized.includes("duplicate") ||
      normalized.includes("taken"))
  ) {
    return "A customer with this email already exists.";
  }

  return null;
};

export const useCustomerCreate = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<AdminCustomer | null>(null);

  const createCustomer = useCallback(
    async (data: Forms["Customer"]): Promise<AdminCustomer> => {
      setIsCreating(true);

      try {
        const sdk = getSdk();
        const { customer } = await sdk.admin.customer.create(data);
        const created = customer as AdminCustomer;
        
        setCreatedCustomer(created);
        return created;
      } catch (error) {
        console.error("Failed to create customer:", error);
        const duplicateEmailMessage = getDuplicateCustomerEmailMessage(error);

        if (duplicateEmailMessage) {
          handleErrorToast(duplicateEmailMessage);
          throw new Error(duplicateEmailMessage);
        }

        handleErrorToast(
          getMedusaErrorMessage(error) ?? "Failed to create customer"
        );
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  const resetCreation = useCallback(() => {
    setCreatedCustomer(null);
  }, []);

  return {
    isCreating,
    createdCustomer,
    createCustomer,
    resetCreation,
  };
};
