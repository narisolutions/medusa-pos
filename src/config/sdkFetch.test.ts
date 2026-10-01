import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildUrl, createSdkFetch, encodeQuery, extractLoginToken, type SdkFetchDeps } from "./sdkFetch";

const BASE = "https://api.test/";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init });

function setup({ transport, getAuthToken, timeoutMs }: Partial<SdkFetchDeps> = {}) {
  const deps = {
    baseUrl: BASE,
    transport: vi.fn<SdkFetchDeps["transport"]>(transport ?? (async () => json({ ok: true }))),
    getAuthToken: vi.fn<SdkFetchDeps["getAuthToken"]>(getAuthToken ?? (async () => "tok")),
    storeAuthToken: vi.fn<SdkFetchDeps["storeAuthToken"]>(async () => {}),
    onUnauthorized: vi.fn(),
    log: vi.fn(),
    timeoutMs,
  };
  return { deps, fetch: createSdkFetch(deps) };
}

const sentInit = (deps: ReturnType<typeof setup>["deps"]) =>
  deps.transport.mock.calls[0][1] as RequestInit & { headers: Headers };

describe("encodeQuery", () => {
  it("indexes arrays and brackets operator maps, skipping empty values", () => {
    const query = { sales_channel_id: ["sc_1"], created_at: { $gte: "2026-01-01", $lt: undefined }, limit: 10, q: null };
    expect(decodeURIComponent(encodeQuery(query))).toBe(
      "sales_channel_id[0]=sc_1&created_at[$gte]=2026-01-01&limit=10"
    );
  });

  it("is empty without a query", () => {
    expect(encodeQuery(undefined)).toBe("");
  });
});

describe("buildUrl", () => {
  it("joins base and path and appends the query", () => {
    expect(buildUrl(BASE, "/admin/orders", { limit: 1 })).toBe("https://api.test/admin/orders?limit=1");
    expect(buildUrl(BASE, "admin/orders?x=1", { limit: 1 })).toBe("https://api.test/admin/orders?x=1&limit=1");
  });

  it("leaves absolute URLs alone", () => {
    expect(buildUrl(BASE, "https://other.test/a", undefined)).toBe("https://other.test/a");
  });
});

describe("extractLoginToken", () => {
  it("reads the token from the body or the headers", () => {
    expect(extractLoginToken({ token: "a" }, new Headers())).toBe("a");
    expect(extractLoginToken({ data: { token: "b" } }, new Headers())).toBe("b");
    expect(extractLoginToken({}, new Headers({ authorization: "Bearer c" }))).toBe("c");
    expect(extractLoginToken({}, new Headers())).toBeNull();
  });
});

describe("createSdkFetch", () => {
  it("sends every call through the transport with the token and a JSON body", async () => {
    const { deps, fetch } = setup();
    const result = await fetch("/admin/orders", { method: "POST", body: { a: 1 }, query: { limit: 5 } });

    expect(result).toEqual({ ok: true });
    expect(deps.transport).toHaveBeenCalledTimes(1);
    expect(deps.transport.mock.calls[0][0]).toBe("https://api.test/admin/orders?limit=5");
    const init = sentInit(deps);
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect(init.headers.get("Authorization")).toBe("Bearer tok");
    expect(init.headers.get("Content-Type")).toBe("application/json");
    expect("query" in init).toBe(false);
  });

  it("sends no token to login and stores the one it returns", async () => {
    const { deps, fetch } = setup({ transport: vi.fn(async () => json({ token: "new" })) });
    await fetch("/auth/user/emailpass", { method: "POST", body: { email: "e", password: "p" } });

    expect(sentInit(deps).headers.has("Authorization")).toBe(false);
    expect(deps.storeAuthToken).toHaveBeenCalledWith("new");
  });

  it("returns null for an empty body", async () => {
    const { fetch } = setup({ transport: vi.fn(async () => new Response(null, { status: 204 })) });
    await expect(fetch("/admin/x", { method: "DELETE" })).resolves.toBeNull();
  });

  it("throws an error carrying status and parsed body for a non-2xx answer", async () => {
    const { deps, fetch } = setup({
      transport: vi.fn(async () => json({ message: "nope" }, { status: 400, statusText: "Bad Request" })),
    });
    await expect(fetch("/admin/x")).rejects.toMatchObject({ status: 400, body: { message: "nope" } });
    expect(deps.onUnauthorized).not.toHaveBeenCalled();
  });

  it("reports a 401 on a request that carried a token", async () => {
    const { deps, fetch } = setup({ transport: vi.fn(async () => json({}, { status: 401 })) });
    await expect(fetch("/admin/orders")).rejects.toMatchObject({ status: 401 });
    expect(deps.onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not report a 401 from the auth routes or without a token", async () => {
    const unauthorized = vi.fn(async () => json({}, { status: 401 }));
    const withToken = setup({ transport: unauthorized });
    await expect(withToken.fetch("/auth/session", { method: "DELETE" })).rejects.toMatchObject({ status: 401 });
    expect(withToken.deps.onUnauthorized).not.toHaveBeenCalled();

    const noToken = setup({ transport: unauthorized, getAuthToken: vi.fn(async () => null) });
    await expect(noToken.fetch("/admin/orders")).rejects.toMatchObject({ status: 401 });
    expect(noToken.deps.onUnauthorized).not.toHaveBeenCalled();
  });

  it("wraps a transport Error with its URL and keeps plain-string rejections", async () => {
    const failing = setup({ transport: vi.fn(async () => Promise.reject(new Error("error sending request"))) });
    await expect(failing.fetch("/admin/x")).rejects.toThrow(
      "Tauri fetch failed: error sending request (URL: https://api.test/admin/x)"
    );

    const stringy = setup({ transport: vi.fn(async () => Promise.reject("error sending request")) });
    await expect(stringy.fetch("/admin/x")).rejects.toBe("error sending request");
  });

  it("logs each request with its outcome", async () => {
    const { deps, fetch } = setup();
    await fetch("/admin/orders", { query: { limit: 1 } });
    expect(deps.log).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET", path: "/admin/orders", status: 200, responseBody: { ok: true } })
    );
  });

  describe("timeout", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    // A transport that answers headers at once but never finishes the body until aborted.
    const stallingBody: SdkFetchDeps["transport"] = async (_url, init) => {
      const stream = new ReadableStream({
        start(controller) {
          init.signal?.addEventListener("abort", () => controller.error("Request cancelled"));
        },
      });
      return new Response(stream, { status: 200 });
    };

    it("covers the body and fails as a status-less timeout", async () => {
      const { fetch } = setup({ transport: stallingBody, timeoutMs: 1_000 });
      const pending = fetch("/admin/orders");
      const assertion = expect(pending).rejects.toMatchObject({
        name: "TimeoutError",
        message: "Request timed out after 1s",
      });
      await vi.advanceTimersByTimeAsync(1_000);
      await assertion;
      await expect(pending).rejects.not.toHaveProperty("status");
    });

    it("leaves a caller's cancel as it is", async () => {
      const { fetch } = setup({ transport: stallingBody, timeoutMs: 1_000 });
      const caller = new AbortController();
      const pending = fetch("/admin/orders", { signal: caller.signal });
      const assertion = expect(pending).rejects.toBe("Request cancelled");
      await vi.advanceTimersByTimeAsync(0);
      caller.abort();
      await assertion;
    });
  });
});
