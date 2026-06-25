import React, { useState } from "react";
import { Lock } from "lucide-react";
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
import { useTranslation } from "@/i18n";

type Props = {
  /** Verify the entered PIN and unlock on success. */
  onUnlock: (pin: string) => Promise<boolean>;
};

/**
 * Banner shown when the register settings are locked behind the manager PIN.
 * Tapping "Unlock" prompts for the PIN; a correct PIN unlocks the section for the
 * current Settings visit. See src/docs/cash-reconciliation/07-security-manager-pin.md.
 */
const RegisterLock: React.FC<Props> = ({ onUnlock }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      const ok = await onUnlock(pin);
      if (!ok) {
        setError(true);
        return;
      }
      setOpen(false);
      setPin("");
      setError(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-theme-border bg-(--color-bg-base) px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Lock className="size-5 text-fg-muted shrink-0" />
        <p className="text-sm text-fg-muted">
          {t("settings.preferences.register.locked_notice")}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        {t("settings.preferences.register.unlock")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {t("settings.preferences.register.unlock_title")}
            </DialogTitle>
            <DialogDescription>
              {t("settings.preferences.register.unlock_description")}
            </DialogDescription>
          </DialogHeader>

          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pin && !busy) handleSubmit();
            }}
          />
          {error && (
            <p className="text-sm text-red-500">
              {t("settings.preferences.register.unlock_failed")}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              disabled={busy || !pin}
              className="text-white bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
            >
              {t("settings.preferences.register.unlock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegisterLock;
