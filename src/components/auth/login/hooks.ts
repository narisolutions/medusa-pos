import { logger, safeStringify } from "@/utils/logger";
import { Forms } from "@/types/form";
import { getSdk } from "@/config/medusa";
import { useUser } from "@/context/user";
import { useNavigate } from "react-router-dom";
import { getRoutes, handleErrorToast, isNetworkError } from "@/utils/helpers";
import { AdminUser } from "@medusajs/types";
import { runPostAuthInit } from "@/hooks/auth/postAuthInit";

const useLogin = (isConfigured: boolean) => {
  const setGlobalLoading = useUser((state) => state.setGlobalLoading);
  const login = useUser((state) => state.login);
  const navigate = useNavigate();
  const routes = getRoutes();

  const onLogin = async (data: Forms["Login"]) => {
    if (!isConfigured) return;

    try {
      setGlobalLoading(true);
      const { email, password } = data;

      const sdk = getSdk();

      await sdk.auth.login("user", "emailpass", {
        email,
        password,
      });

      const admin =
        await sdk.client.fetch<AdminUser>("/admin/users/me");

      await login(admin);
      await runPostAuthInit();

      navigate(routes.checkout);
    } catch (e: unknown) {
      void logger.error(`Login error: ${safeStringify(e)}`);

      const status = (e as { status?: number })?.status;
      if (status === 401 || (e instanceof Error && e.message.includes("HTTP 401"))) {
        handleErrorToast("Incorrect email or password");
      } else if (!status && (isNetworkError(e) || (e instanceof Error && e.name === "AbortError"))) {
        // Only a request that got no answer (or timed out) means the backend is unreachable;
        // any other failure shows its own reason instead of blaming the connection.
        handleErrorToast("Backend unreachable — please check your connection or switch stores.");
      } else {
        handleErrorToast(e);
      }
    } finally {
      setGlobalLoading(false);
    }
  };

  return { onLogin };
};

export { useLogin };
