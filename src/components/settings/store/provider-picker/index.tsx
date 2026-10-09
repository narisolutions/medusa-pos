import React, { useState } from "react";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { groupProvidersForTill } from "@/utils/pos/payment";

type Props = {
  value: string;
  onChange: (id: string) => void;
  /** Installed, enabled provider ids from the backend. */
  providerIds: string[];
  /** Ids other payment-method rows already use. */
  usedElsewhere: Set<string>;
  /** The saved id is one the backend doesn't have. */
  notInstalled: boolean;
  disabled?: boolean;
};

/** A touch chooser for the payment provider: large full-width rows instead of a narrow dropdown. */
const ProviderPicker: React.FC<Props> = ({ value, onChange, providerIds, usedElsewhere, notInstalled, disabled }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { till, other } = groupProvidersForTill(providerIds);
  // A saved id in the "other" group opens with that group shown, so the current choice is visible.
  const [showOther, setShowOther] = useState(false);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const openPicker = () => {
    setShowOther(other.includes(value));
    setOpen(true);
  };

  const row = (id: string) => {
    const current = id === value;
    const inUse = !current && usedElsewhere.has(id);
    return (
      <Button
        key={id}
        type="button"
        variant={current ? "default" : "outline"}
        aria-pressed={current}
        disabled={inUse}
        className="h-auto min-h-14 w-full justify-between gap-3 whitespace-normal text-left font-mono text-base"
        onClick={() => choose(id)}
      >
        <span className="break-all">{id}</span>
        <span className="flex shrink-0 items-center gap-1 font-sans">
          {current && (
            <>
              <Check className="size-5" />
              {t("settings.store.provider_current")}
            </>
          )}
          {inUse && t("settings.store.provider_in_use")}
        </span>
      </Button>
    );
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className={`flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-left font-mono text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50 ${
          notInstalled ? "border-yellow-500" : "border-input"
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${value ? "" : "font-sans text-fg-subtle"}`}>
          {value || t("settings.store.provider_choose")}
        </span>
        {notInstalled && <AlertTriangle className="size-4 shrink-0 text-yellow-500" />}
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("settings.store.provider_picker_title")}</DialogTitle>
            <DialogDescription>{t("settings.store.provider_picker_description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {notInstalled && value && (
              <div className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-yellow-500 px-4 py-3">
                <span className="break-all font-mono text-base">{value}</span>
                <span className="flex shrink-0 items-center gap-1 text-base text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="size-5" />
                  {t("settings.store.provider_not_installed_short")}
                </span>
              </div>
            )}
            <p className="text-base font-semibold">{t("settings.store.provider_group_till")}</p>
            {till.map(row)}
            {other.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 justify-start text-base"
                  aria-expanded={showOther}
                  onClick={() => setShowOther((shown) => !shown)}
                >
                  <ChevronDown className={`mr-2 size-5 transition-transform ${showOther ? "rotate-180" : ""}`} />
                  {showOther
                    ? t("settings.store.provider_hide_other")
                    : t("settings.store.provider_show_other", { count: other.length })}
                </Button>
                {showOther && (
                  <>
                    <p className="text-base font-semibold">{t("settings.store.provider_group_other")}</p>
                    {other.map(row)}
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-12 text-base" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProviderPicker;
