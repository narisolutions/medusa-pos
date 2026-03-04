import React from "react";
import { useCheckout } from "../hooks";

const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
};

const handleButtonClick = (
  e: React.MouseEvent<HTMLButtonElement>,
  action: () => void
) => {
  e.preventDefault();
  action();
};

const useCartItems = () => {
  const {
    items,
    draftOrderId,
    loading,
    handleQuantityChange,
    handleRemoveItem,
    selectedItemId,
    setSelectedItemId,
  } = useCheckout();

  return {
    items,
    draftOrderId,
    loading,
    handleQuantityChange,
    handleRemoveItem,
    handleMouseDown,
    handleButtonClick,
    selectedItemId,
    setSelectedItemId,
  };
};

export { useCartItems };
