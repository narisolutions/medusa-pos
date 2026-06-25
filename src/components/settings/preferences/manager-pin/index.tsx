import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";

type Props = {
  hasPin: boolean;
  /** When the register section is locked, set/change/clear are disabled. */
  locked?: boolean;
  onSet: (rawPin: string) => Promise<void>;
  onClear: () => Promise<void>;
};

/**
 * Set / change / clear the manager PIN. The raw PIN never leaves this component —
 * it is hashed by the parent before storage. See
 * src/docs/cash-reconciliation/07-security-manager-pin.md.
 */
const ManagerPin: React.FC<Props> = ({ hasPin, locked = false, onSet, onClear }) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setPin("");
    setConfirm("");
    setEditing(false);
  };

  const handleSave = async () => {
    if (pin.length < 4) {
      toast.error(t("settings.preferences.register.pin_too_short"));
      return;
    }
    if (pin !== confirm) {
      toast.error(t("settings.preferences.register.pin_mismatch"));
      return;
    }
    setBusy(true);
    try {
      await onSet(pin);
      toast.success(t("settings.preferences.register.pin_saved"));
      reset();
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await onClear();
      toast.success(t("settings.preferences.register.pin_cleared"));
      reset();
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-base font-medium text-fg">
            {t("settings.preferences.register.manager_pin")}
          </p>
          <p className="text-sm text-fg-muted">
            {hasPin
              ? t("settings.preferences.register.pin_set")
              : t("settings.preferences.register.pin_not_set")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={locked}
            onClick={() => setEditing(true)}
          >
            {hasPin
              ? t("settings.preferences.register.change_pin")
              : t("settings.preferences.register.set_pin")}
          </Button>
          {hasPin && (
            <Button
              type="button"
              variant="outline"
              disabled={busy || locked}
              onClick={handleClear}
            >
              {t("settings.preferences.register.clear_pin")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-base font-medium text-fg">
        {t("settings.preferences.register.manager_pin")}
      </p>
      <div className="flex flex-col gap-2 max-w-xs">
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t("settings.preferences.register.new_pin")}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="h-11 text-base"
        />
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t("settings.preferences.register.confirm_pin")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          className="h-11 text-base"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy}
          className="text-white bg-primary hover:bg-primary/90"
          onClick={handleSave}
        >
          {t("settings.preferences.register.save_pin")}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={reset}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
};

export default ManagerPin;
