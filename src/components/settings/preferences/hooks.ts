import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { t } from "@/i18n";
import { Forms } from "@/types/form";
import schemas from "@/utils/schemas";
import { coercedZodResolver } from "@/utils/schemas/resolver";
import {
  initDateTimePrefs,
  initCurrencyPrefs,
  DEFAULT_PREFERENCES,
  loadPreferences,
  updatePreferences,
} from "@/utils/settings/preferences";
import { useTheme } from "@/context/theme";
import type { ThemeMode, LanguageMode } from "@/types/preferences";
import { setLocale } from "@/i18n";
import { REGISTER_CONFIG_CHANGED_EVENT } from "@/context/register";

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
  language: DEFAULT_PREFERENCES.language,
  registerEnabled: DEFAULT_PREFERENCES.register.enabled,
  registerCutoffHour: DEFAULT_PREFERENCES.register.dayCutoffHour,
  registerDiscrepancyThreshold: DEFAULT_PREFERENCES.register.discrepancyThreshold,
  cashRoundingEnabled: DEFAULT_PREFERENCES.currency.cashRounding.enabled,
  cashRoundingIncrement: DEFAULT_PREFERENCES.currency.cashRounding.increment,
};

export const usePreferencesSettings = () => {
  const form = useForm<Forms["PreferencesSettings"]>({
    resolver: coercedZodResolver(schemas.preferencesSettings),
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
        language: prefs.language,
        registerEnabled: prefs.register.enabled,
        registerCutoffHour: prefs.register.dayCutoffHour,
        registerDiscrepancyThreshold: prefs.register.discrepancyThreshold,
        cashRoundingEnabled: prefs.currency.cashRounding.enabled,
        cashRoundingIncrement: prefs.currency.cashRounding.increment,
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
      void setLocale(mode);
    },
    [form],
  );

  const onSubmit = useCallback(
    async (data: Forms["PreferencesSettings"]) => {
      setIsSubmitting(true);
      try {
        const dateTime = { dateFormat: data.dateFormat, timeFormat: data.timeFormat } as const;
        const currency = {
          symbolPosition: data.symbolPosition,
          decimalSeparator: data.decimalSeparator,
          cashRounding: {
            enabled: data.cashRoundingEnabled,
            increment: data.cashRoundingIncrement,
          },
        } as const;
        const display = { startFullscreen: data.startFullscreen };
        const appearance = { themeMode: data.themeMode };
        const language = data.language;
        const register = {
          enabled: data.registerEnabled,
          dayCutoffHour: data.registerCutoffHour,
          discrepancyThreshold: data.registerDiscrepancyThreshold,
        };

        await updatePreferences({ dateTime, currency, display, appearance, language, register });

        initDateTimePrefs(dateTime);
        initCurrencyPrefs(currency);
        setThemeMode(data.themeMode);
        await setLocale(language);
        // Let the live RegisterProvider pick up the new config immediately.
        window.dispatchEvent(new Event(REGISTER_CONFIG_CHANGED_EVENT));

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

  return {
    form,
    isDirty,
    isSubmitting,
    handleSubmit,
    onSubmit,
    isTauri,
    handleThemeModeChange,
    handleLanguageChange,
  };
};
