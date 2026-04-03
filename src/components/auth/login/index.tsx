import React, { Fragment } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
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

const Login: React.FC = () => {
  const form = useForm<Forms["Login"]>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(schemas.login),
  });

  const { control, handleSubmit } = form;
  const { activeStore } = useStoreManager();

  const isConfigured = Boolean(activeStore);
  const isBackendStaging = activeStore?.backendUrl?.includes("staging");

  const { onLogin } = useLogin(isConfigured);

  return (
    <Fragment>
      <div className="bg-surface/90 p-12 rounded-3xl shadow-2xl w-full border border-theme-border backdrop-blur-sm transition-all duration-300 relative">

        <div className="mb-8 flex flex-col gap-4 text-center">
          <h2 className="text-3xl font-semibold text-fg tracking-tight drop-shadow-sm">
            Sign in
          </h2>
          {isConfigured && (
            <span className="inline-flex items-center justify-center self-center rounded-full bg-surface-subtle px-3 text-xs font-medium text-fg-muted">
              {isBackendStaging ? "Staging" : "Production"}
            </span>
          )}
          <StoreSelectorBox />
          {!isConfigured && (
            <div className="mx-auto w-full max-w-md flex items-center gap-4 px-4 py-3 rounded-lg border border-red-100 bg-red-50 shadow-sm">
              <div className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100 text-yellow-600 text-lg">
                <TriangleAlert />
              </div>
              <p className="text-red-800 font-semibold leading-5">
                Add a store above to continue.
              </p>
            </div>
          )}
        </div>

        <Form {...form}>
          <form
            id="login-form"
            onSubmit={handleSubmit(onLogin)}
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
                      placeholder="Email"
                      className="w-full px-3 py-7 border rounded md:text-xl"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              control={control}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Password"
                      className="w-full px-3 py-7 border rounded md:text-xl"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors shadow text-white mt-4 py-8 text-xl"
              disabled={!isConfigured}
            >
              Sign in
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
        Exit application
      </Button>
    </Fragment>
  );
};

export default Login;
