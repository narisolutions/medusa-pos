import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/context/cart";
import { useTranslation } from "@/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

/** Asked every time: a stray tap on Log out otherwise costs a sign-in mid-shift. */
const LogoutDialog: React.FC<Props> = ({ open, onOpenChange, onConfirm }) => {
  const { t } = useTranslation();
  const hasSale = useCartStore((state) => state.items.length > 0);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-surface-subtle">
            <LogOut className="size-7 text-fg-muted" aria-hidden />
          </div>
          <DialogTitle className="pr-0 text-2xl">{t("nav.logout_confirm_title")}</DialogTitle>
          <DialogDescription className="text-base">
            {hasSale ? t("nav.logout_confirm_sale") : t("nav.logout_confirm_message")}
          </DialogDescription>
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <Button size="xl" loading={busy} onClick={() => void confirm()}>
            {t("nav.logout")}
          </Button>
          <Button size="xl" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutDialog;
