import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { loadPreferences, updatePreferences } from "@/utils/preferences";
import { DEFAULT_PREFERENCES } from "@/utils/preferences/defaults";

const isTauri = "__TAURI_INTERNALS__" in window;

async function setFullscreen(enabled: boolean): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFullscreen(enabled);
}

const DisplaySettings: React.FC = () => {
  const [startFullscreen, setStartFullscreen] = useState(
    DEFAULT_PREFERENCES.display.startFullscreen
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const prefs = await loadPreferences();
      setStartFullscreen(prefs.display.startFullscreen);
      setIsLoading(false);
    };
    load();
  }, []);

  const handleFullscreenToggle = useCallback(async (checked: boolean) => {
    setStartFullscreen(checked);
    try {
      await updatePreferences({ display: { startFullscreen: checked } });
      if (isTauri) {
        await setFullscreen(checked);
      }
      toast.success(
        checked ? "Fullscreen enabled" : "Fullscreen disabled"
      );
    } catch {
      setStartFullscreen(!checked);
      toast.error("Failed to update display settings");
    }
  }, []);

  if (!isTauri) {
    return (
      <p className="text-base text-gray-500">
        Display settings are only available in the desktop app.
      </p>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between max-w-2xl">
        <div className="space-y-1">
          <Label htmlFor="fullscreen-toggle" className="text-lg font-medium">
            Start in Fullscreen
          </Label>
          <p className="text-sm text-gray-500">
            Launch the application in fullscreen mode
          </p>
        </div>
        <Switch
          id="fullscreen-toggle"
          checked={startFullscreen}
          onCheckedChange={handleFullscreenToggle}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default DisplaySettings;
