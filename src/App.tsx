import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./config/query";
import { Toaster } from "sonner";
import Backdrop from "./components/base/backdrop";
import useAppInit from "./hooks/auth/useAppInit";
import useApplyStoreTheme from "./hooks/ui/useApplyStoreTheme";
import { useUser } from "./context/user";

// Rendered inside QueryClientProvider so hooks like useQueryStore are available
function AppContent() {
  useApplyStoreTheme();
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </>
  );
}

function App() {
  const { bootLoading } = useAppInit();
  const globalLoading = useUser((state) => state.globalLoading);

  return (
    <QueryClientProvider client={queryClient}>
      {!bootLoading && <AppContent />}
      {(bootLoading || globalLoading) && <Backdrop loading />}
    </QueryClientProvider>
  );
}

export default App;
