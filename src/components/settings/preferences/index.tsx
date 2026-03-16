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
import type { ThemeMode } from "@/types/preferences";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const PreferencesSettings: React.FC = () => {
  const { form, isDirty, isSubmitting, handleSubmit, onSubmit, isTauri, handleThemeModeChange } =
    usePreferencesSettings();

  const { control, watch } = form;
  const currentTheme = watch("themeMode");

  return (
    <div className="flex flex-col h-full min-h-0">
      <p className="text-fg-muted text-sm mb-4">
        Customize how the application looks and behaves
      </p>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col space-y-5 max-w-2xl min-h-0"
        >
          {/* Appearance (theme + fullscreen) */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-fg">
              Appearance
            </legend>

            <FormField
              control={control}
              name="themeMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Theme</FormLabel>
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
                          Start in fullscreen
                        </FormLabel>
                        <p className="text-sm text-fg-muted">
                          Launch the application in fullscreen mode
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
              Date & Time
            </legend>

            <FormField
              control={control}
              name="dateFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Date Format
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base px-4">
                        {field.value === "system" && (
                          <span>System default</span>
                        )}
                        {field.value === "DD.MM.YYYY" && (
                          <span>DD.MM.YYYY (e.g. 09.03.2026)</span>
                        )}
                        {field.value === "YYYY-MM-DD" && (
                          <span>YYYY-MM-DD (e.g. 2026-03-09)</span>
                        )}
                        {field.value === "MM/DD/YYYY" && (
                          <span>MM/DD/YYYY (e.g. 03/09/2026)</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="system">System default</SelectItem>
                      <SelectItem value="DD.MM.YYYY">
                        DD.MM.YYYY (e.g. 09.03.2026)
                      </SelectItem>
                      <SelectItem value="YYYY-MM-DD">
                        YYYY-MM-DD (e.g. 2026-03-09)
                      </SelectItem>
                      <SelectItem value="MM/DD/YYYY">
                        MM/DD/YYYY (e.g. 03/09/2026)
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
                    Time Format
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base px-4">
                        {field.value === "system" && (
                          <span>System default</span>
                        )}
                        {field.value === "24h" && (
                          <span>24-hour (14:30)</span>
                        )}
                        {field.value === "12h" && (
                          <span>12-hour (2:30 PM)</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="system">System default</SelectItem>
                      <SelectItem value="24h">24-hour (14:30)</SelectItem>
                      <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
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
              Currency Format
            </legend>

            <FormField
              control={control}
              name="symbolPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Currency Symbol Position
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base px-4">
                        {field.value === "before" && (
                          <span>Before amount (e.g. $10)</span>
                        )}
                        {field.value === "after" && (
                          <span>After amount (e.g. 10$)</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="before">
                        Before amount (e.g. $10)
                      </SelectItem>
                      <SelectItem value="after">
                        After amount (e.g. 10$)
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
                    Decimal Separator
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-base px-4">
                        {field.value === "dot" && (
                          <span>Dot (e.g. 10.50)</span>
                        )}
                        {field.value === "comma" && (
                          <span>Comma (e.g. 10,50)</span>
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dot">Dot (e.g. 10.50)</SelectItem>
                      <SelectItem value="comma">
                        Comma (e.g. 10,50)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </fieldset>

          <div className="border-t border-theme-border" />

          {/* Integrations */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-fg">Integrations</legend>

            <FormField
              control={control}
              name="customEndpointsEnabled"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <FormLabel className="text-base font-medium">
                        Use custom endpoints
                      </FormLabel>
                      <div className="text-sm text-fg-muted space-y-2">
                        <p>
                          <span className="font-medium text-fg">
                            Recommended:
                          </span>{" "}
                          keep this enabled if your backend provides the <code>/pos</code>{" "}
                          routes.
                        </p>
                        <p>
                          <span className="font-medium text-fg">
                            Custom endpoints enabled
                          </span>{" "}
                          returns POS-ready product data, including context-aware computed
                          prices and correctly calculated variant inventory quantities.
                        </p>
                        <p>
                          <span className="font-medium text-fg">
                            Custom endpoints disabled
                          </span>{" "}
                          uses the standard Medusa Admin product list, which may return raw
                          variant prices (price records without context computation) and may
                          not provide reliable computed inventory quantity for POS use cases.
                        </p>
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
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
              {isSubmitting ? "Saving..." : "Save preferences"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PreferencesSettings;
