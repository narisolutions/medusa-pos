import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Forms } from "@/types/form";
import { useQueryStore, useUpdateStore } from "@/hooks/queries/useQueryStore";
import { useStore } from "@/context/store";
import {
  getStoreMetadata,
  DEFAULT_PAYMENT_METHODS,
  buildStoreMetadataPayload,
} from "@/utils/store/metadata";
import storage from "@/utils/storage";
import constants from "@/utils/constants";

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
};

async function pickAndConvertLogo(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    title: "Select Store Logo",
    filters: [
      { name: "Image", extensions: ["png", "jpg", "jpeg", "svg", "webp"] },
    ],
  });

  if (!selected) return null;

  const fs = await import("@tauri-apps/plugin-fs");
  const bytes = await fs.readFile(selected as string);

  if (bytes.byteLength > constants.MAX_LOGO_BYTES) {
    throw new Error("Logo image must be smaller than 256 KB");
  }

  const ext = (selected as string).split(".").pop()?.toLowerCase() ?? "png";
  const mime = MIME_MAP[ext] ?? "image/png";
  const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return `data:${mime};base64,${base64}`;
}

interface Props {
  form: ReturnType<typeof useForm<Forms["StoreSettings"]>>;
}

interface UseStoreSettingsReturn {
  currentLogoUrl: string | undefined;
  isPickingLogo: boolean;
  isLoading: boolean;
  onSubmit: (data: Forms["StoreSettings"]) => Promise<void>;
  handlePickLogo: () => Promise<void>;
  handleRemoveLogo: () => void;
}

const useStoreSettings = ({ form }: Props): UseStoreSettingsReturn => {
  const { data: store, isLoading } = useQueryStore();
  const { mutateAsync: updateStore } = useUpdateStore();
  const setNeedsSetup = useStore((s) => s.setNeedsSetup);
  const [isPickingLogo, setIsPickingLogo] = useState(false);

  const { reset, watch, setValue } = form;

  const currentLogoUrl = watch("logoUrl");

  // Populate form when Medusa store data loads
  useEffect(() => {
    if (!store) return;
    const meta = getStoreMetadata(store);
    reset({
      storeName: store.name ?? "",
      brandName: meta.brand_name ?? "",
      logoUrl: meta.logo_url ?? undefined,
      primaryColor: meta.primary_color ?? "",
      secondaryColor: meta.secondary_color ?? "",
      fontSize: meta.font_size ?? "16",
      storeAddress: meta.store_address ?? "",
      storeAddress2: meta.store_address_2 ?? "",
      storePhone: meta.store_phone ?? "",
      paymentMethods:
        meta.payment_methods?.length ? meta.payment_methods : DEFAULT_PAYMENT_METHODS,
    });
  }, [store, reset]);

  const onSubmit = useCallback(
    async (data: Forms["StoreSettings"]) => {
      if (!store?.id) return;

      const pos = {
        brand_name: data.brandName,
        logo_url: data.logoUrl ?? undefined,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        font_size: data.fontSize,
        store_address: data.storeAddress,
        store_address_2: data.storeAddress2 ?? undefined,
        store_phone: data.storePhone,
        payment_methods: data.paymentMethods ?? undefined,
      };
      await updateStore({
        storeId: store.id,
        payload: {
          name: data.storeName,
          metadata: buildStoreMetadataPayload(
            store.metadata as Record<string, unknown>,
            pos
          ),
        },
      });

      // Save logo to local disk for thermal printer (Tauri needs file path)
      if (data.logoUrl) {
        try {
          const match = data.logoUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (match) {
            const ext = match[1] === "jpeg" ? "jpg" : match[1];
            const base64 = match[2];
            const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
            const { invoke } = await import("@tauri-apps/api/core");
            await invoke("save_logo_file", {
              bytes: Array.from(bytes),
              extension: ext,
            });
          }
        } catch (err) {
          console.warn("Failed to save logo for printer:", err);
        }
      } else {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("delete_logo_file");
        } catch {
          // Ignore if no logo to delete
        }
      }

      setNeedsSetup(false);
      await storage.removeItem("store_setup_dismissed");
      toast.success("Store settings saved");
    },
    [store, updateStore, setNeedsSetup]
  );

  const handlePickLogo = useCallback(async () => {
    setIsPickingLogo(true);
    try {
      const logoUrl = await pickAndConvertLogo();
      if (logoUrl) setValue("logoUrl", logoUrl, { shouldDirty: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load logo image"
      );
    } finally {
      setIsPickingLogo(false);
    }
  }, [setValue]);

  const handleRemoveLogo = useCallback(() => {
    setValue("logoUrl", undefined, { shouldDirty: true });
  }, [setValue]);

  return {
    currentLogoUrl,
    isPickingLogo,
    isLoading,
    onSubmit,
    handlePickLogo,
    handleRemoveLogo,
  };
};

export { useStoreSettings };
