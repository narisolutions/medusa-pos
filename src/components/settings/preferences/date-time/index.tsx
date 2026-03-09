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
import { useDateTimeSettings } from "./hooks";
import { previewDateTime } from "@/utils/datetime";
import type { DateTimePreferences } from "@/types/preferences";

const DateTimeSettings: React.FC = () => {
  const { form, isDirty, isSubmitting, handleSubmit, onSubmit } =
    useDateTimeSettings();

  const { control, watch } = form;
  const watchedDateFormat = watch("dateFormat");
  const watchedTimeFormat = watch("timeFormat");

  const preview = previewDateTime({
    dateFormat: watchedDateFormat as DateTimePreferences["dateFormat"],
    timeFormat: watchedTimeFormat as DateTimePreferences["timeFormat"],
  });

  return (
    <div className="flex flex-col space-y-6">
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
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

          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-700">
            Preview: <span className="font-medium">{preview}</span>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="h-12 px-6 text-white text-lg min-w-[48px] bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default DateTimeSettings;
