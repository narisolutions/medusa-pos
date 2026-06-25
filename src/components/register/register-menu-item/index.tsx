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
import { Input } from "@/components/ui/input";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { useRegister } from "@/context/register";
import { verifyPin } from "@/utils/pos/register";
import { useTranslation } from "@/i18n";
import CashMovementDialog from "../cash-movement-dialog";
import CloseRegisterDialog from "../close-register-dialog";

const RegisterMenuItem: React.FC = () => {
  const { t } = useTranslation();
  const {
    enabled,
    isOpen,
    canReopen,
    requirePinToClose,
    managerPinHash,
    reopenRegister,
  } = useRegister();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenPin, setReopenPin] = useState("");
  const [reopenError, setReopenError] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);

  if (!enabled) return null;

  // Reopen is a manager-authority undo, so it reuses the close PIN gate.
  const reopenPinRequired = requirePinToClose && !!managerPinHash;

  const handleReopen = async () => {
    setReopenBusy(true);
    try {
      if (reopenPinRequired) {
        const ok = reopenPin
          ? await verifyPin(reopenPin, managerPinHash as string)
          : false;
        if (!ok) {
          setReopenError(true);
          return;
        }
      }
      await reopenRegister();
      setReopenOpen(false);
      setReopenPin("");
      setReopenError(false);
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
        className="flex flex-col h-auto items-center justify-center gap-1 px-2 py-3 w-full text-center rounded-md disabled:opacity-100"
      >
        <div className="relative">
          <Wallet className="size-8 text-fg-muted" />
          <span
            className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-(--color-bg-base) ${
              isOpen
                ? "bg-green-500"
                : canReopen
                  ? "bg-amber-500"
                  : "bg-fg-subtle"
            }`}
          />
        </div>
        <span className="block w-full text-sm font-medium text-fg-muted leading-tight text-center truncate">
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
              className="h-14 justify-start gap-3 text-base text-white bg-primary hover:bg-primary/90"
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
        onOpenChange={(o) => {
          setReopenOpen(o);
          if (!o) {
            setReopenPin("");
            setReopenError(false);
          }
        }}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("register.reopen.title")}</DialogTitle>
            <DialogDescription>
              {t("register.reopen.description")}
            </DialogDescription>
          </DialogHeader>

          {reopenPinRequired && (
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={reopenPin}
              onChange={(e) => {
                setReopenPin(e.target.value.replace(/\D/g, ""));
                setReopenError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && reopenPin && !reopenBusy) handleReopen();
              }}
              className="h-11 text-base"
            />
          )}
          {reopenError && (
            <p className="text-sm text-red-500">
              {t("register.reopen.pin_invalid")}
            </p>
          )}

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
              disabled={reopenBusy || (reopenPinRequired && !reopenPin)}
              className="text-white bg-primary hover:bg-primary/90"
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
