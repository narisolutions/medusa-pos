import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/i18n";
import { ChooserDialog, ChooserTrigger, type ChooserGroup } from "@/components/ui/chooser-dialog";
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

/** The payment provider for one payment method: the till's own first, the web shop's folded away. */
const ProviderPicker: React.FC<Props> = ({ value, onChange, providerIds, usedElsewhere, notInstalled, disabled }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { till, other } = groupProvidersForTill(providerIds);

  const toOptions = (ids: string[]) =>
    ids.map((id) => ({
      value: id,
      label: <span className="font-mono">{id}</span>,
      disabled: id !== value && usedElsewhere.has(id),
      disabledReason: t("settings.store.provider_in_use"),
    }));

  const groups: ChooserGroup[] = [
    { id: "till", title: t("settings.store.provider_group_till"), options: toOptions(till) },
    { id: "other", title: t("settings.store.provider_group_other"), options: toOptions(other), collapsed: true },
  ];

  return (
    <>
      <ChooserTrigger
        mono
        value={value}
        placeholder={t("settings.store.provider_choose")}
        warning={notInstalled}
        disabled={disabled}
        onClick={() => setOpen(true)}
      />
      <ChooserDialog
        open={open}
        onOpenChange={setOpen}
        title={t("settings.store.provider_picker_title")}
        description={t("settings.store.provider_picker_description")}
        groups={groups}
        value={value}
        onSelect={onChange}
        currentLabel={t("settings.store.provider_current")}
        notice={
          notInstalled && value ? (
            <div className="flex min-h-tap-lg items-center justify-between gap-3 rounded-md border border-warning px-4 py-3">
              <span className="break-all font-mono text-base">{value}</span>
              <span className="flex shrink-0 items-center gap-1 text-base text-warning-text">
                <AlertTriangle className="size-5" />
                {t("settings.store.provider_not_installed_short")}
              </span>
            </div>
          ) : undefined
        }
      />
    </>
  );
};

export default ProviderPicker;
