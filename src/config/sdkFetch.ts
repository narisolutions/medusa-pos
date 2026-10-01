// The Medusa SDK's transport: every API call goes through `transport` (Tauri's HTTP plugin).
import type { RequestLogEntry } from "./requestLog";

export const REQUEST_TIMEOUT_MS = 15_000;

/** An HTTP answer that was not 2xx, carrying what the rest of the app reads from errors. */
export type HttpError = Error & { status: number; statusText: string; body?: unknown };

/**
 * Encodes the SDK's `query` object the way Medusa parses it (qs, indexed brackets).
 * String(value) would flatten these: a one-element array would arrive as a scalar and an
 * operator map as "[object Object]"; routes that require an array (draft-orders'
 * sales_channel_id) reject the flattened form. Repeated keys would not do either: a
 * one-element array degenerates back to a scalar.
 */
export function encodeQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item, index) => params.append(`${key}[${index}]`, String(item)));
    } else if (typeof value === "object") {
      for (const [operator, operand] of Object.entries(value as Record<string, unknown>)) {
        if (operand === undefined || operand === null) continue;
        params.append(`${key}[${operator}]`, String(operand));
      }
    } else {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

/** The path as the SDK gave it: a string, or a URL's path and search. */
export const toPathString = (path: string | URL): string =>
  path instanceof URL ? path.pathname + path.search : path;

export function buildUrl(baseUrl: string, path: string, query: Record<string, unknown> | undefined): string {
  const base = baseUrl.replace(/\/$/, "");
  let url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const encoded = encodeQuery(query);
  if (encoded) url += (url.includes("?") ? "&" : "?") + encoded;
  return url;
}

/** The login call: its body is a password, its answer the token, and it sends no token. */
export const isLoginPath = (path: string): boolean =>
  path.includes("/auth/") && (path.includes("/login") || path.includes("/emailpass"));

/** Any auth route (login, session, logout): a 401 there is not an expired session. */
export const isAuthPath = (path: string): boolean => path.includes("/auth/");

/** Object bodies become JSON; write requests with a string body are JSON too. */
export function prepareBody(body: unknown, method: string | undefined, headers: Headers): BodyInit | undefined {
  const isRaw = body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer;
  if (body && typeof body === "object" && !isRaw) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return JSON.stringify(body);
  }
  if (body && typeof body === "string" && (method === "POST" || method === "PUT" || method === "PATCH")) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }
  return body as BodyInit | undefined;
}

export function toHttpError(status: number, statusText: string, bodyText: string | undefined): HttpError {
  const error = new Error(`HTTP ${status}: ${statusText}`) as HttpError;
  error.status = status;
  error.statusText = statusText;
  if (bodyText) {
    try {
      error.body = JSON.parse(bodyText);
    } catch {
      error.body = bodyText;
    }
  }
  return error;
}

/** Our own timeout, so it reads as "no answer" (no status), unlike a caller's cancel. */
export const timeoutError = (ms: number): Error =>
  Object.assign(new Error(`Request timed out after ${ms / 1000}s`), { name: "TimeoutError" });

/** A transport failure, with the URL it was for; Tauri also rejects with plain strings, kept as they are. */
export function wrapTransportError(error: unknown, url: string): unknown {
  if (!(error instanceof Error)) return error;
  const wrapped = new Error(`Tauri fetch failed: ${error.message} (URL: ${url})`) as Error & {
    originalError: unknown;
    url: string;
  };
  wrapped.stack = error.stack;
  wrapped.originalError = error;
  wrapped.url = url;
  return wrapped;
}

/** The token from a login answer, wherever this backend version put it. */
export function extractLoginToken(json: unknown, headers: Headers): string | null {
  const obj = (json ?? {}) as Record<string, unknown>;
  const data = obj.data as Record<string, unknown> | undefined;
  const token =
    (typeof obj.token === "string" ? obj.token : null) ||
    (typeof obj.access_token === "string" ? obj.access_token : null) ||
    (typeof data?.token === "string" ? data.token : null) ||
    headers.get("x-medusa-access-token") ||
    headers.get("authorization")?.replace("Bearer ", "") ||
    null;
  return token || null;
}

export type SdkFetchDeps = {
  baseUrl: string;
  /** Tauri's HTTP plugin fetch. */
  transport: (url: string, init: RequestInit) => Promise<Response>;
  getAuthToken: () => Promise<string | null>;
  storeAuthToken: (token: string) => Promise<void>;
  /** A request with a token was answered 401 outside the auth routes: the session is over. */
  onUnauthorized: () => void;
  log: (entry: RequestLogEntry) => void;
  timeoutMs?: number;
};

type SdkInit = Omit<RequestInit, "body"> & { query?: Record<string, unknown>; body?: unknown };

export function createSdkFetch(deps: SdkFetchDeps) {
  const timeoutMs = deps.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const base = deps.baseUrl.replace(/\/$/, "");

  return async (path: string | URL, init?: SdkInit): Promise<unknown> => {
    const pathString = toPathString(path);
    const { query, body: rawBody, ...rest } = init ?? {};
    const url = buildUrl(deps.baseUrl, pathString, query);
    const method = (rest.method ?? "GET").toUpperCase();
    const headers = new Headers(rest.headers);
    const body = prepareBody(rawBody, rest.method, headers);

    let sentToken = false;
    if (!isLoginPath(pathString) && !headers.has("Authorization")) {
      const token = await deps.getAuthToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
        sentToken = true;
      }
    }

    // The timeout covers the whole call, body included: a server that stalls mid-response
    // must not hold a request (and whatever waits on it) indefinitely.
    const timeout = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      timeout.abort();
    }, timeoutMs);
    const callerSignal = rest.signal ?? undefined;
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeout.signal]) : timeout.signal;

    const startedAt = performance.now();
    let headersMs: number | undefined;
    const logPath = url.slice(base.length).split("?")[0] || pathString;
    const log = (extra: Partial<RequestLogEntry>) =>
      deps.log({ method, url, path: logPath, ms: performance.now() - startedAt, headersMs, requestBody: body, ...extra });

    try {
      const response = await deps.transport(url, { ...rest, headers, body, signal }).catch((error: unknown) => {
        throw wrapTransportError(error, url);
      });
      headersMs = performance.now() - startedAt;

      if (!response.ok) {
        let bodyText: string | undefined;
        try {
          bodyText = await response.clone().text();
        } catch {
          // the error body is a nicety; the status is what matters
        }
        const error = toHttpError(response.status, response.statusText, bodyText);
        if (response.status === 401 && sentToken && !isAuthPath(pathString)) deps.onUnauthorized();
        throw error;
      }

      const text = await response.text();
      // Empty body (204, or an empty 200): null, not a JSON SyntaxError.
      if (!text || text.trim() === "") {
        log({ status: response.status });
        return null;
      }
      const json = JSON.parse(text);
      log({ status: response.status, responseBody: json });

      if (isLoginPath(pathString)) {
        const token = extractLoginToken(json, response.headers);
        if (token) await deps.storeAuthToken(token);
      }
      return json;
    } catch (error) {
      const failure = timedOut ? timeoutError(timeoutMs) : error;
      const status = (failure as { status?: number } | null)?.status;
      log({
        status,
        responseBody: (failure as { body?: unknown } | null)?.body,
        error: status === undefined ? failure : undefined,
      });
      throw failure;
    } finally {
      clearTimeout(timer);
    }
  };
}
