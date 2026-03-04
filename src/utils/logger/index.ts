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

export const safeStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};
