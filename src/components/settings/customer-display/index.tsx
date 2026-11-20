import React, { useEffect, useState } from "react";
import { Loader2, Monitor, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tile } from "@/components/ui/tile";
import { SegmentedControl } from "@/components/ui/segmented-control";
import CustomerDisplayView from "@/components/customer-display/view";
import { loadLocale, useTranslation } from "@/i18n";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { useQueryRegion } from "@/hooks/queries/useQueryRegion";
import { useQueryVatRate } from "@/hooks/queries/useQueryVatRate";
import { getBrandName } from "@/utils/settings/store/metadata";
import type { CustomerDisplayLanguage } from "@/types/preferences";
import { THANKS_SECONDS, previewState, sameMonitor, useCustomerDisplaySettings } from "./hooks";

const T = "settings.customer_display";
const LANGUAGES: CustomerDisplayLanguage[] = ["till", "ka", "en", "ka+en"];

const CustomerDisplaySettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { data: store } = useQueryStore();
  const { data: regionData } = useQueryRegion();
  const currency = regionData?.defaultRegion?.currency_code?.toUpperCase();
  const { data: vatRate } = useQueryVatRate();
  const {
    display,
    monitors,
    isScanning,
    scanMonitors,
    savedConnected,
    chooseMonitor,
    setEnabled,
    setLanguage,
    setShowImages,
    setThanksSeconds,
  } = useCustomerDisplaySettings();

  // The preview draws Georgian even on a till set to English, so load it on demand.
  const [, setLoaded] = useState(0);
  useEffect(() => {
    if (display.language === "ka" || display.language === "ka+en") {
      void loadLocale("ka").then(() => setLoaded((n) => n + 1));
    }
  }, [display.language]);

  const others = monitors.filter((monitor) => !monitor.isTill);

  return (
    <div className="flex flex-col h-full space-y-8">
      <div className="border-b border-theme-border pb-6">
        <p className="text-lg leading-relaxed text-fg-muted font-medium">{t(`${T}.description`)}</p>
      </div>

      <div className="space-y-8 max-w-3xl">
        <div data-setting="customer-display-enabled" className="flex items-center justify-between gap-6">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold text-fg">{t(`${T}.enabled_label`)}</h3>
            <p className="text-base text-fg-muted">{t(`${T}.enabled_hint`)}</p>
          </div>
          <Switch checked={display.enabled} onCheckedChange={setEnabled} aria-label={t(`${T}.enabled_label`)} />
        </div>

        <div data-setting="customer-display-monitor">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-fg">{t(`${T}.monitor_label`)}</h3>
            <Button variant="outline" onClick={() => void scanMonitors()} disabled={isScanning} className="h-11">
              {isScanning ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {t(`${T}.monitor_refresh`)}
            </Button>
          </div>
          {others.length === 0 ? (
            <p className="rounded-lg border border-theme-border bg-surface-muted p-4 text-base text-fg-muted">
              {t(`${T}.monitor_none`)}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {others.map((monitor) => (
                <Tile
                  key={`${monitor.name}-${monitor.x}-${monitor.y}`}
                  icon={<Monitor />}
                  label={monitor.name ?? t(`${T}.monitor_unnamed`)}
                  subline={`${monitor.width}×${monitor.height}`}
                  selected={sameMonitor(display.monitor, monitor)}
                  onClick={() => chooseMonitor(monitor)}
                />
              ))}
            </div>
          )}
          {display.monitor && !savedConnected && (
            <p className="mt-3 text-base text-warning-text">
              {t(`${T}.monitor_missing`, { name: display.monitor.name ?? t(`${T}.monitor_unnamed`) })}
            </p>
          )}
          {display.enabled && !display.monitor && (
            <p className="mt-3 text-base text-warning-text">{t(`${T}.monitor_choose`)}</p>
          )}
        </div>

        <div data-setting="customer-display-language">
          <h3 className="text-base font-semibold text-fg mb-3">{t(`${T}.language_label`)}</h3>
          <SegmentedControl
            label={t(`${T}.language_label`)}
            value={display.language}
            onChange={setLanguage}
            options={LANGUAGES.map((value) => ({ value, label: t(`${T}.language_${value.replace("+", "_")}`) }))}
          />
        </div>

        <div data-setting="customer-display-images" className="flex items-center justify-between gap-6">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold text-fg">{t(`${T}.images_label`)}</h3>
            <p className="text-base text-fg-muted">{t(`${T}.images_hint`)}</p>
          </div>
          <Switch checked={display.showImages} onCheckedChange={setShowImages} aria-label={t(`${T}.images_label`)} />
        </div>

        <div data-setting="customer-display-thanks">
          <h3 className="text-base font-semibold text-fg mb-3">{t(`${T}.thanks_label`)}</h3>
          <SegmentedControl
            label={t(`${T}.thanks_label`)}
            value={String(display.thanksSeconds)}
            onChange={(value) => setThanksSeconds(Number(value))}
            options={THANKS_SECONDS.map((seconds) => ({
              value: String(seconds),
              label: t(`${T}.thanks_seconds`, { count: seconds }),
            }))}
          />
        </div>

        {/* Drawn in the store's own currency, so not before it is known. */}
        {currency && (
          <div className="border-t border-theme-border pt-6">
            <h3 className="text-base font-semibold text-fg mb-3">{t(`${T}.preview_label`)}</h3>
            <CustomerDisplayView state={previewState(display, i18n.language, getBrandName(store), currency, vatRate)} preview />
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDisplaySettings;
