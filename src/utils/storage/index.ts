import { Store } from "@tauri-apps/plugin-store";

type NumberKeys = "last_login";

export type StringKeys = "draft_order_id" | "sales_channel_id" | "stock_location_id" | "settings_tab" | "active_store_id";

type BooleanKeys = "sound_enabled" | "store_setup_dismissed";

export type StoreThemeCache = {
  primaryColor?: string;
  secondaryColor?: string;
  fontScale?: string;
  brandName?: string;
};

type ObjectKeys = "printers" | "cart" | "orders_filters" | "store_theme" | "stores" | "user_preferences" | "date_time_preferences";

type Keys = StringKeys | NumberKeys | BooleanKeys | ObjectKeys;

function getItem(key: NumberKeys): Promise<number | undefined>;
function getItem(key: StringKeys): Promise<string | undefined>;
function getItem(key: BooleanKeys): Promise<boolean | undefined>;
function getItem<T>(key: ObjectKeys): Promise<T | undefined>;

async function getItem<D>(key: Keys): Promise<D | undefined> {
  try {
    const store = await Store.load("pos-storage.json");
    const value = await store.get<D>(key);
    return value || undefined;
  } catch (error) {
    console.error(`Failed to get item "${key}" from storage:`, error);
    return undefined;
  }
}

function setItem(key: NumberKeys, value: number): Promise<void>;
function setItem(key: StringKeys, value: string): Promise<void>;
function setItem(key: BooleanKeys, value: boolean): Promise<void>;
function setItem<T>(key: ObjectKeys, value: T): Promise<void>;

async function setItem<D>(key: Keys, value: D): Promise<void> {
  try {
    const store = await Store.load("pos-storage.json");
    await store.set(key, value);
    await store.save();
  } catch (error) {
    console.error(`Failed to set item "${key}" in storage:`, error);
  }
}

async function removeItem(key: Keys): Promise<void> {
  try {
    const store = await Store.load("pos-storage.json");
    await store.delete(key);
    await store.save();
  } catch (error) {
    console.error(`Failed to remove item "${key}" from storage:`, error);
  }
}

async function clear(): Promise<void> {
  try {
    const store = await Store.load("pos-storage.json");

    // Preserve ObjectKeys and specific StringKeys during logout
    const objectKeysToPreserve: ObjectKeys[] = ["printers", "cart", "store_theme", "stores", "user_preferences"];
    const stringKeysToPreserve: StringKeys[] = [
      "draft_order_id",
      "sales_channel_id",
      "stock_location_id",
      "active_store_id",
    ];
    const allKeysToPreserve = [
      ...objectKeysToPreserve,
      ...stringKeysToPreserve,
    ];
    const preservedData: Record<string, unknown> = {};

    // Save the values we want to preserve
    for (const key of allKeysToPreserve) {
      const value = await store.get(key);
      if (value !== null && value !== undefined) {
        preservedData[key] = value;
      }
    }

    // Clear all data
    await store.clear();

    // Restore preserved data
    for (const [key, value] of Object.entries(preservedData)) {
      await store.set(key, value);
    }

    await store.save();
  } catch (error) {
    console.error("Failed to clear storage:", error);
  }
}

async function clearOnBackendChange(): Promise<void> {
  try {
    const store = await Store.load("pos-storage.json");

    const objectKeysToPreserve: ObjectKeys[] = ["printers", "stores", "user_preferences"];
    const stringKeysToPreserve: StringKeys[] = ["settings_tab", "active_store_id"];
    const booleanKeysToPreserve: BooleanKeys[] = ["sound_enabled"];
    const allKeysToPreserve = [
      ...objectKeysToPreserve,
      ...stringKeysToPreserve,
      ...booleanKeysToPreserve,
    ];
    const preservedData: Record<string, unknown> = {};

    // Save the values we want to preserve
    for (const key of allKeysToPreserve) {
      const value = await store.get(key);
      if (value !== null && value !== undefined) {
        preservedData[key] = value;
      }
    }

    // Clear all data
    await store.clear();

    // Restore preserved data
    for (const [key, value] of Object.entries(preservedData)) {
      await store.set(key, value);
    }

    await store.save();
  } catch (error) {
    console.error("Failed to clear storage on backend change:", error);
  }
}

async function logAllStorage(): Promise<void> {
  try {
    const store = await Store.load("pos-storage.json");
    const allKeys = await store.keys();
    const storageContents: Record<string, unknown> = {};

    for (const key of allKeys) {
      const value = await store.get(key);
      if (value !== null && value !== undefined) {
        storageContents[key] = value;
      }
    }

    console.log("Storage", storageContents);
  } catch (error) {
    console.error("Failed to log storage contents:", error);
  }
}

export default {
  getItem,
  setItem,
  removeItem,
  clear,
  clearOnBackendChange,
  logAllStorage,
};
