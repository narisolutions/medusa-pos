import React, { useState } from "react";
import { CheckCircle2, ScanBarcode } from "lucide-react";
import { useWedgeScanner } from "@/hooks/barcode/useWedgeScanner";
import { playSound } from "@/utils/sounds";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

type LastScan = { code: string; at: Date; count: number };

/** A keyboard scanner's check: scan anything on this page and the code shows large. */
const WedgeTest: React.FC = () => {
  const { t } = useTranslation();
  const [last, setLast] = useState<LastScan | null>(null);

  useWedgeScanner({
    onScan: (code) => {
      playSound("scan");
      setLast((prev) => ({ code, at: new Date(), count: (prev?.count ?? 0) + 1 }));
    },
  });

  return (
    <div className="border-t border-theme-border pt-6">
      <h3 className="text-base font-semibold text-fg mb-1">{t("settings.scanner.test_label")}</h3>
      <p className="text-base text-fg-muted mb-3">{t("settings.scanner.wedge_test_hint")}</p>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex min-h-32 items-center gap-4 rounded-lg border-2 p-6",
          last ? "border-success bg-success-subtle" : "border-dashed border-theme-border bg-surface-muted"
        )}
      >
        {last ? (
          <>
            <CheckCircle2 aria-hidden className="size-10 shrink-0 text-success-text" />
            <div className="min-w-0">
              <div className="break-all font-mono text-3xl font-bold text-fg">{last.code}</div>
              <div className="text-base text-fg-muted">
                {t("settings.scanner.wedge_test_read", { count: last.count, time: last.at.toLocaleTimeString() })}
              </div>
            </div>
          </>
        ) : (
          <>
            <ScanBarcode aria-hidden className="size-10 shrink-0 text-fg-subtle" />
            <p className="text-lg text-fg-muted">{t("settings.scanner.test_waiting")}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default WedgeTest;
