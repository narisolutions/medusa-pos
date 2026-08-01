import { logger, safeStringify } from "@/utils/logger";
import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";
import { t } from "@/i18n";

export default function useUpdateCheck() {
  useEffect(() => {
    let cancelled = false;

    async function checkForUpdate() {
      if (import.meta.env.DEV) return;
      try {
        const update = await check();
        if (cancelled || !update) return;

        toast.info(t("update.available_title", { version: update.version }), {
          description: t("update.available_description"),
          duration: Infinity,
          action: {
            label: t("update.install_restart_button"),
            onClick: async () => {
              let contentLength = 0;
              let downloaded = 0;
              const installing = toast.loading(
                t("update.downloading_progress", { pct: 0 }),
              );
              try {
                await update.downloadAndInstall((event) => {
                  if (event.event === "Started" && event.data.contentLength) {
                    contentLength = event.data.contentLength;
                  } else if (event.event === "Progress") {
                    downloaded += event.data.chunkLength;
                    if (contentLength > 0) {
                      const pct = Math.min(
                        100,
                        Math.round((downloaded / contentLength) * 100),
                      );
                      toast.loading(t("update.downloading_progress", { pct }), {
                        id: installing,
                      });
                    }
                  } else if (event.event === "Finished") {
                    toast.loading(t("update.installing"), { id: installing });
                  }
                });
                toast.dismiss(installing);
                await relaunch();
              } catch (err) {
                toast.dismiss(installing);
                toast.error(t("update.failed_title"), {
                  description: String(err),
                });
              }
            },
          },
        });
      } catch (err) {
        void logger.warn(`Update check failed: ${safeStringify(err)}`);
      }
    }

    checkForUpdate();

    return () => {
      cancelled = true;
    };
  }, []);
}
