import { useState } from "react";
import constants from "@/utils/constants";

/**
 * The cash a customer hands over: typed, keyed on the numpad or counted in
 * notes, and the change it leaves. Shared by checkout and Record payment, so a
 * pay-later order takes cash the way a sale does.
 */
export const useCashTender = (total: number, isCashType: boolean) => {
  const [customerPaid, setCustomerPaid] = useState<string>("");
  const [billCounts, setBillCounts] = useState<Record<number, number>>({});

  const handleCashValueChange = (value: string) => {
    setCustomerPaid(value);
    // Reset bill counts when manually entering a value
    if (value === "" || value === "0") {
      setBillCounts({});
    }
  };

  const handleQuickAmount = (amount: number, remove: boolean = false) => {
    if (remove) {
      // Remove one bill of this amount
      setCustomerPaid((prev) => {
        const currentPaid = parseFloat(prev) || 0;
        return Math.max(0, currentPaid - amount).toString();
      });

      setBillCounts((prev) => {
        const currentCount = prev[amount] || 0;
        if (currentCount > 0) {
          const newCount = currentCount - 1;
          if (newCount <= 0) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [amount]: _, ...rest } = prev;
            return rest;
          }
          return { ...prev, [amount]: newCount };
        }
        return prev;
      });
    } else {
      // Add the amount to the current total
      setCustomerPaid((prev) => {
        const currentPaid = parseFloat(prev) || 0;
        return (currentPaid + amount).toString();
      });

      // Update bill count
      setBillCounts((prev) => ({
        ...prev,
        [amount]: (prev[amount] || 0) + 1,
      }));
    }
  };

  const handleClearBillCounts = () => {
    setBillCounts({});
    setCustomerPaid("");
  };

  const handleExactAmount = () => {
    setCustomerPaid(total.toString());
    setBillCounts({});
  };

  const change =
    isCashType && customerPaid
      ? (parseFloat(customerPaid) || 0) - total
      : 0;

  const canProcessPayment =
    isCashType
      ? (parseFloat(customerPaid) || 0) >= total
      : true;

  const resetCashState = () => {
    setCustomerPaid("");
    setBillCounts({});
  };

  return {
    customerPaid,
    change,
    canProcessPayment,
    handleCashValueChange,
    handleQuickAmount,
    handleClearBillCounts,
    handleExactAmount,
    resetCashState,
    billCounts,
    quickAmounts: constants.QUICK_CASH_AMOUNTS,
  };
};

export type CashTender = ReturnType<typeof useCashTender>;
