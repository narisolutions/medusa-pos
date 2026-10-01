import { describe, it, expect, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import { matchRoutes, Navigate } from "react-router-dom";
import Login from "@/pages/login";
import Orders from "@/pages/orders";
import Order from "@/pages/order";
import Parked from "@/pages/parked";
import Checkout from "@/pages/checkout";
import Settings from "@/pages/settings";
import ProtectedRoute from "@/components/router";
import Auth from "@/components/auth";
import { logger } from "@/utils/logger";
import { routes } from "@/router/route-tree";
import { ROUTES } from "@/router/routes";

const { stub } = vi.hoisted(() => ({
  stub: (name: string) => ({ default: Object.assign(() => null, { displayName: name }) }),
}));

vi.mock("@/pages/login", () => stub("Login"));
vi.mock("@/pages/orders", () => stub("Orders"));
vi.mock("@/pages/order", () => stub("Order"));
vi.mock("@/pages/parked", () => stub("Parked"));
vi.mock("@/pages/checkout", () => stub("Checkout"));
vi.mock("@/pages/settings", () => stub("Settings"));
vi.mock("@/components/router", () => stub("ProtectedRoute"));
vi.mock("@/components/router/route-error", () => stub("RouteError"));
vi.mock("@/components/auth", () => stub("Auth"));
vi.mock("@/components/layout", () => ({ Layout: () => null }));
vi.mock("@/utils/logger", () => ({ logger: { warn: vi.fn() } }));
vi.mock("@/plugins", () => ({
  plugins: [
    { id: "loyalty", route: { path: "loyalty", Page: Object.assign(() => null, { displayName: "Loyalty" }) } },
    { id: "rogue", route: { path: "/orders", Page: () => null } },
    { id: "headless" },
  ],
}));

const resolve = (path: string) => {
  const matches = matchRoutes(routes, path) ?? [];
  const last = matches[matches.length - 1];
  const element = last?.route.element as ReactElement<{ to?: string }>;
  return { matches, element, params: last?.params ?? {} };
};

const hasAncestor = (path: string, type: unknown) =>
  resolve(path).matches.some(({ route }) => isValidElement(route.element) && route.element.type === type);

describe("route tree", () => {
  it.each([
    [ROUTES.checkout, Checkout],
    [ROUTES.orders, Orders],
    [ROUTES.parked, Parked],
    [ROUTES.settings, Settings],
  ])("renders %s behind the sign-in guard", (path, Page) => {
    expect(resolve(path).element.type).toBe(Page);
    expect(hasAncestor(path, ProtectedRoute)).toBe(true);
  });

  it("opens an order with its id", () => {
    const { element, params } = resolve(ROUTES.order("order_123"));
    expect(element.type).toBe(Order);
    expect(params.orderId).toBe("order_123");
  });

  it("keeps sign-in outside the guard, under the signed-in redirect", () => {
    expect(resolve(ROUTES.signIn).element.type).toBe(Login);
    expect(hasAncestor(ROUTES.signIn, Auth)).toBe(true);
    expect(hasAncestor(ROUTES.signIn, ProtectedRoute)).toBe(false);
  });

  it("sends the root to checkout", () => {
    const { element } = resolve("/");
    expect(element.type).toBe(Navigate);
    expect(element.props.to).toBe(ROUTES.checkout);
  });

  it("sends an unknown path back to the root", () => {
    const { element } = resolve("/no-such-page");
    expect(element.type).toBe(Navigate);
    expect(element.props.to).toBe("/");
  });

  it("guards every route with an error screen, and every page with one inside the layout", () => {
    for (const path of [ROUTES.signIn, ROUTES.checkout, ROUTES.order("o_1"), "/loyalty"]) {
      expect(resolve(path).matches[0].route.errorElement).toBeTruthy();
    }
    const pageLevel = resolve(ROUTES.checkout).matches.filter(({ route }) => route.errorElement);
    expect(pageLevel).toHaveLength(2);
  });

  it("mounts plugin pages in the layout, and skips one that claims a core path", () => {
    expect((resolve("/loyalty").element.type as { displayName?: string }).displayName).toBe("Loyalty");
    expect(hasAncestor("/loyalty", ProtectedRoute)).toBe(true);
    expect(resolve(ROUTES.orders).element.type).toBe(Orders);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.warn).mock.calls[0][0]).toContain('"rogue"');
  });
});
