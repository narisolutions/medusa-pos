import { useState, useCallback } from "react";
import { useStoreManager } from "@/context/store-manager";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import storage from "@/utils/storage";

interface Props {
  onRetry: () => void;
}

const BootEscapeOverlay = ({ onRetry }: Props) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex flex-col items-center gap-6 rounded-lg bg-background p-8 shadow-lg max-w-sm text-center">
        <LoadingSpinner size={32} className="text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Having trouble connecting?</p>
          <p className="text-xs text-muted-foreground">
            The backend may be unreachable. You can retry or switch to a different store.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
          <Button size="sm" onClick={handleSwitchStore} disabled={switching}>
            Switch Store
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BootEscapeOverlay;
