import { useEffect } from "react";
import { useRouteError } from "react-router-dom";
import { Frown, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { logger, safeStringify } from "@/utils/logger";

interface RouteErrorProps {
  fullScreen?: boolean;
}

// The desktop app has no browser reload button, so this screen must always offer a way out.
const reloadApp = () => window.location.replace(window.location.pathname);

const RouteError = ({ fullScreen = false }: RouteErrorProps) => {
  const error = useRouteError();
  const { t } = useTranslation();

  useEffect(() => {
    void logger.error(`Route crashed: ${safeStringify(error)}`);
  }, [error]);

  return (
    <div
      className={`flex w-full items-center justify-center p-6 ${fullScreen ? "min-h-screen bg-surface" : "h-full"}`}
    >
      <div className="w-full max-w-md text-center p-8 bg-surface border border-theme-border rounded-xl shadow-md">
        <div className="flex items-center justify-center gap-3 text-orange-500 mb-3">
          <Frown className="w-8 h-8" />
          <p className="text-xl font-medium">{t("errors.something_went_wrong_title")}</p>
        </div>
        <p className="text-base text-fg-muted mb-6">
          {t("errors.something_went_wrong_description")}
        </p>
        <Button className="h-14 w-full text-lg" onClick={reloadApp}>
          <RefreshCcw className="w-5 h-5 mr-2" />
          {t("errors.refresh_page_button")}
        </Button>
      </div>
    </div>
  );
};

export default RouteError;
