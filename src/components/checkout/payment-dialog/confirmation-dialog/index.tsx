import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/helpers";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  total: number;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  isProcessing,
  total,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-2xl font-semibold text-gray-900 text-center">
          Confirm Payment
        </DialogTitle>
        
        <div className="space-y-6 py-4">
          <p className="text-lg text-gray-700 text-center">
            Please confirm that the payment on the terminal was successful.
          </p>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-center text-blue-800 font-medium">
              Amount: <span className="text-2xl font-bold">{formatPrice(total)}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-14 text-lg font-medium"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 h-14 text-lg font-medium bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? "Processing..." : "Payment Successful"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
