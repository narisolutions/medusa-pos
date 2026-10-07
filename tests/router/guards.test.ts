import { describe, it, expect } from "vitest";
import { protectedRouteOutcome, signInOutcome } from "@/router/guards";

describe("protectedRouteOutcome", () => {
  it("renders for a signed-in user", () => {
    expect(protectedRouteOutcome({ isAuthenticated: true, globalLoading: false })).toBe("render");
  });

  it("sends a signed-out user to sign-in", () => {
    expect(protectedRouteOutcome({ isAuthenticated: false, globalLoading: false })).toBe("sign-in");
  });

  it("waits while a login finishes, whatever the auth state", () => {
    expect(protectedRouteOutcome({ isAuthenticated: true, globalLoading: true })).toBe("wait");
    expect(protectedRouteOutcome({ isAuthenticated: false, globalLoading: true })).toBe("wait");
  });
});

describe("signInOutcome", () => {
  it("sends a restored session on to checkout", () => {
    expect(signInOutcome({ isAuthenticated: true, globalLoading: false })).toBe("checkout");
  });

  it("shows the form to a signed-out user", () => {
    expect(signInOutcome({ isAuthenticated: false, globalLoading: false })).toBe("render");
  });

  it("stays on the form while a login finishes, which navigates by itself", () => {
    expect(signInOutcome({ isAuthenticated: true, globalLoading: true })).toBe("render");
  });
});
