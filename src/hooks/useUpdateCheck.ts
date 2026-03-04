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
              const installing = toast.loading("Downloading update...");
              try {
                await update.downloadAndInstall();
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
