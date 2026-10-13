import React from "react";
import type { PaperWidth } from "@narisolutions/pos-toolkit/receipt-builder";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ReceiptPreview from "@/components/base/receipt-preview";
import { useTranslation } from "@/i18n";

type Preview = { text: string; paperWidth: PaperWidth; logoSrc: string | null; companyName: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Built when opened, so it reflects the current printer, paper and branding. */
  preview: Preview | null;
  /** Explains what the preview is not yet, e.g. that the order number comes at payment. */
  note?: React.ReactNode;
  /** Print / PDF and the like; Close is always there. */
  actions?: React.ReactNode;
}

/** The receipt as the default printer would print it, before any paper moves. */
const ReceiptPreviewDialog: React.FC<Props> = ({ open, onOpenChange, preview, note, actions }) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("receipt.preview_title")}</DialogTitle>
          <DialogDescription className="text-base">{note ?? t("receipt.preview_description")}</DialogDescription>
        </DialogHeader>
        {preview && <ReceiptPreview {...preview} />}
        <DialogFooter sticky className="gap-3">
          <Button variant="outline" size="lg" className="px-8" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
          {actions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptPreviewDialog;
export type { Preview as ReceiptPreviewData };
