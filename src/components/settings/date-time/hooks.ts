import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Forms } from "@/types/form";
import storage from "@/utils/storage";
import schemas from "@/utils/schemas";
import { initDateTimePrefs } from "@/utils/datetime";
import type { DateTimePreferences } from "@/utils/storage";

const defaults: DateTimePreferences = { dateFormat: "DD.MM.YYYY", timeFormat: "24h" };

export const useDateTimeSettings = () => {
  const form = useForm<Forms["DateTimeSettings"]>({
    resolver: zodResolver(schemas.dateTimeSettings),
    defaultValues: defaults,
  });

  const {
    reset,
    handleSubmit,
    formState: { isDirty },
  } = form;

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const stored = await storage.getItem<DateTimePreferences>("date_time_preferences");
      reset(stored ?? defaults);
    };
    load();
  }, [reset]);

  const onSubmit = useCallback(
    async (data: Forms["DateTimeSettings"]) => {
      setIsSubmitting(true);
      try {
        await storage.setItem("date_time_preferences", data);
        initDateTimePrefs(data);
        reset(data);
        toast.success("Date & Time settings saved");
      } catch {
        toast.error("Failed to save Date & Time settings");
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset]
  );

  return { form, isDirty, isSubmitting, handleSubmit, onSubmit };
};
