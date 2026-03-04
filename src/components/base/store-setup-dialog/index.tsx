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

const StoreSetupDialog: React.FC = () => {
  const navigate = useNavigate();
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
    void storage.setItem("settings_tab", "store");
    navigate("/settings");
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleDismiss()}>
      <DialogContent
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Set up store info</DialogTitle>
          <DialogDescription className="text-base mt-1">
            Add your store name, branding, and store contact details so they
            appear correctly on receipts and throughout the app.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={handleRemindLater}>
            Remind me later
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={handleGoToSettings}
          >
            Go to Store Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StoreSetupDialog;
