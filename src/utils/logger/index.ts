import {
  warn,
  debug,
  trace,
  info,
  error,
  attachConsole,
} from '@tauri-apps/plugin-log';

export const initLogger = async () => {
  try {
    await attachConsole();
    info('Logger initialized successfully');
  } catch (err) {
    console.error('Failed to initialize logger:', err);
  }
};

export const logger = {
  trace: async (message: string) => {
    await trace(message);
  },
  
  debug: async (message: string) => {
    await debug(message);
  },
  
  info: async (message: string) => {
    await info(message);
  },
  
  warn: async (message: string) => {
    console.warn(`[WARN] ${message}`);
    await warn(message);
  },
  
  error: async (message: string) => {
    console.error(`[ERROR] ${message}`);
    await error(message);
  },
};

// An Error's message and stack are not enumerable, so JSON.stringify prints "{}" — every
// logged error lost its reason. Errors are expanded, including the HTTP status/body our
// patched fetch attaches; cycles print as "[Circular]" instead of failing.
export const safeStringify = (obj: unknown): string => {
  const seen = new WeakSet<object>();
  try {
    const out = JSON.stringify(
      obj,
      (_key, value: unknown) => {
        if (value instanceof Error) {
          const { name, message, stack } = value;
          return { name, message, ...(value as unknown as Record<string, unknown>), stack };
        }
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }
        return value;
      },
      2
    );
    return out ?? String(obj);
  } catch {
    return String(obj);
  }
};
