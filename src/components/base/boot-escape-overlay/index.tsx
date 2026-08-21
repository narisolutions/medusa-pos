import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStoreManager } from "@/context/store-manager";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import storage from "@/utils/storage";

interface Props {
  message?: string;
  onRetry: () => void;
}

const BootEscapeOverlay = ({ message, onRetry }: Props) => {
  const { t } = useTranslation();
  const [switching, setSwitching] = useState(false);

  const handleSwitchStore = useCallback(async () => {
    setSwitching(true);
    try {
      await storage.removeItem("active_store_id");
      useStoreManager.setState({ activeStoreId: null, activeStore: null });
      window.location.reload();
    } finally {
      setSwitching(false);
    }
  }, []);

  return (
    <div className="fixed top-0 left-0 z-50 w-full h-full bg-black/20 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <img src="/logo.svg" alt="Medusa POS" className="h-28 w-auto object-contain" />
        <LoadingSpinner size={28} />
        {message && <p className="text-xs text-zinc-500 tracking-wide">{message}</p>}
        <div className="space-y-1 pt-4">
          <p className="text-base font-medium">{t("errors.boot_slow_title")}</p>
          <p className="text-base text-muted-foreground">{t("errors.boot_slow_message")}</p>
        </div>
        <div className="flex w-full flex-col gap-3 pt-2">
          <Button size="lg" variant="outline" onClick={onRetry}>
            {t("common.retry")}
          </Button>
          <Button size="lg" variant="ghost" onClick={handleSwitchStore} disabled={switching}>
            {t("common.switch_store")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BootEscapeOverlay;
