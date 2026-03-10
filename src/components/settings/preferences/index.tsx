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

const PreferencesSettings: React.FC = () => {
  const { form, isDirty, isSubmitting, handleSubmit, onSubmit, isTauri } =
    usePreferencesSettings();

  const { control } = form;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 pb-6 mb-8">
        <p className="text-lg leading-relaxed text-gray-600 font-medium">
          Customize how the application looks and behaves
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-10 max-w-2xl"
        >
          {/* Date & Time */}
          <fieldset className="space-y-5">
            <legend className="text-xl font-semibold text-gray-900">
              Date & Time
            </legend>

            <FormField
              control={control}
              name="dateFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    Date Format
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-lg px-4">
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
                  <FormLabel className="text-lg font-medium">
                    Time Format
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-lg px-4">
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

          <div className="border-t border-gray-200" />

          {/* Currency Format */}
          <fieldset className="space-y-5">
            <legend className="text-xl font-semibold text-gray-900">
              Currency Format
            </legend>

            <FormField
              control={control}
              name="symbolPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    Currency Symbol Position
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-lg px-4">
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
                  <FormLabel className="text-lg font-medium">
                    Decimal Separator
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-lg px-4">
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

          {/* Display (Tauri only) */}
          {isTauri && (
            <>
              <div className="border-t border-gray-200" />

              <fieldset className="space-y-5">
                <legend className="text-xl font-semibold text-gray-900">
                  Display
                </legend>

                <FormField
                  control={control}
                  name="startFullscreen"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <FormLabel className="text-lg font-medium">
                            Start in Fullscreen
                          </FormLabel>
                          <p className="text-sm text-gray-500">
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
              </fieldset>
            </>
          )}

          <div className="border-t border-gray-200 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="h-12 px-8 text-white text-lg bg-primary hover:bg-primary/90"
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
