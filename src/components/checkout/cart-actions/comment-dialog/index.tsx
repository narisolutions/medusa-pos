import React, { Fragment, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCheckout } from "../../hooks";
import { useCartStore } from "@/context/cart";

type Props = {
  open: boolean;
  onClose: () => void;
};

const CommentModal: React.FC<Props> = ({ open, onClose }) => {
  const { selectedItemId, setItemMetadata } = useCartStore();
  const { items, orderComment, setOrderComment } = useCheckout();
  const [scope, setScope] = useState<"order" | "item">("order");

  const currentItem = items.find((i) => i.variant_id === selectedItemId);
  const currentItemComment = (currentItem?.metadata?.comment as string) || "";

  const handleScopeChange = (value: string) => {
    setScope(value === "item" ? "item" : "order");
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setScope("order");
    }
  };

  const onApply = () => {
    onClose();
    setScope("order");
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-xl p-6 md:p-8">
        <DialogTitle className="text-2xl font-semibold">Comment</DialogTitle>
        <div className="space-y-6">
          <Tabs value={scope} onValueChange={handleScopeChange}>
            <TabsList>
              <TabsTrigger value="order">Order</TabsTrigger>
              <TabsTrigger value="item">Item</TabsTrigger>
            </TabsList>
          </Tabs>

          {scope === "order" ? (
            <div className="space-y-3">
              <label className="text-base font-medium text-fg">
                Add comment for order
              </label>
              <textarea
                rows={6}
                value={orderComment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setOrderComment(e.target.value)
                }
                className="w-full rounded-lg border border-theme-border p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {selectedItemId ? (
                <Fragment>
                  <label className="text-base font-medium text-fg">
                    Add comment for item: <b>{currentItem?.title}</b>
                  </label>
                  <textarea
                    rows={6}
                    value={currentItemComment}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setItemMetadata(selectedItemId, {
                        comment: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-theme-border p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </Fragment>
              ) : (
                <div className="flex h-[180px] w-full items-center justify-center rounded-lg border border-theme-border bg-surface-muted text-base text-fg-muted">
                  Please select an item to add a comment.
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12 px-5 text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={onApply}
              className="h-12 px-6 text-base bg-primary hover:bg-primary/90 text-white"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentModal;
