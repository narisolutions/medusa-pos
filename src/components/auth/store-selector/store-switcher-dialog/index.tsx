import React from "react";
import { ChevronLeft, Loader2, Pencil, Plus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MedusaIcon from "@/assets/icons/medusa";
import { useTranslation } from "@/i18n";
import { useStoreSwitcher } from "./hooks";

interface Props {
  open: boolean;
  onClose: () => void;
}

const StoreSwitcherDialog: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const {
    stores,
    activeStoreId,
    view,
    isFormView,
    selectedStoreId,
    setSelectedStoreId,
    scheme,
    setScheme,
    host,
    setHost,
    form,
    control,
    isSubmitting,
    submit,
    openAdd,
    openEdit,
    goBack,
    handleSelect,
    onDelete,
  } = useStoreSwitcher(open, onClose);

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
            {view === "list" && t("auth.select_store_title")}
            {view === "add" && t("auth.add_store_title")}
            {view === "edit" && t("auth.edit_store_title")}
          </DialogTitle>
        </DialogHeader>

        {view === "list" && (
          <div className="mt-2 min-w-0">
            <div className="flex flex-col gap-3 max-h-[52vh] overflow-y-auto pr-1">
              {stores.map((store) => {
                const isSelected = store.id === selectedStoreId;
                const isActive = store.id === activeStoreId;
                return (
                  <div
                    key={store.id}
                    className={`flex items-center gap-4 rounded-2xl px-5 py-5 border-2 cursor-pointer transition-colors min-h-[56px] ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-theme-border bg-surface-muted hover:border-theme-border-strong hover:bg-surface-hover active:bg-surface-hover"
                    }`}
                    onClick={() => setSelectedStoreId(store.id)}
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
                      className={`flex-1 min-w-0 text-lg font-semibold truncate ${isSelected ? "text-primary" : "text-fg"}`}
                    >
                      {store.name}
                      {isActive ? (
                        <span className="ml-2 text-sm font-medium text-fg-subtle">({t("auth.active_badge")})</span>
                      ) : null}
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
                className="mt-1 w-full justify-start gap-3 min-h-[56px] py-4 text-base text-fg-muted rounded-2xl border-dashed"
                onClick={openAdd}
              >
                <Plus size={22} />
                {t("auth.add_new_store")}
              </Button>
            </div>

            <div className="mt-4 border-t border-theme-border pt-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-[52px] px-6 text-base rounded-2xl"
                onClick={onClose}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="min-h-[52px] px-6 text-base rounded-2xl text-white"
                disabled={!selectedStoreId}
                onClick={() => {
                  const selected = stores.find((s) => s.id === selectedStoreId);
                  if (selected) void handleSelect(selected);
                }}
              >
                {t("common.select")}
              </Button>
            </div>
          </div>
        )}

        {isFormView && (
          <Form {...form}>
            <form onSubmit={submit} className="flex flex-col gap-5 mt-2">
              <FormField
                name="backendUrl"
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold text-fg-muted">
                      API URL
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-stretch gap-2">
                        <Select
                          value={scheme}
                          onValueChange={(value) => {
                            const nextScheme = (value === "http" ? "http://" : "https://") as
                              | "https://"
                              | "http://";
                            setScheme(nextScheme);
                            field.onChange(nextScheme + host.trim());
                          }}
                        >
                          <SelectTrigger className="w-[120px] py-6 text-base rounded-xl border-theme-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="https">https://</SelectItem>
                            <SelectItem value="http">http://</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={t("auth.api_url_host_placeholder")}
                          className="flex-1 py-6 text-base rounded-xl border-theme-border"
                          value={host}
                          onChange={(e) => {
                            const value = e.target.value;
                            setHost(value);
                            field.onChange(scheme + value.trim());
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </div>
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
                      {t("auth.delete_store_button")}
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
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[48px] py-4 px-6 text-base rounded-2xl text-white"
                  >
                    {t("common.save")} {isSubmitting ? <Loader2 className="animate-spin size-5" /> : null}
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
