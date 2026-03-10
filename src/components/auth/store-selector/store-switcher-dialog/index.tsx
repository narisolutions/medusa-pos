import React, { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Pencil, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import schemas from "@/utils/schemas";
import { Forms } from "@/types/form";
import { StoreConfig } from "@/types/utils";
import { useStoreManager } from "@/context/store-manager";
import { checkBackendHealth, handleErrorToast } from "@/utils/helpers";
import MedusaIcon from "@/assets/icons/medusa";

type View = "list" | "add" | "edit";

interface Props {
  open: boolean;
  onClose: () => void;
}

const StoreSwitcherDialog: React.FC<Props> = ({ open, onClose }) => {
  const { stores, activeStoreId, setActiveStore, addStore, updateStore, deleteStore } =
    useStoreManager();
  const [view, setView] = useState<View>("list");
  const [editingStore, setEditingStore] = useState<StoreConfig | undefined>(undefined);

  const form = useForm<Forms["StoreConfig"]>({
    defaultValues: { backendUrl: "" },
    resolver: zodResolver(schemas.storeConfig),
  });

  const { control, handleSubmit, formState: { isSubmitting }, reset } = form;

  useEffect(() => {
    if (view === "add") {
      reset({ backendUrl: "" });
    } else if (view === "edit" && editingStore) {
      reset({ backendUrl: editingStore.backendUrl });
    }
  }, [view, editingStore, reset]);

  useEffect(() => {
    if (!open) {
      setView("list");
      setEditingStore(undefined);
    }
  }, [open]);

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
        handleErrorToast(`Cannot reach backend: ${health.error ?? "Unknown error"}`);
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-lg"
        onOpenAutoFocus={isFormView ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="flex flex-row items-center gap-3">
          {isFormView && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-ml-2 min-h-[44px] min-w-[44px] shrink-0"
              onClick={goBack}
              aria-label="Back to store list"
            >
              <ChevronLeft size={24} />
            </Button>
          )}
          <DialogTitle className="text-2xl flex-1">
            {view === "list" && "Select store"}
            {view === "add" && "Add store"}
            {view === "edit" && "Edit store"}
          </DialogTitle>
        </DialogHeader>

        {view === "list" && (
          <div className="flex flex-col gap-3 mt-2 min-w-0">
            {stores.map((store) => {
              const isActive = store.id === activeStoreId;
              return (
                <div
                  key={store.id}
                  className={`flex items-center gap-4 rounded-2xl px-5 py-5 border-2 cursor-pointer transition-colors min-h-[48px] ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-theme-border bg-surface-muted hover:border-theme-border-strong hover:bg-surface-hover active:bg-surface-hover"
                  }`}
                  onClick={() => handleSelect(store)}
                >
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="size-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <MedusaIcon className="size-10 shrink-0" />
                  )}
                  <span
                    className={`flex-1 min-w-0 text-lg font-semibold truncate ${isActive ? "text-primary" : "text-fg"}`}
                  >
                    {store.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 min-h-[48px] min-w-[48px] text-fg-subtle hover:text-fg"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(store);
                    }}
                    aria-label={`Edit ${store.name}`}
                  >
                    <Pencil size={24} />
                  </Button>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="mt-1 w-full justify-start gap-3 min-h-[48px] py-4 text-base text-fg-muted rounded-2xl border-dashed"
              onClick={openAdd}
            >
              <Plus size={22} />
              Add new store
            </Button>
          </div>
        )}

        {isFormView && (
          <Form {...form}>
            <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-5 mt-2">
              <FormField
                name="backendUrl"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-fg-muted">
                      API URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://api.example.com"
                        className="py-6 text-base rounded-xl border-theme-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  {view === "edit" && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onDelete}
                      disabled={isSubmitting}
                      className="min-h-[48px] py-4 px-6 text-base rounded-2xl bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete store
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={isSubmitting}
                    className="min-h-[48px] py-4 px-6 text-base rounded-2xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[48px] py-4 px-6 text-base rounded-2xl text-white"
                  >
                    Save {isSubmitting ? <Loader2 className="animate-spin size-5" /> : null}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StoreSwitcherDialog;
