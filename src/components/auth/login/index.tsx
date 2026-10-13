import React, { Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import schemas from "@/utils/schemas";
import { Forms } from "@/types/form";
import { useLogin } from "./hooks";
import { useStoreManager } from "@/context/store-manager";
import StoreSelectorBox from "@/components/auth/store-selector";
import { useTranslation } from "@/i18n";
import { isStagingBackend } from "@/utils/auth/environment";

const Login: React.FC = () => {
  const form = useForm<Forms["Login"]>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(schemas.login),
  });

  const { control, handleSubmit } = form;
  const { activeStore } = useStoreManager();
  const { t } = useTranslation();

  const isConfigured = Boolean(activeStore);
  const isBackendStaging = isStagingBackend(activeStore?.backendUrl);

  const { onLogin, error, clearError } = useLogin(isConfigured);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Fragment>
      <div className="bg-surface/90 p-12 rounded-3xl shadow-2xl w-full border border-theme-border backdrop-blur-sm transition-all duration-300 relative">

        <div className="mb-8 flex flex-col gap-4 text-center">
          <h2 className="text-3xl font-semibold text-fg tracking-tight drop-shadow-sm">
            {t("auth.sign_in")}
          </h2>
          {isConfigured && (
            <StatusChip intent={isBackendStaging ? "warning" : "neutral"} icon={null} className="self-center">
              {isBackendStaging ? t("auth.staging") : t("auth.production")}
            </StatusChip>
          )}
          <StoreSelectorBox />
          {!isConfigured && (
            <div role="alert" className="mx-auto w-full max-w-md flex items-center gap-4 px-4 py-3 rounded-lg border border-warning bg-warning-subtle">
              <TriangleAlert className="size-6 shrink-0 text-warning-text" />
              <p className="text-left text-base font-semibold text-warning-text">
                {t("auth.add_store_hint")}
              </p>
            </div>
          )}
        </div>

        <Form {...form}>
          <form
            id="login-form"
            onSubmit={handleSubmit(onLogin)}
            onChangeCapture={clearError}
            className="flex flex-col gap-4"
          >
            <FormField
              name="email"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      autoComplete="username"
                      placeholder={t("auth.email")}
                      aria-label={t("auth.email")}
                      className="h-tap-lg px-4 text-lg"
                    />
                  </FormControl>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder={t("auth.password")}
                        aria-label={t("auth.password")}
                        className="h-tap-lg px-4 pr-14 text-lg"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        aria-pressed={showPassword}
                        aria-label={showPassword ? t("auth.hide_password") : t("auth.show_password")}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            {error && (
              <p role="alert" className="flex items-center gap-2 rounded-lg border border-danger bg-danger-subtle px-4 py-3 text-base font-medium text-danger-text">
                <TriangleAlert className="size-5 shrink-0" />
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="xl"
              className="mt-2 w-full text-xl"
              disabled={!isConfigured}
              loading={form.formState.isSubmitting}
            >
              {t("auth.sign_in")}
            </Button>
          </form>
        </Form>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="mt-4 text-fg-muted hover:text-fg"
        onClick={() => getCurrentWindow().close()}
      >
        {t("auth.exit_application")}
      </Button>
    </Fragment>
  );
};

export default Login;
