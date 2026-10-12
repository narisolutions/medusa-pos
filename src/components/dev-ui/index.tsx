import React, { useState } from "react";
import { Banknote, CreditCard, Landmark, MessageSquare, Percent, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Tile } from "@/components/ui/tile";

// Development-only catalogue (docs/ui-ux): every primitive in every state, reviewed on the real
// touchscreen. Not translated and not shipped: the route exists only in dev builds.

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-4 rounded-lg border border-theme-border bg-surface p-6">
    <h2 className="text-xl font-semibold">{title}</h2>
    {children}
  </section>
);

// Literal class names: Tailwind only generates classes it can read in the source.
const INTENTS = [
  ["success", "bg-success text-success-foreground", "bg-success-subtle text-success-text"],
  ["warning", "bg-warning text-warning-foreground", "bg-warning-subtle text-warning-text"],
  ["danger", "bg-danger text-danger-foreground", "bg-danger-subtle text-danger-text"],
  ["info", "bg-info text-info-foreground", "bg-info-subtle text-info-text"],
] as const;
const BUTTON_VARIANTS = ["default", "secondary", "outline", "ghost", "success", "destructive", "link"] as const;
const BUTTON_SIZES = ["sm", "default", "lg", "xl"] as const;
const TAPS = [
  ["h-tap-min", "44 floor"],
  ["h-tap", "48 controls"],
  ["h-tap-lg", "56 sale actions"],
  ["h-tap-xl", "64 decisive"],
  ["h-tap-key", "72 keypad"],
] as const;

const DevUi: React.FC = () => {
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">UI kit</h1>
        <Button variant="outline" onClick={() => document.documentElement.classList.toggle("dark")}>
          Toggle light / dark
        </Button>
      </div>

      <Section title="Touch scale">
        <div className="flex flex-wrap items-end gap-4">
          {TAPS.map(([cls, label]) => (
            <div key={cls} className={`${cls} flex min-w-32 items-center justify-center rounded-md bg-primary px-3 text-primary-foreground`}>
              {label}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type and money">
        <p className="text-base">text-base — body and labels (16px floor at the counter)</p>
        <p className="text-lg">text-lg — emphasis</p>
        <p className="text-amount tabular-nums">₾ 1,234.50 — text-amount</p>
        <p className="text-total tabular-nums">₾ 24.50 — text-total</p>
      </Section>

      <Section title="Intent colours">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {INTENTS.map(([intent, solid, subtle]) => (
            <div key={intent} className="flex flex-col gap-2">
              <div className={`${solid} rounded-md p-3 font-semibold`}>{intent}</div>
              <div className={`${subtle} rounded-md p-3`}>{intent} subtle + text</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Status chips">
        <div className="flex flex-wrap gap-3">
          <StatusChip intent="success">Paid</StatusChip>
          <StatusChip intent="warning">Unpaid</StatusChip>
          <StatusChip intent="danger">Out of stock</StatusChip>
          <StatusChip intent="info">Pickup</StatusChip>
          <StatusChip>Draft</StatusChip>
        </div>
      </Section>

      <Section title="Buttons — press each one: every button must react under the finger">
        <div className="flex flex-col gap-4">
          {BUTTON_SIZES.map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-3">
              <span className="w-20 text-base text-fg-muted">{size}</span>
              {BUTTON_VARIANTS.map((variant) => (
                <Button key={variant} size={size} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-20 text-base text-fg-muted">states</span>
            <Button disabled>Disabled</Button>
            <Button loading={loading} onClick={() => setLoading(true)}>
              {loading ? "Processing…" : "Tap to load"}
            </Button>
            <Button variant="outline" onClick={() => setLoading(false)}>
              Reset
            </Button>
            <Button size="icon" variant="outline" aria-label="Remove">
              <Trash2 />
            </Button>
            <Button size="icon-lg" variant="outline" aria-label="Remove">
              <Trash2 />
            </Button>
          </div>
          <Button size="xl" className="w-full">
            Pay ₾24.50
          </Button>
        </div>
      </Section>

      <Section title="Tiles — choices (one selected) and actions with live sublines">
        <div className="grid grid-cols-3 gap-3">
          <Tile icon={<Banknote />} label="Cash" selected={method === "cash"} onClick={() => setMethod("cash")} />
          <Tile icon={<CreditCard />} label="TBC" selected={method === "tbc"} onClick={() => setMethod("tbc")} />
          <Tile icon={<Landmark />} label="Bank transfer" selected={method === "bank"} onClick={() => setMethod("bank")} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile icon={<Percent />} label="Discount" subline="−10 %" />
          <Tile icon={<User />} label="Customer" subline="Giorgi B." />
          <Tile icon={<MessageSquare />} label="Comment" badge={<StatusChip intent="info" icon={null}>1</StatusChip>} />
          <Tile icon={<Trash2 />} label="Clear cart" disabled />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Tile size="lg" icon={<Banknote />} label="Return" subline="Take items back" />
          <Tile size="lg" icon={<CreditCard />} label="Exchange" subline="Swap and settle" />
          <Tile size="lg" icon={<Landmark />} label="Add items" subline="To this order" />
        </div>
      </Section>
    </div>
  );
};

export default DevUi;
