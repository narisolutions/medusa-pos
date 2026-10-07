import React from "react";
import { ArrowLeftRight, Ban, PackagePlus, Undo2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import type { PostSaleKind, PostSaleOption } from "@/utils/pos/post-sale";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  options: Record<PostSaleKind, PostSaleOption>;
  onChoose: (kind: PostSaleKind) => void;
}

const KINDS: { kind: PostSaleKind; Icon: React.ElementType }[] = [
  { kind: "return", Icon: Undo2 },
  { kind: "exchange", Icon: ArrowLeftRight },
  { kind: "add", Icon: PackagePlus },
];

const PostSaleChooser: React.FC<Props> = ({ isOpen, onClose, options, onChoose }) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-fg">
            {t("orders.post_sale.title")}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t("orders.post_sale.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {KINDS.map(({ kind, Icon }) => {
            const option = options[kind];
            return (
              <Button
                key={kind}
                type="button"
                variant="outline"
                disabled={!option.enabled}
                onClick={() => onChoose(kind)}
                className="h-auto min-h-14 justify-start gap-4 px-4 py-3 text-left whitespace-normal disabled:opacity-100"
              >
                {option.enabled ? (
                  <Icon className="size-6 shrink-0 text-primary" />
                ) : (
                  <Ban className="size-6 shrink-0 text-fg-subtle" />
                )}
                <span className="flex flex-col gap-0.5">
                  <span className={`text-lg font-semibold ${option.enabled ? "text-fg" : "text-fg-subtle"}`}>
                    {t(`orders.post_sale.${kind}_label`)}
                  </span>
                  <span className="text-base font-normal text-fg-muted">
                    {option.enabled
                      ? t(`orders.post_sale.${kind}_hint`)
                      : t(`orders.post_sale.reason_${option.reason}`)}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostSaleChooser;
