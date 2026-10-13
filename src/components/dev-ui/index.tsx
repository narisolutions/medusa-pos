import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/router/routes";
import { ArrowLeft, Banknote, Bookmark, CreditCard, Landmark, MessageSquare, Percent, Printer, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { Tile } from "@/components/ui/tile";
import { Numpad } from "@/components/ui/numpad";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Input } from "@/components/ui/input";
import { ChooserDialog, ChooserTrigger } from "@/components/ui/chooser-dialog";
import { ListRow } from "@/components/ui/list-row";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/state-panel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const navigate = useNavigate();
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [autoPrint, setAutoPrint] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [search, setSearch] = useState("Saperavi");
  const [chooserOpen, setChooserOpen] = useState(false);
  const [store, setStore] = useState("store-03");
  const [longDialog, setLongDialog] = useState(false);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Back to the Settings section it was opened from; to Settings when opened by its address. */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(ROUTES.settings))}
          >
            <ArrowLeft className="size-5" />
            Settings
          </Button>
          <h1 className="text-3xl font-bold">UI kit</h1>
        </div>
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

      <Section title="Numpad — hold ⌫ to clear; money stops at 2 decimals">
        <p className="text-total tabular-nums">₾ {amount || "0"}</p>
        <Numpad value={amount} onChange={setAmount} maxDecimals={2} onEnter={() => setAmount("")} />
      </Section>

      <Section title="Stepper — hold + or − to repeat; tap the number">
        <Stepper value={quantity} onChange={setQuantity} min={1} max={99} onValueClick={() => setQuantity(1)} />
      </Section>

      <Section title="Switch and checkbox — the whole row is the target">
        <Label className="flex min-h-tap items-center justify-between gap-4 text-base">
          Print a receipt after each sale
          <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
        </Label>
        <Label className="flex min-h-tap items-center gap-4 text-base">
          <Checkbox checked={drawer} onCheckedChange={(v) => setDrawer(v === true)} />
          Open the cash drawer on card payments
        </Label>
      </Section>

      <Section title="Segmented control and tabs">
        <SegmentedControl
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "System" },
          ]}
        />
        <Tabs defaultValue="printers">
          <TabsList>
            <TabsTrigger value="printers">Printers</TabsTrigger>
            <TabsTrigger value="scanner">Scanner</TabsTrigger>
            <TabsTrigger value="store">Store</TabsTrigger>
          </TabsList>
          <TabsContent value="printers" className="pt-3 text-base">Printers tab</TabsContent>
          <TabsContent value="scanner" className="pt-3 text-base">Scanner tab</TabsContent>
          <TabsContent value="store" className="pt-3 text-base">Store tab</TabsContent>
        </Tabs>
      </Section>

      <Section title="Input — 16px everywhere; clearable shows a 48px ×">
        <Input clearable value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" />
      </Section>

      <Section title="Chooser — large rows, search above 12 options, a folded group">
        <div className="max-w-sm">
          <ChooserTrigger value={store} placeholder="Choose a store" onClick={() => setChooserOpen(true)} />
        </div>
        <ChooserDialog
          open={chooserOpen}
          onOpenChange={setChooserOpen}
          title="Choose a store"
          value={store}
          onSelect={setStore}
          currentLabel="current"
          groups={[
            {
              id: "mine",
              title: "Your stores",
              options: Array.from({ length: 12 }, (_, i) => {
                const id = `store-${String(i + 1).padStart(2, "0")}`;
                return { value: id, label: `Store ${i + 1}`, hint: "Tbilisi", disabled: i === 4, disabledReason: "closed" };
              }),
            },
            {
              id: "other",
              title: "Other stores",
              collapsed: true,
              options: ["Batumi", "Kutaisi", "Rustavi"].map((city) => ({ value: city, label: city })),
            },
          ]}
        />
        <Button variant="outline" className="w-fit" onClick={() => setLongDialog(true)}>
          Open a long dialog (sticky footer)
        </Button>
        <Dialog open={longDialog} onOpenChange={setLongDialog}>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Return items</DialogTitle>
              <DialogDescription>Scroll: the actions stay at the bottom.</DialogDescription>
            </DialogHeader>
            {Array.from({ length: 12 }, (_, i) => (
              <ListRow key={i} title={`Item ${i + 1}`} subtitle="1 × ₾5.00" />
            ))}
            <DialogFooter sticky>
              <Button variant="outline" onClick={() => setLongDialog(false)}>
                Cancel
              </Button>
              <Button size="lg" onClick={() => setLongDialog(false)}>
                Refund ₾12.00
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="List rows — the whole row is the target">
        <div className="flex flex-col divide-y divide-theme-border rounded-md border border-theme-border">
          <ListRow
            navigates
            leading={<Bookmark />}
            title="Table 4"
            subtitle="3 items · 12 min ago"
            trailing={<span className="text-amount tabular-nums">₾24.50</span>}
          />
          <ListRow
            navigates
            leading={<Printer />}
            title="Front counter printer"
            subtitle="USB · 80 mm"
            trailing={<StatusChip intent="success">Connected</StatusChip>}
          />
          <ListRow navigates title="#562 · Giorgi B." trailing={<StatusChip intent="warning">Unpaid</StatusChip>} />
        </div>
      </Section>

      <Section title="States — one next step each">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-theme-border">
            <LoadingState label="Loading orders…" />
          </div>
          <div className="rounded-md border border-theme-border">
            <EmptyState icon={<Bookmark />} title="No parked sales" hint="Park a sale from the cart to finish it later." />
          </div>
          <div className="rounded-md border border-theme-border">
            <ErrorState title="Couldn't load the orders." hint="This is usually the connection." onRetry={() => undefined} />
          </div>
        </div>
      </Section>
    </div>
  );
};

export default DevUi;
