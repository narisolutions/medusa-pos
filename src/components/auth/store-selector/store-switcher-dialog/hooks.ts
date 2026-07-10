import { useEffect, useState } from "react";
import { useChange } from "@/hooks/utils/useChange";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import schemas from "@/utils/schemas";
import { Forms } from "@/types/form";
import { StoreConfig } from "@/types/utils";
import { useStoreManager } from "@/context/store-manager";
import { checkBackendHealth, handleErrorToast } from "@/utils/helpers";
import { useTranslation } from "@/i18n";

type View = "list" | "add" | "edit";

// All list/add/edit state and store CRUD for the switcher; index.tsx only renders.
const useStoreSwitcher = (open: boolean, onClose: () => void) => {
  const { stores, activeStoreId, setActiveStore, addStore, updateStore, deleteStore } =
    useStoreManager();
  const { t } = useTranslation();
  const [view, setView] = useState<View>("list");
  const [editingStore, setEditingStore] = useState<StoreConfig | undefined>(undefined);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [scheme, setScheme] = useState<"https://" | "http://">("https://");
  const [host, setHost] = useState("");

  const form = useForm<Forms["StoreConfig"]>({
    defaultValues: { backendUrl: "" },
    resolver: zodResolver(schemas.storeConfig),
  });

  const { control, handleSubmit, formState: { isSubmitting }, reset } = form;

  // Sync scheme/host inputs when the view or edited store changes.
  useChange(`${view}|${editingStore?.id ?? ""}`, () => {
    if (view === "add") {
      setScheme("https://");
      setHost("");
    } else if (view === "edit" && editingStore) {
      const url = editingStore.backendUrl;
      if (url.startsWith("http://")) {
        setScheme("http://");
        setHost(url.slice("http://".length));
      } else if (url.startsWith("https://")) {
        setScheme("https://");
        setHost(url.slice("https://".length));
      } else {
        setScheme("https://");
        setHost(url);
      }
    }
  });

  // reset() is a side effect on the RHF instance — keep it in an effect.
  useEffect(() => {
    if (view === "add") {
      reset({ backendUrl: "" });
    } else if (view === "edit" && editingStore) {
      reset({ backendUrl: editingStore.backendUrl });
    }
  }, [view, editingStore, reset]);

  // Reset to list view when the dialog closes.
  useChange(open, () => {
    if (!open) {
      setView("list");
      setEditingStore(undefined);
      setSelectedStoreId(null);
    }
  });

  // Default the selected store when the list view is shown.
  useChange(`${open}|${view}|${activeStoreId ?? ""}|${stores.map((s) => s.id).join(",")}`, () => {
    if (open && view === "list") setSelectedStoreId(activeStoreId ?? stores[0]?.id ?? null);
  });

  const openAdd = () => {
    setEditingStore(undefined);
    setView("add");
  };

  const openEdit = (store: StoreConfig) => {
    setEditingStore(store);
    setView("edit");
  };

  const goBack = () => {
    setView("list");
    setEditingStore(undefined);
  };

  const handleSelect = async (store: StoreConfig) => {
    await setActiveStore(store.id);
    onClose();
  };

  const onSave = async (data: Forms["StoreConfig"]) => {
    const isEdit = view === "edit" && editingStore;
    const urlChanged = !isEdit || data.backendUrl !== editingStore?.backendUrl;

    if (urlChanged) {
      const health = await checkBackendHealth(data.backendUrl);
      if (!health.success) {
        handleErrorToast(t("auth.cannot_reach_backend", { error: health.error ?? t("common.error") }));
        return;
      }
    }

    try {
      if (isEdit && editingStore) {
        await updateStore(editingStore.id, { backendUrl: data.backendUrl });
      } else {
        await addStore({ backendUrl: data.backendUrl });
      }
      goBack();
    } catch (err) {
      handleErrorToast(err instanceof Error ? err.message : String(err));
    }
  };

  const onDelete = async () => {
    if (!editingStore) return;
    await deleteStore(editingStore.id);
    goBack();
  };

  const isFormView = view === "add" || view === "edit";

  return {
    stores,
    activeStoreId,
    view,
    isFormView,
    editingStore,
    selectedStoreId,
    setSelectedStoreId,
    scheme,
    setScheme,
    host,
    setHost,
    form,
    control,
    isSubmitting,
    submit: handleSubmit(onSave),
    openAdd,
    openEdit,
    goBack,
    handleSelect,
    onDelete,
  };
};

export { useStoreSwitcher };
