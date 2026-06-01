import React from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePreferencesSettings } from "./hooks";
import type { ThemeMode, LanguageMode } from "@/types/preferences";
import { useTranslation } from "@/i18n";

const LANGUAGE_OPTIONS: { value: LanguageMode; label: string }[] = [
  { value: "system", label: "system" },
  { value: "en", label: "English" },
  { value: "ka", label: "ქართული" },
  { value: "pl", label: "Polski" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "sv", label: "Svenska" },
];

const PreferencesSettings: React.FC = () => {
  const { form, isDirty, isSubmitting, handleSubmit, onSubmit, isTauri, handleThemeModeChange, handleLanguageChange } =
    usePreferencesSettings();
  const { t } = useTranslation();

  const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
    { value: "light", label: t("settings.preferences.theme_light") },
    { value: "dark", label: t("settings.preferences.theme_dark") },
    { value: "system", label: t("settings.preferences.theme_system") },
  ];

  const { control, watch } = form;
  const currentTheme = watch("themeMode");

  return (
    <div className="flex flex-col h-full min-h-0">
      <p className="text-fg-muted text-sm mb-4">
        {t("settings.preferences.description")}
      </p>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col space-y-5 max-w-2xl min-h-0"
        >
          {/* Appearance (language + theme + fullscreen) */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-fg">
              {t("settings.preferences.appearance")}
            </legend>

            <FormField
              control={control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">{t("settings.preferences.language")}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value as LanguageMode);
                      handleLanguageChange(value as LanguageMode);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 text-base px-4">
                        <span>
                          {field.value === "system"
                            ? t("settings.preferences.language_system")
                            : (LANGUAGE_OPTIONS.find((o) => o.value === field.value)?.label ?? field.value)}
                        </span>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {value === "system" ? t("settings.preferences.language_system") : label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="themeMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">{t("settings.preferences.theme")}</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {THEME_OPTIONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            field.onChange(value);
                            handleThemeModeChange(value);
                          }}
                          className={`h-11 px-5 text-base font-medium rounded-md border transition-colors ${
                            currentTheme === value
                              ? "bg-primary text-white border-primary"
                              : "bg-surface border-theme-border text-fg-muted hover:bg-surface-hover"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {isTauri && (
              <FormField
                control={control}
                name="startFullscreen"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-medium">
                          {t("settings.preferences.fullscreen")}
                        </FormLabel>
                        <p className="text-sm text-fg-muted">
                          {t("settings.preferences.fullscreen_description")}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            )}
          </fieldset>

          <div className="border-t border-theme-border" />

          {/* Date & Time */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-fg">
              {t("settings.preferences.date_time")}
            </legend>

            <FormField
              control={control}
              name="dateFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("settings.preferences.date_format")}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base px-4">
                        {field.value === "system" && (
                          <span>{t("settings.preferences.date_system")}</span>
                        )}
                        {field.value === "DD.MM.YYYY" && (
                          <span>{t("settings.preferences.date_ddmmyyyy")}</span>
                        )}
                        {field.value === "YYYY-MM-DD" && (
                          <span>{t("settings.preferences.date_yyyymmdd")}</span>
                        )}
                        {field.value === "MM/DD/YYYY" && (
                          <span>{t("settings.preferences.date_mmddyyyy")}</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="system">{t("settings.preferences.date_system")}</SelectItem>
                      <SelectItem value="DD.MM.YYYY">
                        {t("settings.preferences.date_ddmmyyyy")}
                      </SelectItem>
                      <SelectItem value="YYYY-MM-DD">
                        {t("settings.preferences.date_yyyymmdd")}
                      </SelectItem>
                      <SelectItem value="MM/DD/YYYY">
                        {t("settings.preferences.date_mmddyyyy")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="timeFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("settings.preferences.time_format")}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base px-4">
                        {field.value === "system" && (
                          <span>{t("settings.preferences.time_system")}</span>
                        )}
                        {field.value === "24h" && (
                          <span>{t("settings.preferences.time_24h")}</span>
                        )}
                        {field.value === "12h" && (
                          <span>{t("settings.preferences.time_12h")}</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="system">{t("settings.preferences.time_system")}</SelectItem>
                      <SelectItem value="24h">{t("settings.preferences.time_24h")}</SelectItem>
                      <SelectItem value="12h">{t("settings.preferences.time_12h")}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </fieldset>

          <div className="border-t border-theme-border" />

          {/* Currency Format */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-fg">
              {t("settings.preferences.currency_format")}
            </legend>

            <FormField
              control={control}
              name="symbolPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("settings.preferences.currency_symbol_position")}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base px-4">
                        {field.value === "before" && (
                          <span>{t("settings.preferences.symbol_before")}</span>
                        )}
                        {field.value === "after" && (
                          <span>{t("settings.preferences.symbol_after")}</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="before">
                        {t("settings.preferences.symbol_before")}
                      </SelectItem>
                      <SelectItem value="after">
                        {t("settings.preferences.symbol_after")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="decimalSeparator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("settings.preferences.decimal_separator")}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base px-4">
                        {field.value === "dot" && (
                          <span>{t("settings.preferences.decimal_dot")}</span>
                        )}
                        {field.value === "comma" && (
                          <span>{t("settings.preferences.decimal_comma")}</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dot">{t("settings.preferences.decimal_dot")}</SelectItem>
                      <SelectItem value="comma">
                        {t("settings.preferences.decimal_comma")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </fieldset>

          <div className="border-t border-theme-border pt-4 shrink-0">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="h-11 px-8 text-base text-white bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? t("settings.preferences.saving") : t("settings.preferences.save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PreferencesSettings;
