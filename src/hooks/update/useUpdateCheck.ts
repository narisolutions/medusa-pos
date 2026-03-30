import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "sonner";

export default function useUpdateCheck() {
  useEffect(() => {
    let cancelled = false;

    async function checkForUpdate() {
      try {
        const update = await check();
        if (cancelled || !update) return;

        toast.info(`Update v${update.version} available`, {
          description: "A new version is ready to install.",
          duration: Infinity,
          action: {
            label: "Install & restart",
            onClick: async () => {
              let contentLength = 0;
              let downloaded = 0;
              const installing = toast.loading("Downloading update… 0%");
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
                      toast.loading(`Downloading update… ${pct}%`, {
                        id: installing,
                      });
                    }
                  } else if (event.event === "Finished") {
                    toast.loading("Installing update…", { id: installing });
                  }
                });
                toast.dismiss(installing);
                await relaunch();
              } catch (err) {
                toast.dismiss(installing);
                toast.error("Update failed", {
                  description: String(err),
                });
              }
            },
          },
        });
      } catch (err) {
        console.warn("Update check failed:", err);
      }
    }

    checkForUpdate();

    return () => {
      cancelled = true;
    };
  }, []);
}
