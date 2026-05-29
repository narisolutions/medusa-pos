import { useState } from "react";
import { useChange } from "@/hooks/utils/useChange";
import { useNavigate, useLocation } from "react-router-dom";
import { useSalesChannel } from "@/context/sales-channel";
import { useUser } from "@/context/user";
import storage from "@/utils/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SalesChannelWarningDialog: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const needsWarning = useSalesChannel((s) => s.needsWarning);
  const setNeedsWarning = useSalesChannel((s) => s.setNeedsWarning);
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);
  const isAuthenticated = useUser((s) => s.isAuthenticated);

  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal on navigation so each checkout visit re-evaluates.
  useChange(pathname, () => setDismissed(false));

  const isCheckoutPage = pathname.startsWith("/checkout");
  const open = isAuthenticated && !dismissed && (needsWarning || (!salesChannelId && isCheckoutPage));

  const handleGoToSettings = async () => {
    setNeedsWarning(false);
    await storage.setItem("settings_tab", "connection");
    navigate("/settings");
  };

  const handleContinueAnyway = () => {
    setNeedsWarning(false);
    setDismissed(true);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl">Sales Channel Required</DialogTitle>
          <DialogDescription className="text-base mt-1">
            A sales channel must be configured before you can add products to
            cart. Please go to Settings → API Settings to configure your sales
            channel.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={handleContinueAnyway}>
            Continue Anyway
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={handleGoToSettings}
          >
            Go to Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SalesChannelWarningDialog;
