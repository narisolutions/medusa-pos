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
        <Idle storeName={state?.branding.storeName} logoUrl={state?.phase === "idle" ? state.logoUrl : undefined} label={label} />
      ) : state.phase === "cart" ? (
        <CartScreen
          lines={state.lines}
          totals={state.totals}
          highlightKey={highlightKey}
          label={label}
          money={money}
          hero={{
            label: label("total"),
            amount: state.totals.total,
            note: state.format.pricesIncludeVat ? label("vat_included") : undefined,
          }}
        />
      ) : state.phase === "payment_pending" ? (
        <CartScreen
          lines={state.lines}
          totals={state.totals}
          label={label}
          money={money}
          priced
          hero={{
            // One amount to look at: what to pay now. The total it comes from shows only when rounding changed it.
            label: label("amount_due"),
            amount: state.amountDue,
            note:
              state.roundedFrom !== undefined
                ? label("rounded_from", { amount: money(state.roundedFrom) })
                : state.totals.vatIncluded !== undefined
                  ? label("vat_amount", { amount: money(state.totals.vatIncluded) })
                  : undefined,
          }}
        >
          {state.method === "cash" ? (
            state.tendered !== undefined && (
              <div className="space-y-2 border-t border-theme-border pt-[0.8em] text-[1.15em]">
                <Row label={label("paid")} value={money(state.tendered)} />
                <Row
                  label={label((state.change ?? 0) >= 0 ? "change" : "still_due")}
                  value={money(Math.abs(state.change ?? 0))}
                  valueClassName={cn("text-[1.4em] font-bold", (state.change ?? 0) >= 0 ? "text-success-text" : "text-warning-text")}
                />
              </div>
            )
          ) : (
            <div className="flex items-center gap-[0.6em] rounded-lg bg-surface p-[0.8em] text-[1.05em]">
              {state.method === "card" ? <CreditCard className="size-[1.5em] shrink-0" /> : <Landmark className="size-[1.5em] shrink-0" />}
              <Text label={label(state.method === "card" ? "card_hint" : state.method === "bank_transfer" ? "bank_transfer_hint" : "transfer_hint")} />
            </div>
          )}
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

/** The store's mark (its logo, or its name) over one welcome line, and nothing else. */
const Idle: React.FC<{ storeName?: string; logoUrl?: string; label: ReturnType<typeof useLabel> }> = ({
  storeName,
  logoUrl,
  label,
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-[2.5em] p-[2em] text-center">
    {logoUrl ? (
      <img src={logoUrl} alt="" className="max-h-[35%] max-w-[60%] object-contain" />
    ) : (
      storeName && <div className="text-[3.6em] font-bold tracking-tight">{storeName}</div>
    )}
    <span aria-hidden className="h-[0.25em] w-[4em] rounded-full bg-primary" />
    <Text label={label("welcome")} className="items-center text-[2em] font-medium text-fg-muted" />
  </div>
);

type Hero = { label: Label; amount: number; note?: Label };

type CartScreenProps = {
  lines: DisplayLine[];
  totals: DisplayTotals;
  highlightKey?: string;
  label: ReturnType<typeof useLabel>;
  money: (amount: number) => string;
  /** The one big amount at the foot of the panel: the total, or at payment what is due. */
  hero: Hero;
  /** Payment has begun: the lines step back. */
  priced?: boolean;
  children?: React.ReactNode;
};

const CartScreen: React.FC<CartScreenProps> = ({ lines, totals, highlightKey, label, money, hero, priced, children }) => {
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
      <aside className="flex min-h-0 flex-col gap-[1em] bg-surface-muted p-[1.5em] tabular-nums">
        {/* The breakdown sits quietly at the top; the eye goes to the one amount at the foot. */}
        <div className="space-y-[0.4em] text-[1.1em]">
          <Row label={label("items_label")} value={quantityText(totals.itemCount)} />
          {totals.discount > 0 && (
            <>
              <Row label={label("subtotal")} value={money(totals.subtotal)} />
              <Row label={label("you_save")} value={`−${money(totals.discount)}`} valueClassName="font-semibold text-success-text" />
            </>
          )}
        </div>
        <div className="mt-auto space-y-[1em]">
          <div className="rounded-xl bg-surface p-[1em]">
            <Text label={hero.label} className="text-[1.15em] font-semibold text-fg-muted" />
            <div className="text-[3em] font-bold leading-tight">{money(hero.amount)}</div>
            {hero.note && <Text label={hero.note} className="text-[0.85em] text-fg-muted" />}
          </div>
          {children}
        </div>
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
