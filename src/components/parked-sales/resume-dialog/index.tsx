import React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

type Props = {
  open: boolean;
  /** The current cart is already saved, so parking it cannot fail. */
  isBound: boolean;
  /** False when no customer email is configured — parking an unsaved cart is impossible. */
  canPark: boolean;
  isBusy: boolean;
  onParkCurrent: () => void;
  onDiscardCurrent: () => void;
  onClose: () => void;
};

const ResumeDialog: React.FC<Props> = ({
  open,
  isBound,
  canPark,
  isBusy,
  onParkCurrent,
  onDiscardCurrent,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-6 md:p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-warning-subtle">
            <AlertTriangle className="size-7 text-warning-text" />
          </div>
          <DialogTitle className="text-2xl font-semibold">
            {t("parked.resume_conflict_title")}
          </DialogTitle>
          <p className="text-base text-fg-muted">
            {t("parked.resume_conflict_message")}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <Button
            size="lg"
            disabled={isBusy || !canPark}
            onClick={onParkCurrent}
            className="h-16 text-base"
          >
            {t("parked.resume_conflict_park_current")}
          </Button>
          {/* Disabled with a visible reason rather than hidden — a missing option confuses. */}
          {!canPark && (
            <p className="-mt-1 text-base text-fg-muted text-center">
              {t("parked.resume_conflict_park_blocked")}
            </p>
          )}
          {!isBound && (
            <Button
              size="lg"
              variant="outline"
              disabled={isBusy}
              onClick={onDiscardCurrent}
              className="h-16 text-base text-danger-text"
            >
              {t("parked.resume_conflict_discard_current")}
            </Button>
          )}
          <Button
            size="lg"
            variant="ghost"
            disabled={isBusy}
            onClick={onClose}
            className="h-16 text-base"
          >
            {t("common.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResumeDialog;
