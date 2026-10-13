import { useNavigate } from "react-router-dom";
import { useStore } from "@/context/store";
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
import { ROUTES } from "@/router/routes";
import { useTranslation } from "@/i18n";

const StoreSetupDialog: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const needsSetup = useStore((s) => s.needsSetup);
  const setNeedsSetup = useStore((s) => s.setNeedsSetup);
  const isAuthenticated = useUser((s) => s.isAuthenticated);

  const open = isAuthenticated && needsSetup;

  const handleDismiss = () => {
    setNeedsSetup(false);
    void storage.setItem("store_setup_dismissed", true);
  };

  const handleRemindLater = () => {
    handleDismiss();
  };

  const handleGoToSettings = () => {
    setNeedsSetup(false);
    void storage.setItem("store_setup_dismissed", true);
    navigate(ROUTES.settingsSection("store"));
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleDismiss()}>
      <DialogContent
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">{t("errors.store_setup_title")}</DialogTitle>
          <DialogDescription className="text-base mt-1">
            {t("errors.store_setup_message")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-3 mt-4">
          <Button variant="outline" size="lg" className="flex-1" onClick={handleRemindLater}>
            {t("common.remind_later")}
          </Button>
          <Button size="lg" className="flex-1" onClick={handleGoToSettings}>
            {t("common.go_to_store_settings")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StoreSetupDialog;
