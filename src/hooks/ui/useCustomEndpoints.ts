import { useState, useEffect } from "react";
import { loadPreferences } from "@/utils/settings/preferences";

export function useCustomEndpoints() {
  const [customEndpointsEnabled, setCustomEndpointsEnabled] = useState(true);

  useEffect(() => {
    loadPreferences().then((prefs) => {
      setCustomEndpointsEnabled(prefs.integration.customEndpointsEnabled);
    });
  }, []);

  return { customEndpointsEnabled };
}
