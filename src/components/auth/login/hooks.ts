import { logger, safeStringify } from "@/utils/logger";
import { Forms } from "@/types/form";
import { getSdk } from "@/config/medusa";
import { useUser } from "@/context/user";
import { useNavigate } from "react-router-dom";
import { handleErrorToast, isNetworkError } from "@/utils/helpers";
import { ROUTES } from "@/router/routes";
import { AdminUser } from "@medusajs/types";
import { runPostAuthInit } from "@/utils/auth/post-auth-init";
import { useState } from "react";
import { t } from "@/i18n";

const useLogin = (isConfigured: boolean) => {
  const setGlobalLoading = useUser((state) => state.setGlobalLoading);
  const login = useUser((state) => state.login);
  const navigate = useNavigate();
  // Shown in the form, where the operator is looking; cleared as soon as they edit.
  const [error, setError] = useState<string | null>(null);

  const onLogin = async (data: Forms["Login"]) => {
    if (!isConfigured) return;
    setError(null);

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
        setError(t("auth.incorrect_credentials"));
      } else if (!status && (isNetworkError(e) || (e instanceof Error && e.name === "AbortError"))) {
        // Only a request that got no answer (or timed out) means the backend is unreachable;
        // any other failure shows its own reason instead of blaming the connection.
        setError(t("auth.backend_unreachable"));
      } else {
        handleErrorToast(e);
      }
    } finally {
      setGlobalLoading(false);
    }
  };

  return { onLogin, error, clearError: () => setError(null) };
};

export { useLogin };
