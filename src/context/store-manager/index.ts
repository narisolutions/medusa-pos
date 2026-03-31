import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { StoreConfig } from "@/types/utils";
import storage from "@/utils/storage";
import { initializeSdk } from "@/config/medusa";
import { resetOnBackendChange } from "@/utils/helpers";

type StoredStore = { id: string; name: string; logo?: string };

interface StoreManagerState {
  stores: StoreConfig[];
  activeStoreId: string | null;
  isHydrated: boolean;
  activeStore: StoreConfig | null;
  loadStores: () => Promise<void>;
  addStore: (data: { backendUrl: string }) => Promise<void>;
  updateStore: (id: string, data: { backendUrl: string }) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  setActiveStore: (id: string) => Promise<void>;
  updateActiveLogo: (logo: string | undefined) => Promise<void>;
  updateActiveName: (name: string) => Promise<void>;
}

const useStoreManager = create<StoreManagerState>((set, get) => ({
  stores: [],
  activeStoreId: null,
  isHydrated: false,
  activeStore: null,

  loadStores: async () => {
    type RawStore = StoredStore & { backendUrl?: string };
    const raw = (await storage.getItem<RawStore[]>("stores")) ?? [];
    const activeStoreId = (await storage.getItem("active_store_id")) ?? null;

    // One-time migration: if stores in storage still have backendUrl, move them to config file
    if (raw.some((s) => s.backendUrl)) {
      for (const s of raw) {
        if (s.backendUrl) {
          await invoke("save_store_url", { storeId: s.id, backendUrl: s.backendUrl });
        }
      }
      const rawActive = raw.find((s) => s.id === activeStoreId);
      if (rawActive) {
        await invoke("set_active_backend", { storeId: rawActive.id });
      }
      await storage.setItem<StoredStore[]>(
        "stores",
        raw.map((s) => ({ id: s.id, name: s.name, logo: s.logo })),
      );
    }

    const storeUrls = await invoke<Record<string, string>>("load_store_urls").catch(
      () => ({}) as Record<string, string>,
    );

    const stores: StoreConfig[] = raw.map((s) => ({
      id: s.id,
      name: s.name,
      logo: s.logo,
      backendUrl: storeUrls[s.id] ?? "",
    }));

    const activeStore = stores.find((s) => s.id === activeStoreId) ?? null;
    set({ stores, activeStoreId, activeStore, isHydrated: true });

    if (activeStore) {
      await initializeSdk(activeStore.backendUrl);
    }
  },

  addStore: async (data) => {
    const current = get().activeStore;
    const id = crypto.randomUUID();
    const storedStores: StoredStore[] = [
      ...get().stores.map((s) => ({ id: s.id, name: s.name, logo: s.logo })),
      { id, name: data.backendUrl },
    ];

    await invoke("save_store_url", { storeId: id, backendUrl: data.backendUrl });
    await invoke("set_active_backend", { storeId: id });
    await storage.setItem<StoredStore[]>("stores", storedStores);
    await storage.setItem("active_store_id", id);

    const newStore: StoreConfig = { id, name: data.backendUrl, backendUrl: data.backendUrl };
    set({ stores: [...get().stores, newStore], activeStoreId: id, activeStore: newStore });

    if (current?.backendUrl !== data.backendUrl) {
      await resetOnBackendChange();
    }
    await initializeSdk();
  },

  updateStore: async (id, data) => {
    const existing = get().stores.find((s) => s.id === id);
    const urlChanged = existing?.backendUrl !== data.backendUrl;
    const updated: StoreConfig = {
      ...(existing ?? { id, logo: undefined }),
      // Reset name to backendUrl when URL changes (new backend = new store name)
      name: urlChanged ? data.backendUrl : (existing?.name ?? data.backendUrl),
      backendUrl: data.backendUrl,
    };
    const stores = get().stores.map((s) => (s.id === id ? updated : s));

    const isActive = get().activeStoreId === id;

    await invoke("save_store_url", { storeId: id, backendUrl: data.backendUrl });

    if (isActive && urlChanged) {
      await invoke("set_active_backend", { storeId: id });
      await resetOnBackendChange();
      await initializeSdk();
    }

    await storage.setItem<StoredStore[]>(
      "stores",
      stores.map((s) => ({ id: s.id, name: s.name, logo: s.logo })),
    );

    const activeStore = isActive ? updated : get().activeStore;
    set({ stores, activeStore });
  },

  deleteStore: async (id) => {
    const stores = get().stores.filter((s) => s.id !== id);
    const wasActive = get().activeStoreId === id;

    await invoke("delete_store_url", { storeId: id });
    await storage.setItem<StoredStore[]>(
      "stores",
      stores.map((s) => ({ id: s.id, name: s.name, logo: s.logo })),
    );

    if (wasActive) {
      const next = stores[0] ?? null;
      const nextId = next?.id ?? null;

      if (next && nextId) {
        await storage.setItem("active_store_id", nextId);
        await invoke("set_active_backend", { storeId: nextId });
        await initializeSdk();
      } else {
        await storage.removeItem("active_store_id");
        await invoke("clear_active_backend");
      }

      set({ stores, activeStoreId: nextId, activeStore: next });
    } else {
      set({ stores });
    }
  },

  updateActiveName: async (name) => {
    const { activeStoreId, activeStore, stores } = get();
    if (!activeStore || !activeStoreId) return;

    const updated: StoreConfig = { ...activeStore, name };
    const updatedStores = stores.map((s) => (s.id === activeStoreId ? updated : s));

    await storage.setItem<StoredStore[]>(
      "stores",
      updatedStores.map((s) => ({ id: s.id, name: s.name, logo: s.logo })),
    );

    set({ activeStore: updated, stores: updatedStores });
  },

  updateActiveLogo: async (logo) => {
    const { activeStoreId, activeStore, stores } = get();
    if (!activeStore || !activeStoreId) return;

    const updated: StoreConfig = { ...activeStore, logo };
    const updatedStores = stores.map((s) => (s.id === activeStoreId ? updated : s));

    await storage.setItem<StoredStore[]>(
      "stores",
      updatedStores.map((s) => ({ id: s.id, name: s.name, logo: s.logo })),
    );

    set({ activeStore: updated, stores: updatedStores });
  },

  setActiveStore: async (id) => {
    const store = get().stores.find((s) => s.id === id);
    if (!store) return;

    const current = get().activeStore;
    if (current?.backendUrl !== store.backendUrl) {
      await invoke("set_active_backend", { storeId: id });
      await resetOnBackendChange();
      await initializeSdk();
    }

    await storage.setItem("active_store_id", id);
    set({ activeStoreId: id, activeStore: store });
  },
}));

export { useStoreManager };
