import React, { useState } from "react";
import { Wallet, ArrowDownUp, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { useRegister } from "@/context/register";
import { useTranslation } from "@/i18n";
import CashMovementDialog from "../cash-movement-dialog";
import CloseRegisterDialog from "../close-register-dialog";

const RegisterMenuItem: React.FC = () => {
  const { t } = useTranslation();
  const {
    enabled,
    isOpen,
    canReopen,
    reopenRegister,
  } = useRegister();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);

  if (!enabled) return null;

  const handleReopen = async () => {
    setReopenBusy(true);
    try {
      await reopenRegister();
      setReopenOpen(false);
    } finally {
      setReopenBusy(false);
    }
  };

  return (
    <SidebarMenuItem>
      <Button
        variant="ghost"
        disabled={!isOpen && !canReopen}
        onClick={() => (isOpen ? setChooserOpen(true) : setReopenOpen(true))}
        className="flex flex-col h-auto min-h-tap-xl items-center justify-center gap-1 px-2 py-3 w-full text-center rounded-md disabled:opacity-100"
      >
        <div className="relative">
          <Wallet className="size-8 text-fg-muted" />
          <span
            className={`absolute -top-1 -right-1 size-3.5 rounded-full ring-2 ring-(--color-bg-base) ${
              isOpen
                ? "bg-success"
                : canReopen
                  ? "bg-warning"
                  : "bg-fg-subtle"
            }`}
          />
        </div>
        <span className="block w-full text-base font-medium text-fg-muted leading-tight text-center whitespace-normal break-words">
          {canReopen
            ? t("register.status.reopen")
            : t("register.status.label")}
        </span>
      </Button>

      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("register.status.open")}</DialogTitle>
            <DialogDescription>
              {t("register.status.actions_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-14 justify-start gap-3 text-base"
              onClick={() => {
                setChooserOpen(false);
                setMovementOpen(true);
              }}
            >
              <ArrowDownUp className="size-5" />
              {t("register.status.movement")}
            </Button>
            <Button
              type="button"
              className="h-14 justify-start gap-3 text-base"
              onClick={() => {
                setChooserOpen(false);
                setCloseOpen(true);
              }}
            >
              <Lock className="size-5" />
              {t("register.status.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("register.reopen.title")}</DialogTitle>
            <DialogDescription>
              {t("register.reopen.description")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={reopenBusy}
              onClick={() => setReopenOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              loading={reopenBusy}
              onClick={handleReopen}
            >
              {t("register.reopen.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CashMovementDialog open={movementOpen} onOpenChange={setMovementOpen} />
      <CloseRegisterDialog open={closeOpen} onOpenChange={setCloseOpen} />
    </SidebarMenuItem>
  );
};

export default RegisterMenuItem;
