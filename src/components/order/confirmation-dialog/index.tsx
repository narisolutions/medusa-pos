import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package } from "lucide-react";

interface PickupConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  orderDisplayId: number;
}

const PickupConfirmationDialog: React.FC<PickupConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  orderDisplayId,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-md" preventOutsideClose={isProcessing}>
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          
          <DialogTitle className="text-2xl font-bold text-fg">
            Confirm Pickup
          </DialogTitle>

          <div className="space-y-3 py-4">
            <p className="text-base text-fg-muted">
              Are you sure the customer has picked up order <span className="font-semibold">#{orderDisplayId}</span>?
            </p>
            <p className="text-sm text-fg-muted">
              This action will mark the order as delivered and cannot be undone.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-4 pt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 h-16 text-lg font-semibold touch-manipulation"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 h-16 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white touch-manipulation"
          >
            <CheckCircle className="w-6 h-6 mr-2" />
            {isProcessing ? "Marking..." : "Confirm Pickup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PickupConfirmationDialog;

