import { Navigate, Outlet } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useUser } from "@/context/user";
import { ROUTES } from "@/router/routes";
import { signInOutcome } from "@/router/guards";

const Auth: React.FC = () => {
  const { t } = useTranslation();
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const globalLoading = useUser((state) => state.globalLoading);

  if (signInOutcome({ isAuthenticated, globalLoading }) === "checkout") {
    return <Navigate to={ROUTES.checkout} replace />;
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-linear-to-br from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-800 bg-fixed">
      <div className="w-full max-w-lg flex flex-col items-center">
        <Outlet />
      </div>
      <span className="absolute bottom-4 right-4 text-xs text-fg-muted/50">
        {t("auth.fullscreen_hint")}
      </span>
    </div>
  );
};

export default Auth;
