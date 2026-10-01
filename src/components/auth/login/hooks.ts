import { logger, safeStringify } from "@/utils/logger";
import { Forms } from "@/types/form";
import { getSdk } from "@/config/medusa";
import { useUser } from "@/context/user";
import { useNavigate } from "react-router-dom";
import { handleErrorToast, isNetworkError } from "@/utils/helpers";
import { ROUTES } from "@/router/routes";
import { AdminUser } from "@medusajs/types";
import { runPostAuthInit } from "@/utils/auth/post-auth-init";

const useLogin = (isConfigured: boolean) => {
  const setGlobalLoading = useUser((state) => state.setGlobalLoading);
  const login = useUser((state) => state.login);
  const navigate = useNavigate();

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

      navigate(ROUTES.checkout);
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
