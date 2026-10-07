import { useEffect } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";
import { t } from "@/i18n";
import { logger, safeStringify } from "@/utils/logger";
import storage from "@/utils/storage";
import { useCartStore } from "@/context/cart";
import { UPDATE_CHECK_INTERVAL_MS, canInstallUpdateNow } from "@/utils/update";

const UPDATE_TOAST_ID = "update-available";

const install = async (update: Update) => {
  let contentLength = 0;
  let downloaded = 0;
  const installing = toast.loading(t("update.downloading_progress", { pct: 0 }));
  try {
    await update.downloadAndInstall((event) => {
      if (event.event === "Started" && event.data.contentLength) {
        contentLength = event.data.contentLength;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        if (contentLength > 0) {
          const pct = Math.min(100, Math.round((downloaded / contentLength) * 100));
          toast.loading(t("update.downloading_progress", { pct }), { id: installing });
        }
      } else if (event.event === "Finished") {
        toast.loading(t("update.installing"), { id: installing });
      }
    });
    toast.dismiss(installing);
    // The restart bypasses the store plugin's exit-save, so force a write.
    await storage.flush();
    await relaunch();
  } catch (err) {
    toast.dismiss(installing);
    toast.error(t("update.failed_title"), { description: String(err) });
  }
};

/** Offers an available update, never restarting the app in the middle of a sale. */
const announce = (update: Update) => {
  toast.info(t("update.available_title", { version: update.version }), {
    id: UPDATE_TOAST_ID,
    description: t("update.available_description"),
    duration: Infinity,
    action: {
      label: t("update.install_restart_button"),
      onClick: () => {
        const { items, draftOrderId } = useCartStore.getState();
        if (!canInstallUpdateNow({ itemCount: items.length, draftOrderId })) {
          toast.warning(t("update.finish_sale_first"));
          // The action closed the offer; keep it on screen for after the sale.
          setTimeout(() => announce(update), 0);
          return;
        }
        void install(update);
      },
    },
  });
};

const useUpdateCheck = () => {
  useEffect(() => {
    if (import.meta.env.DEV) return;

    let cancelled = false;
    let announcedVersion: string | null = null;

    const checkForUpdate = async () => {
      try {
        const update = await check();
        // A version already offered is not offered again on the next check.
        if (cancelled || !update || update.version === announcedVersion) return;
        announcedVersion = update.version;
        announce(update);
      } catch (err) {
        void logger.warn(`Update check failed: ${safeStringify(err)}`);
      }
    };

    void checkForUpdate();
    const timer = setInterval(() => void checkForUpdate(), UPDATE_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
};

export { useUpdateCheck };
