import { useState } from "react";
import { useChange } from "@/hooks/utils/useChange";
import { useNavigate, useLocation } from "react-router-dom";
import { useSalesChannel } from "@/context/sales-channel";
import { useUser } from "@/context/user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/router/routes";
import { useTranslation } from "@/i18n";

const SalesChannelWarningDialog: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const needsWarning = useSalesChannel((s) => s.needsWarning);
  const setNeedsWarning = useSalesChannel((s) => s.setNeedsWarning);
  const salesChannelId = useSalesChannel((s) => s.salesChannelId);
  const isAuthenticated = useUser((s) => s.isAuthenticated);

  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal on navigation so each checkout visit re-evaluates.
  useChange(pathname, () => setDismissed(false));

  const isCheckoutPage = pathname.startsWith(ROUTES.checkout);
  const open = isAuthenticated && !dismissed && (needsWarning || (!salesChannelId && isCheckoutPage));

  const handleGoToSettings = () => {
    setNeedsWarning(false);
    navigate(ROUTES.settingsSection("connection"));
  };

  const handleContinueAnyway = () => {
    setNeedsWarning(false);
    setDismissed(true);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        // A prompt, not a form: no ring on a button nobody has touched yet.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">{t("errors.sales_channel_required_title")}</DialogTitle>
          <DialogDescription className="text-base mt-1">
            {t("errors.sales_channel_required_message")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-3 mt-4">
          <Button variant="outline" size="lg" className="flex-1" onClick={handleContinueAnyway}>
            {t("common.continue_anyway")}
          </Button>
          <Button size="lg" className="flex-1" onClick={handleGoToSettings}>
            {t("common.go_to_settings")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SalesChannelWarningDialog;
