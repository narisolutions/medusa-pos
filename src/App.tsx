import { useEffect, useState, useCallback } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./config/query";
import { Toaster } from "sonner";
import Backdrop from "./components/base/backdrop";
import BootEscapeOverlay from "./components/base/boot-escape-overlay";
import useAppInit from "./hooks/auth/useAppInit";
import useApplyStoreTheme from "./hooks/ui/useApplyStoreTheme";
import useUpdateCheck from "./hooks/useUpdateCheck";
import { useUser } from "./context/user";
import constants from "./utils/constants";

function AppContent() {
  useApplyStoreTheme();
  useUpdateCheck();
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </>
  );
}

function App() {
  const { bootLoading, retry } = useAppInit();
  const globalLoading = useUser((state) => state.globalLoading);
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useEffect(() => {
    if (!bootLoading) {
      setBootTimedOut(false);
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
    <QueryClientProvider client={queryClient}>
      {!bootLoading && <AppContent />}
      {bootLoading && !bootTimedOut && <Backdrop loading showLogo />}
      {bootLoading && bootTimedOut && <BootEscapeOverlay onRetry={handleRetry} />}
      {!bootLoading && globalLoading && <Backdrop loading />}
    </QueryClientProvider>
  );
}

export default App;
