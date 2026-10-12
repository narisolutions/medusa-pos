import React, { Fragment, useState } from "react";
import { useChange } from "@/hooks/utils/useChange";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useCheckout } from "../../hooks";
import { useCartStore } from "@/context/cart";
import { useTranslation } from "@/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

const CommentModal: React.FC<Props> = ({ open, onClose }) => {
  const selectedItemId = useCartStore((state) => state.selectedItemId);
  const setItemMetadata = useCartStore((state) => state.setItemMetadata);
  const pendingItemComment = useCartStore((state) => state.pendingItemComment);
  const setPendingItemComment = useCartStore((state) => state.setPendingItemComment);
  const { items, orderComment, setOrderComment } = useCheckout();
  const { t } = useTranslation();
  const [scope, setScope] = useState<"order" | "item">("order");
  const [pendingCommentInput, setPendingCommentInput] = useState<string>("");

  const currentItem = items.find((i) => i.variant_id === selectedItemId);
  const currentItemComment = (currentItem?.metadata?.comment as string) || "";

  useChange(`${open}|${selectedItemId ?? ""}`, () => {
    if (open && !selectedItemId) setPendingCommentInput(pendingItemComment || "");
  });

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setScope("order");
    }
  };

  const onApply = () => {
    if (scope === "item" && !selectedItemId) {
      setPendingItemComment(pendingCommentInput || null);
    }
    onClose();
    setScope("order");
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-xl p-6 md:p-8">
        <DialogTitle className="text-2xl font-semibold">{t("checkout.comment_dialog_title")}</DialogTitle>
        <div className="space-y-6">
          <SegmentedControl
            label={t("checkout.comment_dialog_title")}
            className="w-full"
            value={scope}
            onChange={setScope}
            options={[
              { value: "order", label: t("checkout.comment_scope_order") },
              { value: "item", label: t("checkout.comment_scope_item") },
            ]}
          />

          {scope === "order" ? (
            <div className="space-y-3">
              <label className="text-base font-medium text-fg">
                {t("checkout.comment_for_order_label")}
              </label>
              <textarea
                rows={6}
                value={orderComment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setOrderComment(e.target.value)
                }
                className="w-full rounded-lg border border-theme-border bg-transparent p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {selectedItemId ? (
                <Fragment>
                  <label className="text-base font-medium text-fg">
                    {t("checkout.comment_for_item_label")}<b>{currentItem?.title}</b>
                  </label>
                  <textarea
                    rows={6}
                    value={currentItemComment}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setItemMetadata(selectedItemId, {
                        comment: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-theme-border bg-transparent p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </Fragment>
              ) : (
                <Fragment>
                  <label className="text-base font-medium text-fg">
                    {t("checkout.comment_next_item_label")}
                  </label>
                  <textarea
                    rows={6}
                    value={pendingCommentInput}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setPendingCommentInput(e.target.value)
                    }
                    className="w-full rounded-lg border border-theme-border bg-transparent p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </Fragment>
              )}
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" size="lg" onClick={onClose} className="px-6">
              {t("common.cancel")}
            </Button>
            <Button size="lg" onClick={onApply} className="px-8">
              {t("common.apply")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentModal;
