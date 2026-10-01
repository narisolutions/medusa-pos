import { describe, it, expect } from "vitest";
import { describeRequest } from "./requestLog";

const base = { method: "GET", url: "https://api/admin/orders?limit=10", path: "/admin/orders", ms: 142.6 };

describe("describeRequest", () => {
  it("labels a call with its status, method, path and rounded time", () => {
    const { label, level, details } = describeRequest({ ...base, status: 200, responseBody: { orders: [] } });
    expect(label).toBe("200 GET /admin/orders (limit 10) 143ms");
    expect(level).toBe("ok");
    expect(details).toEqual({ url: base.url, response: { orders: [] } });
  });

  it("splits the time into waiting for the server and reading the response", () => {
    const { label } = describeRequest({ ...base, status: 200, ms: 6719, headersMs: 6400 });
    expect(label).toBe("200 GET /admin/orders (limit 10) 6719ms (waiting 6400 · reading 319)");
  });

  it("separates client errors, server errors and calls that got no answer", () => {
    expect(describeRequest({ ...base, status: 404 }).level).toBe("warn");
    expect(describeRequest({ ...base, status: 503 }).level).toBe("error");
    const offline = describeRequest({ ...base, error: "error sending request" });
    expect(offline.level).toBe("error");
    expect(offline.label).toBe("ERR GET /admin/orders (limit 10) 143ms");
    expect(offline.details.error).toBe("error sending request");
  });

  it("shows a JSON request body as an object", () => {
    const { details } = describeRequest({ ...base, method: "POST", status: 200, requestBody: '{"quantity":2}' });
    expect(details.request).toEqual({ quantity: 2 });
  });

  it("never prints a login's password or the token that comes back", () => {
    const { details } = describeRequest({
      method: "POST",
      url: "https://api/auth/user/emailpass",
      path: "/auth/user/emailpass",
      status: 200,
      ms: 80,
      requestBody: '{"email":"a@b.c","password":"hunter2"}',
      responseBody: { token: "eyJ.secret.jwt" },
    });
    expect(JSON.stringify(details)).not.toMatch(/hunter2|eyJ/);
    expect(details.request).toBe("[redacted]");
    expect(details.response).toBe("[redacted]");
  });
});
