import { describe, it, expect } from "vitest";
import { getOrderCustomerLabel, getOrderDeliveryCustomer } from ".";

const GUEST = "guest@wineland.ge";

describe("getOrderCustomerLabel", () => {
  // A partner order has no Medusa customer, so customer.email is the store's own
  // guest address — the list showed that instead of the person on the metadata.
  it("prefers the delivery customer on a partner order", () => {
    const order = {
      email: GUEST,
      customer: { email: GUEST },
      metadata: { delivery: { customer: { name: "Test Customer Alpha", phone: "0000" } } },
    };

    expect(getOrderCustomerLabel(order)).toBe("Test Customer Alpha");
  });

  it("falls back to a real customer name", () => {
    const order = { customer: { email: "nino@example.com", first_name: "Nino", last_name: "B" } };

    expect(getOrderCustomerLabel(order)).toBe("Nino B");
  });

  it("falls back to the billing address name", () => {
    const order = {
      customer: { email: GUEST },
      billing_address: { first_name: "Giorgi", last_name: "B" },
    };

    expect(getOrderCustomerLabel(order)).toBe("Giorgi B");
  });

  it("shows a real email when it is not the guest address", () => {
    expect(getOrderCustomerLabel({ customer: { email: "nino@example.com" } })).toBe(
      "nino@example.com"
    );
  });

  // A walk-in keeps showing the store's guest address, as it always has.
  it("falls back to the guest address, then to a dash", () => {
    expect(getOrderCustomerLabel({ customer: { email: GUEST } })).toBe(GUEST);
    expect(getOrderCustomerLabel({})).toBe("—");
  });

  it("tolerates a half-filled name", () => {
    expect(getOrderCustomerLabel({ customer: { first_name: "Nino" } })).toBe("Nino");
  });
});

describe("getOrderDeliveryCustomer", () => {
  it("reads name, phone and note off the delivery metadata", () => {
    const delivery = { name: "Alpha", phone: "0000", note: "Call on arrival" };

    expect(getOrderDeliveryCustomer({ metadata: { delivery: { customer: delivery } } })).toEqual(
      delivery
    );
  });

  it("returns undefined for an ordinary order", () => {
    expect(getOrderDeliveryCustomer({ metadata: null })).toBeUndefined();
    expect(getOrderDeliveryCustomer({ metadata: { foo: 1 } })).toBeUndefined();
  });
});
