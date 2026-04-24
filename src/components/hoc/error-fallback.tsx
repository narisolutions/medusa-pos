import { Frown, RefreshCcw } from "lucide-react";
import { FallbackProps } from "react-error-boundary";
import { Button } from "../ui/button";
import { handleErrorToast } from "@/utils/helpers";
import { useTranslation } from "@/i18n";

type Config = {
  component: string;
};

const ErrorFallback: React.FC<FallbackProps & { config: Config }> = ({
  error,
}) => {
  const { t } = useTranslation();
  handleErrorToast(error || new Error(t("errors.something_went_wrong_toast")));
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center p-6 bg-surface border border-theme-border rounded-xl shadow-md w-[90%] max-w-sm">
      <div className="flex items-center justify-center gap-3 text-orange-500 mb-3">
        <Frown className="w-7 h-7" />
        <p className="text-lg font-medium">{t("errors.something_went_wrong_title")}</p>
      </div>

      <p className="text-fg-muted mb-4">
        {t("errors.something_went_wrong_description")}
      </p>

      <Button
        variant="outline"
        className="border-orange-500 text-orange-500 hover:bg-orange-50"
        onClick={() => window.location.reload()}
      >
        <RefreshCcw className="w-4 h-4 mr-2" />
        {t("errors.refresh_page_button")}
      </Button>

      {error ? (
        <p className="bg-orange-50 border border-orange-200 text-orange-400 rounded p-3 text-sm mt-4">
          {String(error)}
        </p>
      ) : null}
    </div>
  );
};

export default ErrorFallback;

