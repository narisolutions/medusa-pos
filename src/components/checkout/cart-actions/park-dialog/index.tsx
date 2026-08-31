import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useChange } from "@/hooks/utils/useChange";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCheckout } from "../../hooks";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getGuestCustomerEmail } from "@/utils/settings/store/metadata";
import { useTranslation } from "@/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

const ParkModal: React.FC<Props> = ({ open, onClose }) => {
  const { handleParkSale, customerEmail, draftOrderMetaData } = useCheckout();
  const { data: store } = useQueryStore();
  const { t } = useTranslation();
  const [label, setLabel] = useState("");
  const [isParking, setIsParking] = useState(false);
  // A ref, not state, so a double-tap can't create two drafts before the re-render.
  const submitting = useRef(false);

  // Re-parking keeps the name it already had; otherwise suggest a real customer. The
  // store's guest address is a system fallback, not a customer, so it is never a name.
  const guestEmail = getGuestCustomerEmail(store);
  const isRealCustomer = !!customerEmail && customerEmail !== guestEmail;
  const suggestion = draftOrderMetaData.park_label || (isRealCustomer ? customerEmail : "");

  useChange(open, () => {
    if (open) setLabel(suggestion ?? "");
  });

  const park = async (value?: string) => {
    if (submitting.current) return;
    submitting.current = true;
    setIsParking(true);
    try {
      const parked = await handleParkSale(value);
      if (parked) onClose();
    } finally {
      submitting.current = false;
      setIsParking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isParking && onClose()}>
      <DialogContent className="max-w-xl p-6 md:p-8">
        <DialogTitle className="text-2xl font-semibold">
          {t("checkout.park_dialog_title")}
        </DialogTitle>
        <div className="space-y-6">
          <p className="text-base text-muted-foreground">
            {t("checkout.park_dialog_description")}
          </p>

          <div className="space-y-2">
            {/* "optional" sits on the field itself — leaving an empty box is the
                action now that there is no second button to say so. */}
            <label
              htmlFor="park-label"
              className="flex items-baseline gap-2 text-base font-medium text-fg"
            >
              {t("checkout.park_name_label")}
              <span className="text-sm font-normal text-muted-foreground">
                {t("checkout.park_name_optional")}
              </span>
            </label>
            <Input
              id="park-label"
              autoFocus
              value={label}
              disabled={isParking}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") void park(label);
              }}
              placeholder={t("checkout.park_label_placeholder")}
              className="text-base"
            />
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              size="lg"
              disabled={isParking}
              onClick={() => void park(label)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isParking ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-5 animate-spin" />
                  {t("checkout.parking")}
                </span>
              ) : (
                t("checkout.park_confirm_button")
              )}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              disabled={isParking}
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParkModal;
