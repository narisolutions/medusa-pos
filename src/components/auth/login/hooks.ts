import { Forms } from "@/types/form";
import { getSdk } from "@/config/medusa";
import { useUser } from "@/context/user";
import { useNavigate } from "react-router-dom";
import { getRoutes, handleErrorToast, syncAuthTokenToStore } from "@/utils/helpers";
import { AdminUser } from "@medusajs/types";
import { runPostAuthInit } from "@/hooks/auth/useAppInit";

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

      await syncAuthTokenToStore();

      const admin =
        await sdk.client.fetch<AdminUser>("/admin/users/me");

      await login(admin);
      await runPostAuthInit();

      navigate(routes.checkout);
    } catch (e: unknown) {
      console.error("Login error:", e);

      const status = (e as { status?: number })?.status;
      if (status === 401 || (e instanceof Error && e.message.includes("HTTP 401"))) {
        handleErrorToast("Incorrect email or password");
      } else if (!status) {
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
