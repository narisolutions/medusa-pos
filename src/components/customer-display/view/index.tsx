import React, { useEffect, useRef } from "react";
import { CheckCircle2, Clock, CreditCard, Landmark, ShoppingBag, XCircle } from "lucide-react";
import { i18next } from "@/i18n";
import { formatPrice } from "@/utils/settings/preferences/currency";
import { cn } from "@/lib/utils";
import type { DisplayLine, DisplayState, DisplayTotals } from "@/types/customer-display";

type Props = {
  /** `null` while nothing has arrived, or after the till went quiet: the welcome screen. */
  state: DisplayState | null;
  /** The line to highlight and scroll to; it changes with each scan. */
  highlightKey?: string;
  /** Drawn inside a settings card rather than a whole screen. */
  preview?: boolean;
};

const K = "customerDisplay";

/** Georgian with English underneath, or one language; the till's own `t` stays untouched. */
function useLabel(language: string | undefined) {
  const bilingual = language === "ka+en";
  const main = i18next.getFixedT(bilingual ? "ka" : (language ?? i18next.language));
  const second = bilingual ? i18next.getFixedT("en") : null;
  return (key: string, options?: Record<string, unknown>) => ({
    main: main(`${K}.${key}`, options),
    second: second ? second(`${K}.${key}`, options) : undefined,
  });
}

type Label = ReturnType<ReturnType<typeof useLabel>>;

const Text: React.FC<{ label: Label; className?: string; secondClassName?: string }> = ({ label, className, secondClassName }) => (
  <span className={cn("flex flex-col", className)}>
    <span>{label.main}</span>
    {label.second && <span className={cn("text-[0.6em] font-normal opacity-70", secondClassName)}>{label.second}</span>}
  </span>
);

const CustomerDisplayView: React.FC<Props> = ({ state, highlightKey, preview }) => {
  const label = useLabel(state?.format.language);
  // Money appears only on screens that carry a state, and so its currency.
  const currency = state?.format.currency;
  const money = (amount: number) => (currency ? formatPrice(amount, currency) : "");

  return (
    <div
      className={cn(
        "pointer-events-none flex select-none flex-col overflow-hidden bg-surface text-fg",
        preview ? "aspect-video w-full rounded-lg border border-theme-border text-[0.55rem]" : "h-dvh w-screen cursor-none"
      )}
    >
      {!state || state.phase === "idle" ? (
        <Idle state={state} label={label} />
      ) : state.phase === "cart" ? (
        <CartScreen
          lines={state.lines}
          totals={state.totals}
          highlightKey={highlightKey}
          label={label}
          money={money}
          vatNote={state.format.pricesIncludeVat}
        />
      ) : state.phase === "payment_pending" ? (
        <CartScreen lines={state.lines} totals={state.totals} label={label} money={money} priced>
          <div className="space-y-3 border-t-2 border-theme-border pt-4">
            <Text label={label("amount_due")} className="text-[1.4em] font-semibold text-fg-muted" />
            <div className="text-[3.2em] font-bold tabular-nums leading-none">{money(state.amountDue)}</div>
            {state.roundedFrom !== undefined && (
              <Text label={label("rounded_from", { amount: money(state.roundedFrom) })} className="text-fg-muted" />
            )}
            {state.method === "cash" && state.tendered !== undefined && (
              <div className="grid grid-cols-2 gap-2 pt-2 text-[1.3em] tabular-nums">
                <Text label={label("paid")} className="text-fg-muted" />
                <span className="text-right font-semibold">{money(state.tendered)}</span>
                <Text label={label((state.change ?? 0) >= 0 ? "change" : "still_due")} className="text-fg-muted" />
                <span className={cn("text-right font-bold", (state.change ?? 0) >= 0 ? "text-success-text" : "text-warning-text")}>
                  {money(Math.abs(state.change ?? 0))}
                </span>
              </div>
            )}
            {state.method !== "cash" && (
              <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-4 text-[1.2em]">
                {state.method === "card" ? <CreditCard className="size-[1.6em]" /> : <Landmark className="size-[1.6em]" />}
                <Text label={label(state.method === "card" ? "card_hint" : state.method === "bank_transfer" ? "bank_transfer_hint" : "transfer_hint")} />
              </div>
            )}
          </div>
        </CartScreen>
      ) : state.phase === "payment_success" ? (
        <Centered>
          {state.outstanding ? (
            <Clock className="size-[6em] text-warning-text" />
          ) : (
            <CheckCircle2 className="size-[6em] text-success-text" />
          )}
          <Text label={label("thank_you")} className="items-center text-[3em] font-bold" />
          {state.outstanding ? (
            <Text label={label("payment_due_later")} className="items-center text-[1.5em] text-fg-muted" />
          ) : (
            <div className="flex items-baseline gap-3 text-[1.5em] text-fg-muted tabular-nums">
              <Text label={label("total")} className="items-center" />
              <span>{money(state.total)}</span>
            </div>
          )}
          {state.change !== undefined && state.change > 0 && (
            <div className="flex flex-col items-center rounded-xl border-2 border-success bg-success-subtle px-10 py-5">
              <Text label={label("change")} className="items-center text-[1.4em] font-semibold text-success-text" />
              <span className="text-[3.4em] font-bold tabular-nums leading-none">{money(state.change)}</span>
            </div>
          )}
        </Centered>
      ) : (
        <Centered>
          <XCircle className="size-[6em] text-warning-text" />
          <Text label={label("payment_failed")} className="items-center text-[2.4em] font-bold" />
          <Text label={label("please_wait")} className="items-center text-[1.4em] text-fg-muted" />
        </Centered>
      )}
    </div>
  );
};

/** A whole count as it is, a weighed quantity to at most three decimals. */
const quantityText = (quantity: number): string => String(Number(quantity.toFixed(3)));

const Centered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">{children}</div>
);

const Idle: React.FC<{ state: DisplayState | null; label: ReturnType<typeof useLabel> }> = ({ state, label }) => (
  <Centered>
    {state?.branding.logoUrl ? (
      <img src={state.branding.logoUrl} alt="" className="max-h-[40%] max-w-[70%] object-contain" />
    ) : (
      <div className="text-[3.4em] font-bold">{state?.branding.storeName}</div>
    )}
    <Text label={label("welcome")} className="items-center text-[2.2em] font-semibold text-fg-muted" />
  </Centered>
);

type CartScreenProps = {
  lines: DisplayLine[];
  totals: DisplayTotals;
  highlightKey?: string;
  label: ReturnType<typeof useLabel>;
  money: (amount: number) => string;
  /** Payment has begun: the lines step back, and VAT shows only as the amount the backend charged. */
  priced?: boolean;
  /** The cart screen of a store known to charge VAT says its prices include it. */
  vatNote?: boolean;
  children?: React.ReactNode;
};

const CartScreen: React.FC<CartScreenProps> = ({ lines, totals, highlightKey, label, money, priced, vatNote, children }) => {
  const listRef = useRef<HTMLUListElement>(null);

  // The buyer can't scroll: the line that just changed comes into view by itself.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const target = highlightKey ? list.querySelector<HTMLElement>(`[data-key="${CSS.escape(highlightKey)}"]`) : null;
    if (target) target.scrollIntoView({ block: "nearest" });
    else list.scrollTop = list.scrollHeight;
  }, [highlightKey, lines.length]);

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] landscape:grid-cols-[1fr_minmax(16em,34%)] landscape:grid-rows-1">
      <ul ref={listRef} className={cn("min-h-0 overflow-hidden px-6 py-4", priced && "opacity-60")}>
        {totals.hiddenLines > 0 && (
          <li className="py-2 text-fg-muted">
            <Text label={label("more_items", { count: totals.hiddenLines })} />
          </li>
        )}
        {lines.map((line) => (
          <li
            // A new key on the changed line restarts its flash on a repeat scan.
            key={line.key === highlightKey ? `${line.key}:${line.quantity}` : line.key}
            data-key={line.key}
            className={cn(
              "flex items-center gap-4 border-b border-theme-border py-3 text-[1.25em]",
              line.key === highlightKey && "animate-cart-flash rounded-lg"
            )}
          >
            {line.thumbnailUrl ? (
              <img src={line.thumbnailUrl} alt="" className="size-[2.6em] shrink-0 rounded-md object-cover" />
            ) : (
              <ShoppingBag className="size-[2.6em] shrink-0 rounded-md bg-surface-muted p-[0.5em] text-fg-subtle" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{line.title}</div>
              <div className="flex flex-wrap items-center gap-x-3 text-[0.8em] text-fg-muted tabular-nums">
                {line.subtitle && <span>{line.subtitle}</span>}
                <span>
                  {quantityText(line.quantity)} × {money(line.unitPrice)}
                </span>
                {line.originalUnitPrice !== undefined && <span className="line-through">{money(line.originalUnitPrice)}</span>}
                {line.discountLabel && <span className="font-semibold text-primary">{line.discountLabel}</span>}
              </div>
            </div>
            <div className="shrink-0 text-right font-semibold tabular-nums">{money(line.lineTotal)}</div>
          </li>
        ))}
      </ul>
      <aside className="flex flex-col justify-end gap-3 bg-surface-muted p-6 text-[1.2em] tabular-nums">
        <Row label={label("items", { count: quantityText(totals.itemCount) })} value="" />
        {totals.discount > 0 && (
          <>
            <Row label={label("subtotal")} value={money(totals.subtotal)} />
            <Row label={label("you_save")} value={`−${money(totals.discount)}`} valueClassName="text-success-text font-semibold" />
          </>
        )}
        <div className="border-t-2 border-theme-border pt-3">
          <Text label={label("total")} className="text-[1.2em] font-semibold text-fg-muted" />
          <div className="text-[2.8em] font-bold leading-tight">{money(totals.total)}</div>
          {/* The amount once the backend has priced the sale; before that, a note only where the store is known to charge VAT. */}
          {totals.vatIncluded !== undefined ? (
            <Text label={label("vat_amount", { amount: money(totals.vatIncluded) })} className="text-[0.8em] text-fg-muted" />
          ) : (
            vatNote && <Text label={label("vat_included")} className="text-[0.8em] text-fg-muted" />
          )}
        </div>
        {children}
      </aside>
    </div>
  );
};

const Row: React.FC<{ label: Label; value: string; valueClassName?: string }> = ({ label, value, valueClassName }) => (
  <div className="flex items-baseline justify-between gap-4">
    <Text label={label} className="text-fg-muted" />
    <span className={valueClassName}>{value}</span>
  </div>
);

export default CustomerDisplayView;
