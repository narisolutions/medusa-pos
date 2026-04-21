import React, { useState } from "react";
import { X, Plus, Loader2, Tag, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePromoDialog } from "./hooks";

type Props = {
  open: boolean;
  onClose: () => void;
};

const PromoDialog: React.FC<Props> = ({ open, onClose }) => {
  const {
    availablePromotions,
    isLoadingPromotions,
    isBusy,
    promoCodes,
    inactiveCodes,
    hasDraftOrder,
    formatPromotionValue,
    handleSelect,
    handleRemove,
  } = usePromoDialog();

  const [filter, setFilter] = useState("");

  const filtered = filter.trim()
    ? availablePromotions.filter((p) =>
        p.code!.toLowerCase().includes(filter.toLowerCase())
      )
    : availablePromotions;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isBusy) onClose();
      }}
    >
      <DialogContent
        className="max-w-lg w-full"
        preventOutsideClose={isBusy}
        showCloseButton={!isBusy}
      >
        <DialogTitle className="text-2xl font-semibold">Promo Code</DialogTitle>

        {!hasDraftOrder && (
          <p className="text-sm text-fg-muted bg-surface-muted border border-theme-border rounded-md px-3 py-2 -mt-1">
            Code will be applied when you proceed to checkout.
          </p>
        )}

        <div className="space-y-5">
          {/* Applied codes */}
          {promoCodes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">
                Applied
              </p>
              <div className="space-y-2">
                {promoCodes.map((c) => {
                  const inactive = inactiveCodes.has(c);
                  return (
                    <div
                      key={c}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 min-h-[64px] border ${
                        inactive
                          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700"
                          : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {inactive ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        ) : (
                          <Tag className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                        )}
                        <div>
                          <span className={`text-lg font-mono font-bold tracking-widest ${inactive ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>
                            {c}
                          </span>
                          {inactive && (
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                              No discount applied
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => void handleRemove(c)}
                        disabled={isBusy}
                        className={`min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg transition-colors disabled:opacity-40 touch-manipulation ${
                          inactive
                            ? "hover:bg-amber-100 dark:hover:bg-amber-900/30 active:bg-amber-200"
                            : "hover:bg-red-100 dark:hover:bg-red-900/30 active:bg-red-200"
                        }`}
                        aria-label={`Remove ${c}`}
                      >
                        {isBusy ? (
                          <Loader2 className={`w-5 h-5 animate-spin ${inactive ? "text-amber-500" : "text-green-600"}`} />
                        ) : (
                          <X className={`w-5 h-5 ${inactive ? "text-amber-500 dark:text-amber-400" : "text-green-600 dark:text-green-500"}`} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available promotions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">
              Available promotions
            </p>

            {availablePromotions.length > 4 && (
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter codes…"
                disabled={isBusy}
                className="w-full h-12 px-4 rounded-xl border border-theme-border bg-surface text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-40 text-base"
              />
            )}

            {isLoadingPromotions ? (
              <div className="flex items-center justify-center py-8 text-fg-muted gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading promotions…</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-fg-muted py-6">
                {availablePromotions.length === 0
                  ? "No promotions available."
                  : "No codes match your search."}
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((promo) => {
                  const valueLabel = formatPromotionValue(promo);
                  return (
                    <button
                      key={promo.id}
                      onClick={() => void handleSelect(promo.code!.toUpperCase())}
                      disabled={isBusy}
                      className="w-full flex items-center justify-between px-4 py-4 min-h-[72px] bg-surface border border-theme-border rounded-xl hover:bg-surface-hover hover:border-fg-subtle active:scale-[0.99] transition-all touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="text-lg font-mono font-bold tracking-widest text-fg">
                        {promo.code}
                      </span>
                      <div className="flex items-center gap-3">
                        {valueLabel && (
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {valueLabel}
                          </span>
                        )}
                        {isBusy ? (
                          <Loader2 className="w-5 h-5 animate-spin text-fg-subtle" />
                        ) : (
                          <Plus className="w-5 h-5 text-fg-subtle" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoDialog;
