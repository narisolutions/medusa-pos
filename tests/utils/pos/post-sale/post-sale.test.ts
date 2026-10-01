import { describe, it, expect } from "vitest";
import { buildReturnPlan, differenceDirection, getPostSaleOptions, isChangedAfterSale, netOfReturns, getReturnableQuantity, postSaleEvents, showPostSaleEntry, variantLineTitle } from "@/utils/pos/post-sale";

const line = (f: number, rr = 0, rv = 0, rd = 0) => ({
  detail: {
    fulfilled_quantity: f,
    return_requested_quantity: rr,
    return_received_quantity: rv,
    return_dismissed_quantity: rd,
  },
});
const paid = { status: "completed", payment_status: "captured" } as const;
const ok = { hasOpenChange: false, hasStockLocation: true };

describe("getReturnableQuantity", () => {
  it("subtracts requested, received and dismissed returns from what was fulfilled", () => {
    expect(getReturnableQuantity(line(6, 1, 2, 1))).toBe(2);
  });

  it("is zero for a line that already came back in full (spike S8)", () => {
    expect(getReturnableQuantity(line(2, 0, 1, 1))).toBe(0);
  });

  it("is zero for an unfulfilled line or missing detail", () => {
    expect(getReturnableQuantity(line(0))).toBe(0);
    expect(getReturnableQuantity({})).toBe(0);
  });
});

describe("getPostSaleOptions", () => {
  it("allows all three on a paid, fulfilled order", () => {
    const o = getPostSaleOptions({ ...paid, items: [line(1)] }, ok);
    expect(o).toEqual({ return: { enabled: true }, exchange: { enabled: true }, add: { enabled: true } });
  });

  it("blocks everything on a canceled order, or while a change is open", () => {
    expect(getPostSaleOptions({ status: "canceled", payment_status: "captured", items: [line(1)] }, ok).add)
      .toEqual({ enabled: false, reason: "canceled" });
    expect(getPostSaleOptions({ ...paid, items: [line(1)] }, { ...ok, hasOpenChange: true }).return)
      .toEqual({ enabled: false, reason: "open_change" });
  });

  it("blocks everything on a fully refunded order, but not a partly refunded one", () => {
    expect(getPostSaleOptions({ status: "completed", payment_status: "refunded", items: [line(1)] }, ok).add)
      .toEqual({ enabled: false, reason: "refunded" });
    expect(getPostSaleOptions({ status: "completed", payment_status: "partially_refunded", items: [line(1)] }, ok).return)
      .toEqual({ enabled: true });
  });

  it("allows only additional charges on an unpaid order", () => {
    const o = getPostSaleOptions({ status: "pending", payment_status: "not_paid", items: [line(1)] }, ok);
    expect(o.return).toEqual({ enabled: false, reason: "unpaid" });
    expect(o.add).toEqual({ enabled: true });
  });

  it("explains an unfulfilled order, a fully returned one, and a missing stock location", () => {
    expect(getPostSaleOptions({ ...paid, items: [line(0)] }, ok).return).toMatchObject({ reason: "not_fulfilled" });
    expect(getPostSaleOptions({ ...paid, items: [line(1, 0, 1)] }, ok).exchange).toMatchObject({ reason: "all_returned" });
    expect(getPostSaleOptions({ ...paid, items: [line(1)] }, { ...ok, hasStockLocation: false }).return)
      .toMatchObject({ reason: "no_stock_location" });
  });
});

describe("getPostSaleOptions on an order in another currency", () => {
  it("allows a return but not goods going out", () => {
    const o = getPostSaleOptions(
      { ...paid, currency_code: "eur", items: [line(1)] },
      { ...ok, tillCurrency: "GEL" }
    );
    expect(o.return).toEqual({ enabled: true });
    expect(o.exchange).toEqual({ enabled: false, reason: "currency" });
    expect(o.add).toEqual({ enabled: false, reason: "currency" });
  });

  it("is not fooled by letter case", () => {
    const o = getPostSaleOptions({ ...paid, currency_code: "gel", items: [line(1)] }, { ...ok, tillCurrency: "GEL" });
    expect(o.add).toEqual({ enabled: true });
  });
});

describe("showPostSaleEntry", () => {
  it("hides the entry only on a canceled or fully refunded order", () => {
    const canceled = getPostSaleOptions({ status: "canceled", payment_status: "captured", items: [] }, ok);
    const refunded = getPostSaleOptions({ status: "completed", payment_status: "refunded", items: [line(1)] }, ok);
    const blocked = getPostSaleOptions({ ...paid, items: [line(1)] }, { ...ok, hasOpenChange: true });
    // Unfulfilled and in another currency: nothing possible, but the reasons are worth showing.
    const nothingPossible = getPostSaleOptions(
      { ...paid, currency_code: "eur", items: [line(0)] },
      { ...ok, tillCurrency: "GEL" }
    );
    expect(showPostSaleEntry(canceled)).toBe(false);
    expect(showPostSaleEntry(refunded)).toBe(false);
    expect(showPostSaleEntry(blocked)).toBe(true);
    expect(showPostSaleEntry(nothingPossible)).toBe(true);
  });
});

describe("differenceDirection", () => {
  it("names who settles, treating sub-cent noise as even", () => {
    expect(differenceDirection(30)).toBe("pays");
    expect(differenceDirection(-30)).toBe("refund");
    expect(differenceDirection(0.004)).toBe("even");
  });
});

describe("postSaleEvents", () => {
  const items = [
    { id: "l1", title: "Saperavi 750ml" },
    { id: "l2", title: "Goruli Mtsvane" },
  ];
  const sale = "2026-09-30T10:00:00.000Z";
  const change = (over: object) => ({ id: "c", status: "confirmed", confirmed_at: "2026-09-30T11:00:00.000Z", ...over });

  it("reports items added after the sale, with quantities and amount", () => {
    const events = postSaleEvents(
      [change({ change_type: "edit", actions: [{ action: "ITEM_ADD", details: { reference_id: "l1", quantity: 2, unit_price: 5 } }] })],
      items,
      sale
    );
    expect(events).toEqual([
      { id: "c", kind: "items_added", at: "2026-09-30T11:00:00.000Z", lines: [{ title: "Saperavi 750ml", quantity: 2 }], amount: 10 },
    ]);
  });

  it("shows a stamped Add items edit even when it predates the first fulfilment (unpaid order)", () => {
    const stamped = change({
      change_type: "edit",
      description: "pos:add_items",
      confirmed_at: "2026-09-30T09:59:00.000Z",
      actions: [{ action: "ITEM_ADD", details: { reference_id: "l2", quantity: 1, unit_price: 6 } }],
    });
    expect(postSaleEvents([stamped], items, sale)).toMatchObject([{ kind: "items_added", amount: 6 }]);
    expect(postSaleEvents([stamped], items, null)).toHaveLength(1);
  });

  it("skips the edits that built the sale at checkout, and unconfirmed changes", () => {
    const building = change({ change_type: "edit", confirmed_at: "2026-09-30T09:59:00.000Z", actions: [{ action: "ITEM_ADD", details: { reference_id: "l1", quantity: 1, unit_price: 5 } }] });
    const pending = change({ change_type: "edit", status: "pending", actions: [{ action: "ITEM_ADD", details: {} }] });
    expect(postSaleEvents([building, pending], items, sale)).toEqual([]);
  });

  it("counts restocked and damaged units on a received return", () => {
    const [event] = postSaleEvents(
      [change({ change_type: "return_receive", actions: [
        { action: "RECEIVE_RETURN_ITEM", details: { reference_id: "l1", quantity: 1 } },
        { action: "RECEIVE_DAMAGED_RETURN_ITEM", details: { reference_id: "l1", quantity: "1" } },
      ] })],
      items,
      sale
    );
    expect(event).toMatchObject({ kind: "items_returned", restocked: 1, damaged: 1 });
  });

  it("lists what went out and came back on an exchange, folding in how it was received", () => {
    const events = postSaleEvents(
      [
        change({ change_type: "exchange", return_id: "ret_x", actions: [
          { action: "ITEM_ADD", details: { reference_id: "l2", quantity: 1 } },
          { action: "RETURN_ITEM", details: { reference_id: "l1", quantity: 1 } },
        ] }),
        change({ id: "c2", change_type: "return_receive", return_id: "ret_x", actions: [
          { action: "RECEIVE_DAMAGED_RETURN_ITEM", details: { reference_id: "l1", quantity: 1 } },
        ] }),
      ],
      items,
      sale
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "items_exchanged",
      out: [{ title: "Goruli Mtsvane", quantity: 1 }],
      back: [{ title: "Saperavi 750ml", quantity: 1 }],
      restocked: 0,
      damaged: 1,
    });
  });

  it("keeps a plain return's receive as its own event", () => {
    const events = postSaleEvents(
      [change({ change_type: "return_receive", return_id: "ret_plain", actions: [
        { action: "RECEIVE_RETURN_ITEM", details: { reference_id: "l1", quantity: 1 } },
      ] })],
      items,
      sale
    );
    expect(events).toMatchObject([{ kind: "items_returned", restocked: 1 }]);
  });
});

describe("buildReturnPlan", () => {
  it("requests every chosen unit, receives the sellable ones and dismisses the damaged", () => {
    expect(
      buildReturnPlan({
        split: { restock: 1, damaged: 1 },
        good: { restock: 2, damaged: 0 },
        broken: { restock: 0, damaged: 1 },
        untouched: { restock: 0, damaged: 0 },
      })
    ).toEqual({
      request: [
        { id: "split", quantity: 2 },
        { id: "good", quantity: 2 },
        { id: "broken", quantity: 1 },
      ],
      receive: [
        { id: "split", quantity: 1 },
        { id: "good", quantity: 2 },
      ],
      dismiss: [
        { id: "split", quantity: 1 },
        { id: "broken", quantity: 1 },
      ],
    });
  });
});

describe("netOfReturns and isChangedAfterSale", () => {
  const kept = { quantity: 1, unit_price: 5, detail: { return_received_quantity: 0, return_dismissed_quantity: 0 } };
  const gone = { quantity: 1, unit_price: 3, detail: { return_received_quantity: 1, return_dismissed_quantity: 0 } };
  const partly = { quantity: 3, unit_price: 2, discount_total: 3, detail: { return_received_quantity: 1, return_dismissed_quantity: 1 } };

  it("keeps what the customer still has, pro-rating the line's discount", () => {
    expect(netOfReturns([kept, gone, partly])).toEqual([
      kept,
      { ...partly, quantity: 1, total: 2, discount_total: 1 },
    ]);
  });

  it("flags returned lines or a second payment, and nothing else", () => {
    expect(isChangedAfterSale({ items: [kept], payment_collections: [{}] })).toBe(false);
    expect(isChangedAfterSale({ items: [kept, gone], payment_collections: [{}] })).toBe(true);
    expect(isChangedAfterSale({ items: [kept], payment_collections: [{}, {}] })).toBe(true);
  });
});

describe("variantLineTitle", () => {
  it("does not say the product twice", () => {
    expect(variantLineTitle({ title: "Aladasturi 750ml", product: { title: "Aladasturi" } })).toBe("Aladasturi 750ml");
    expect(variantLineTitle({ title: "750ml", product: { title: "Saperavi" } })).toBe("Saperavi · 750ml");
    expect(variantLineTitle({ title: "Default variant", product: { title: "Saperavi" } })).toBe("Saperavi");
    expect(variantLineTitle({ title: null, product: null })).toBe("-");
  });
});
