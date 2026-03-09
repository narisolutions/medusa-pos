import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Forms } from "@/types/form";
import schemas from "@/utils/schemas";
import { initDateTimePrefs } from "@/utils/datetime";
import { DEFAULT_PREFERENCES } from "@/utils/preferences/defaults";
import { loadPreferences, updatePreferences } from "@/utils/preferences";

const defaults = DEFAULT_PREFERENCES.dateTime;

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
      const prefs = await loadPreferences();
      reset(prefs.dateTime);
    };
    load();
  }, [reset]);

  const onSubmit = useCallback(
    async (data: Forms["DateTimeSettings"]) => {
      setIsSubmitting(true);
      try {
        await updatePreferences({ dateTime: data });
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
