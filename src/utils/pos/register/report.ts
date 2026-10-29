import { AdminOrder, AdminStore } from "@medusajs/types";
import { fromMinorUnits, toMinorUnits, toNumber } from "@/utils/pos/pricing";
import { getMethodType } from "@/utils/settings/store/metadata";
import { getOrderPaymentProviderId } from "@/utils/pos/payment";
import { orderCashParts } from "@/utils/pos/register";
import type {
  CountSum,
  RegisterSession,
  ReportTender,
  SessionReport,
} from "@/types/register";

/** Fixed print order of the tender lines; every one prints, zeros included. */
export const REPORT_TENDERS: ReportTender[] = ["cash", "card", "bank_transfer", "transfer"];

const SYSTEM_DEFAULT_PROVIDER = "pp_system_default";

type Tally = { count: number; minor: number };

const tally = (): Tally => ({ count: 0, minor: 0 });

const add = (target: Tally, minor: number) => {
  target.count += 1;
  target.minor += minor;
};

const toCountSum = ({ count, minor }: Tally): CountSum => ({ count, amount: fromMinorUnits(minor) });

/**
 * The X/Z figures for a session from its own orders (see ordersForSession).
 * Sums run in minor units, like expected cash, so the cash block's `expected`
 * equals computeExpectedCash for the same input.
 */
export function buildSessionReport(
  session: RegisterSession,
  orders: AdminOrder[],
  store: AdminStore | null | undefined
): SessionReport {
  const tenders = Object.fromEntries(REPORT_TENDERS.map((t) => [t, tally()])) as Record<ReportTender, Tally>;
  const unpaid = tally();
  const cashRefundTally = tally();
  const otherRefundTally = tally();
  let cashSales = 0;
  let cashRefunds = 0;
  let sales = 0;
  let cancelled = 0;

  for (const order of orders) {
    if (order.status === "canceled") {
      cancelled += 1;
      continue;
    }
    sales += 1;

    const parts = orderCashParts(order, store);
    cashSales += toMinorUnits(parts.sales);
    cashRefunds += toMinorUnits(parts.refunds);

    const payments = (order.payment_collections ?? []).flatMap((c) => c.payments ?? []);
    if (payments.length === 0) {
      const meta = order.metadata as Record<string, unknown> | null | undefined;
      if (meta?.pay_later === true) add(unpaid, toMinorUnits(toNumber(order.total)));
      continue;
    }

    for (const payment of payments) {
      // markAsPaid captures as pp_system_default; the order's session keeps the real method.
      const providerId =
        payment.provider_id === SYSTEM_DEFAULT_PROVIDER ? getOrderPaymentProviderId(order) : payment.provider_id;
      const tender = getMethodType(store, providerId);
      add(tenders[tender], toMinorUnits(toNumber(payment.amount)));

      const refunds = (payment as { refunds?: { amount?: unknown }[] }).refunds ?? [];
      for (const refund of refunds) {
        add(tender === "cash" ? cashRefundTally : otherRefundTally, toMinorUnits(toNumber(refund.amount)));
      }
    }
  }

  const payins = tally();
  const drops = tally();
  let noSales = 0;
  for (const movement of session.movements) {
    if (movement.type === "payin") add(payins, toMinorUnits(movement.amount));
    else if (movement.type === "drop") add(drops, toMinorUnits(movement.amount));
    else if (movement.type === "no_sale") noSales += 1;
  }

  const float = toMinorUnits(session.openingFloat);
  const expected = float + cashSales - cashRefunds + payins.minor - drops.minor;

  return {
    cash: {
      openingFloat: fromMinorUnits(float),
      cashSales: fromMinorUnits(cashSales),
      cashRefunds: fromMinorUnits(cashRefunds),
      payins: fromMinorUnits(payins.minor),
      drops: fromMinorUnits(drops.minor),
      expected: fromMinorUnits(expected),
    },
    tenders: Object.fromEntries(REPORT_TENDERS.map((t) => [t, toCountSum(tenders[t])])) as Record<
      ReportTender,
      CountSum
    >,
    unpaid: toCountSum(unpaid),
    refunds: { cash: toCountSum(cashRefundTally), other: toCountSum(otherRefundTally) },
    movements: { payins: toCountSum(payins), drops: toCountSum(drops), noSales },
    sales,
    cancelled,
  };
}
