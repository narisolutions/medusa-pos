/**
 * Dev-only request log. Every API call goes through Tauri's HTTP plugin, so the
 * browser's Network tab shows only its internal IPC chunks, never the request itself.
 * This prints one collapsed Console line per call instead; production is silent.
 */
export type RequestLogEntry = {
  method: string;
  /** The full URL, query string included. */
  url: string;
  /** What the call was for, without the host or the query string. */
  path: string;
  status?: number;
  ms: number;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: unknown;
};

// Login bodies hold the password and their responses the token — never printed.
const isSensitivePath = (path: string) => path.includes("/auth/");
const REDACTED = "[redacted]";

const parseBody = (body: unknown): unknown => {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

export function describeRequest(entry: RequestLogEntry) {
  const sensitive = isSensitivePath(entry.path);
  const failed = entry.status === undefined || entry.status >= 400;
  const level: "ok" | "warn" | "error" =
    entry.status === undefined || entry.status >= 500 ? "error" : failed ? "warn" : "ok";
  const label = `${entry.status ?? "ERR"} ${entry.method} ${entry.path} ${Math.round(entry.ms)}ms`;

  const details: Record<string, unknown> = { url: entry.url };
  if (entry.requestBody !== undefined) {
    details.request = sensitive ? REDACTED : parseBody(entry.requestBody);
  }
  if (entry.responseBody !== undefined) {
    details.response = sensitive ? REDACTED : entry.responseBody;
  }
  if (entry.error !== undefined) details.error = entry.error;

  return { label, level, details };
}

const COLORS = { ok: "#16a34a", warn: "#d97706", error: "#dc2626" } as const;

export function logRequest(entry: RequestLogEntry): void {
  if (!import.meta.env.DEV) return;
  const { label, level, details } = describeRequest(entry);
  console.groupCollapsed(`%c${label}`, `color:${COLORS[level]};font-weight:600`);
  for (const [key, value] of Object.entries(details)) console.log(key, value);
  console.groupEnd();
}
