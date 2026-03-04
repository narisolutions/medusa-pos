import { useState } from "react";
import { Printer } from "../hooks";

const usePrinterModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);

  const openModal = (printer?: Printer) => {
    setEditingPrinter(printer || null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditingPrinter(null);
  };

  return {
    isOpen,
    editingPrinter,
    openModal,
    closeModal,
  };
};

export { usePrinterModal };