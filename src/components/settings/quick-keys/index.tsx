import React from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/state-panel";
import ProductPicker from "@/components/base/product-picker";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { MAX_QUICK_KEYS } from "@/utils/settings/store/metadata";
import { quickKeyLabel, resolveQuickKeys } from "@/utils/pos/quick-keys";
import { useTranslation } from "@/i18n";
import SaveBar from "../save-bar";
import { useQuickKeysSettings } from "./hooks";

/** The store's quick keys: add by search or scan, name, order, remove. Shared by every till. */
const QuickKeysSettings: React.FC = () => {
  const { t } = useTranslation();
  const { keys, products, isLoading, isSaving, isDirty, handleAdd, setLabel, move, remove, discard, save } =
    useQuickKeysSettings();
  const { data: regionData } = useQueryRegion();
  const currency = regionData?.defaultRegion?.currency_code?.toUpperCase() ?? "USD";
  const resolved = new Map(resolveQuickKeys(keys, products).map((r) => [r.key.variant_id, r.variant]));

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="border-b border-theme-border pb-6">
        <p className="text-lg leading-relaxed text-fg-muted font-medium">
          {t("settings.quick_keys.description", { count: MAX_QUICK_KEYS })}
        </p>
      </div>

      {/* Outside the form: the picker's own Add button and Enter must not submit it. */}
      {keys.length < MAX_QUICK_KEYS && (
        <div className="max-w-3xl">
          <ProductPicker products={products} currency={currency} onSelect={handleAdd} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-5 max-w-3xl"
      >

        {keys.length === 0 ? (
          <EmptyState icon={<Zap />} title={t("settings.quick_keys.empty")} hint={t("settings.quick_keys.add_hint")} />
        ) : (
          <ol className="space-y-3">
            {keys.map((key, index) => {
              const variant = resolved.get(key.variant_id);
              return (
                <li key={key.variant_id} className="flex items-center gap-3 rounded-lg border border-theme-border bg-surface p-3">
                  <span className="w-8 shrink-0 text-center text-lg font-semibold tabular-nums text-fg-muted">{index + 1}</span>
                  <div className="min-w-0 flex-1 space-y-2">
                    {variant ? (
                      <p className="truncate text-base font-medium text-fg">{quickKeyLabel({ variant_id: key.variant_id }, variant)}</p>
                    ) : (
                      <p className="flex items-center gap-2 text-base text-warning-text">
                        <AlertTriangle className="size-5 shrink-0" />
                        {t("settings.quick_keys.unavailable")}
                      </p>
                    )}
                    <Input
                      value={key.label ?? ""}
                      onChange={(e) => setLabel(index, e.target.value)}
                      placeholder={t("settings.quick_keys.name_placeholder")}
                      aria-label={t("settings.quick_keys.name_label")}
                      maxLength={24}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="icon" disabled={index === 0 || isSaving} onClick={() => move(index, -1)} aria-label={t("settings.quick_keys.move_up")}>
                      <ArrowUp className="size-5" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" disabled={index === keys.length - 1 || isSaving} onClick={() => move(index, 1)} aria-label={t("settings.quick_keys.move_down")}>
                      <ArrowDown className="size-5" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="text-danger-text" disabled={isSaving} onClick={() => remove(index)} aria-label={t("common.remove")}>
                      <Trash2 className="size-5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <SaveBar
          dirty={isDirty}
          saving={isSaving}
          disabled={isLoading}
          onDiscard={discard}
          saveLabel={t("common.save")}
          savingLabel={t("settings.store.saving")}
        />
      </form>
    </div>
  );
};

export default QuickKeysSettings;
