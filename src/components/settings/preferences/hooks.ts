import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { t } from "@/i18n";
import { Forms } from "@/types/form";
import schemas from "@/utils/schemas";
import {
  initDateTimePrefs,
  initCurrencyPrefs,
  DEFAULT_PREFERENCES,
  loadPreferences,
  updatePreferences,
} from "@/utils/settings/preferences";
import { useTheme } from "@/context/theme";
import type { ThemeMode, LanguageMode } from "@/types/preferences";
import { i18next, resolveLocale } from "@/i18n";

const isTauri = "__TAURI_INTERNALS__" in window;

async function setFullscreen(enabled: boolean): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFullscreen(enabled);
}

const defaults: Forms["PreferencesSettings"] = {
  dateFormat: DEFAULT_PREFERENCES.dateTime.dateFormat,
  timeFormat: DEFAULT_PREFERENCES.dateTime.timeFormat,
  symbolPosition: DEFAULT_PREFERENCES.currency.symbolPosition,
  decimalSeparator: DEFAULT_PREFERENCES.currency.decimalSeparator,
  startFullscreen: DEFAULT_PREFERENCES.display.startFullscreen,
  themeMode: DEFAULT_PREFERENCES.appearance.themeMode,
  customEndpointsEnabled: DEFAULT_PREFERENCES.integration.customEndpointsEnabled,
  language: DEFAULT_PREFERENCES.language,
};

export const usePreferencesSettings = () => {
  const form = useForm<Forms["PreferencesSettings"]>({
    resolver: zodResolver(schemas.preferencesSettings),
    defaultValues: defaults,
  });

  const {
    reset,
    handleSubmit,
    formState: { isDirty },
  } = form;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const setThemeMode = useTheme((s) => s.setThemeMode);

  useEffect(() => {
    const load = async () => {
      const prefs = await loadPreferences();
      reset({
        dateFormat: prefs.dateTime.dateFormat,
        timeFormat: prefs.dateTime.timeFormat,
        symbolPosition: prefs.currency.symbolPosition,
        decimalSeparator: prefs.currency.decimalSeparator,
        startFullscreen: prefs.display.startFullscreen,
        themeMode: prefs.appearance.themeMode,
        customEndpointsEnabled: prefs.integration.customEndpointsEnabled,
        language: prefs.language,
      });
    };
    load();
  }, [reset]);

  const handleThemeModeChange = useCallback(
    (mode: ThemeMode) => {
      form.setValue("themeMode", mode, { shouldDirty: true });
      setThemeMode(mode);
    },
    [form, setThemeMode],
  );

  const handleLanguageChange = useCallback(
    (mode: LanguageMode) => {
      form.setValue("language", mode, { shouldDirty: true });
      i18next.changeLanguage(resolveLocale(mode));
    },
    [form],
  );

  const onSubmit = useCallback(
    async (data: Forms["PreferencesSettings"]) => {
      setIsSubmitting(true);
      try {
        const dateTime = { dateFormat: data.dateFormat, timeFormat: data.timeFormat } as const;
        const currency = { symbolPosition: data.symbolPosition, decimalSeparator: data.decimalSeparator } as const;
        const display = { startFullscreen: data.startFullscreen };
        const appearance = { themeMode: data.themeMode };
        const integration = { customEndpointsEnabled: data.customEndpointsEnabled };
        const language = data.language;

        await updatePreferences({ dateTime, currency, display, appearance, integration, language });

        initDateTimePrefs(dateTime);
        initCurrencyPrefs(currency);
        setThemeMode(data.themeMode);
        i18next.changeLanguage(resolveLocale(language));

        if (isTauri) {
          await setFullscreen(data.startFullscreen);
        }

        reset(data);
        toast.success(t("settings.preferences.saved"));
      } catch {
        toast.error(t("settings.preferences.save_error"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset, setThemeMode],
  );

  return { form, isDirty, isSubmitting, handleSubmit, onSubmit, isTauri, handleThemeModeChange, handleLanguageChange };
};
