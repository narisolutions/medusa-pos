import { useEffect, useState, useCallback } from "react";
import { useChange } from "./hooks/utils/useChange";
import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./config/query";
import { Toaster } from "sonner";
import Backdrop from "./components/base/backdrop";
import BootEscapeOverlay from "./components/base/boot-escape-overlay";
import useAppInit from "./hooks/auth/useAppInit";
import useApplyStoreTheme from "./hooks/ui/useApplyStoreTheme";
import useApplyTheme from "./hooks/ui/useApplyTheme";
import useUpdateCheck from "./hooks/update/useUpdateCheck";
import useFullscreenToggle from "./hooks/ui/useFullscreenToggle";
import { useUser } from "./context/user";
import { VirtualKeyboardProvider } from "./context/virtual-keyboard";
import constants from "./utils/constants";

function AppContent() {
  useApplyTheme();
  useApplyStoreTheme();
  useUpdateCheck();
  useFullscreenToggle();
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </>
  );
}

function App() {
  const { bootLoading, bootMessage, retry } = useAppInit();
  const globalLoading = useUser((state) => state.globalLoading);
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useChange(bootLoading, () => {
    if (!bootLoading) setBootTimedOut(false);
  });

  useEffect(() => {
    if (!bootLoading) {
      return;
    }

    const timer = setTimeout(() => setBootTimedOut(true), constants.BOOT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [bootLoading]);

  const handleRetry = useCallback(() => {
    setBootTimedOut(false);
    retry();
  }, [retry]);

  return (
    <VirtualKeyboardProvider>
      <QueryClientProvider client={queryClient}>
        {!bootLoading && <AppContent />}
        {bootLoading && !bootTimedOut && <Backdrop loading showLogo message={bootMessage} />}
        {bootLoading && bootTimedOut && <BootEscapeOverlay onRetry={handleRetry} />}
        {!bootLoading && globalLoading && <Backdrop loading />}
      </QueryClientProvider>
    </VirtualKeyboardProvider>
  );
}

export default App;
