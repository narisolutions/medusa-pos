import { useWatch, type FieldValues, type UseFormReturn } from "react-hook-form";
import { sameFormValues } from "@/utils/forms/same-values";

/**
 * Whether the form differs from what was last loaded or saved (its `reset` values).
 * Replaces `formState.isDirty`, which stays true once a field mounts as `undefined`.
 */
export function useUnsavedChanges<T extends FieldValues>(form: UseFormReturn<T>): boolean {
  const values = useWatch({ control: form.control });
  return !sameFormValues(values, form.formState.defaultValues);
}
