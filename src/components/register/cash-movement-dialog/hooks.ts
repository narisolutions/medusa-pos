import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import schemas from "@/utils/schemas";
import { coercedZodResolver } from "@/utils/schemas/resolver";
import { Forms } from "@/types/form";
import { useRegister } from "@/context/register";

export const useCashMovement = (onDone: () => void) => {
  const { addMovement } = useRegister();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Forms["CashMovement"]>({
    resolver: coercedZodResolver(schemas.cashMovement),
    defaultValues: { type: "drop", amount: 0, reason: "" },
  });

  const onSubmit = useCallback(
    async (data: Forms["CashMovement"]) => {
      setIsSubmitting(true);
      try {
        await addMovement(data.type, data.amount, data.reason);
        form.reset({ type: "drop", amount: 0, reason: "" });
        onDone();
      } finally {
        setIsSubmitting(false);
      }
    },
    [addMovement, form, onDone]
  );

  return { form, isSubmitting, onSubmit };
};
