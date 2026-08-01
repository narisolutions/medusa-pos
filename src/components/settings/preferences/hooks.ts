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
import { hashPin } from "@/utils/pos/register";
import { verifyManagerPin } from "@/utils/settings/preferences/pin";
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
  registerRequirePin: DEFAULT_PREFERENCES.register.requirePinToClose,
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
  // The stored manager PIN hash (if any). Managed outside the RHF form because the
  // raw PIN is hashed and never lives in form state.
  const [managerPinHash, setManagerPinHash] = useState<string | undefined>();
  // Once a PIN exists, the register controls are locked until the manager unlocks
  // them with that PIN for the current Settings visit (re-locks on remount).
  const [unlocked, setUnlocked] = useState(false);
  const setThemeMode = useTheme((s) => s.setThemeMode);

  const hasManagerPin = !!managerPinHash;
  const registerLocked = hasManagerPin && !unlocked;

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
        registerRequirePin: prefs.register.requirePinToClose,
        cashRoundingEnabled: prefs.currency.cashRounding.enabled,
        cashRoundingIncrement: prefs.currency.cashRounding.increment,
      });
      setManagerPinHash(prefs.register.managerPinHash);
    };
    load();
  }, [reset]);

  const handleSetManagerPin = useCallback(async (rawPin: string) => {
    const hash = await hashPin(rawPin);
    await updatePreferences({ register: { managerPinHash: hash } });
    setManagerPinHash(hash);
    // Setting (or changing) the PIN implies authorization for this visit.
    setUnlocked(true);
    window.dispatchEvent(new Event(REGISTER_CONFIG_CHANGED_EVENT));
  }, []);

  const handleClearManagerPin = useCallback(async () => {
    await updatePreferences({ register: { managerPinHash: undefined } });
    setManagerPinHash(undefined);
    window.dispatchEvent(new Event(REGISTER_CONFIG_CHANGED_EVENT));
  }, []);

  // Verify the entered PIN against the stored hash; unlock the section on success.
  const unlockRegister = useCallback(
    async (rawPin: string): Promise<boolean> => {
      if (!managerPinHash) return false;
      const ok = await verifyManagerPin(rawPin, managerPinHash);
      if (ok) setUnlocked(true);
      return ok;
    },
    [managerPinHash],
  );

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
        // managerPinHash is intentionally omitted so the existing PIN is preserved
        // (it is managed separately via handleSetManagerPin / handleClearManagerPin).
        const register = {
          enabled: data.registerEnabled,
          dayCutoffHour: data.registerCutoffHour,
          discrepancyThreshold: data.registerDiscrepancyThreshold,
          requirePinToClose: data.registerRequirePin,
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
    hasManagerPin,
    handleSetManagerPin,
    handleClearManagerPin,
    registerLocked,
    unlockRegister,
  };
};
