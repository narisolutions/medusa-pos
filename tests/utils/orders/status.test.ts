import { describe, it, expect } from "vitest";
import { humanizeStatus, orderStatusIntent } from "@/utils/orders/status";

describe("orderStatusIntent", () => {
  it("reads paid and delivered as success, open work as warning", () => {
    expect(orderStatusIntent("payment", "captured")).toBe("success");
    expect(orderStatusIntent("payment", "not_paid")).toBe("warning");
    expect(orderStatusIntent("fulfillment", "delivered")).toBe("success");
    expect(orderStatusIntent("fulfillment", "not_fulfilled")).toBe("warning");
    expect(orderStatusIntent("order", "canceled")).toBe("danger");
  });

  it("ignores case and keeps unknown statuses neutral", () => {
    expect(orderStatusIntent("payment", "CAPTURED")).toBe("success");
    expect(orderStatusIntent("fulfillment", "something_new")).toBe("neutral");
  });
});

describe("humanizeStatus", () => {
  it("turns a status id into words", () => {
    expect(humanizeStatus("partially_captured")).toBe("Partially captured");
  });
});
