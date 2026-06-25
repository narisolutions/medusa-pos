import { useCallback, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import schemas from "@/utils/schemas";
import { Forms } from "@/types/form";
import { useRegister } from "@/context/register";

export const useCashMovement = (onDone: () => void) => {
  const { addMovement } = useRegister();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Forms["CashMovement"]>({
    resolver: zodResolver(schemas.cashMovement) as unknown as Resolver<
      Forms["CashMovement"]
    >,
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
