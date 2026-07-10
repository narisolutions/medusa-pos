import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import schemas from "@/utils/schemas";
import { coercedZodResolver } from "@/utils/schemas/resolver";
import { Forms } from "@/types/form";
import { useRegister } from "@/context/register";

export const useOpenRegister = () => {
  const { openRegister } = useRegister();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Forms["OpenRegister"]>({
    resolver: coercedZodResolver(schemas.openRegister),
    defaultValues: { openingFloat: 0 },
  });

  const onSubmit = useCallback(
    async (data: Forms["OpenRegister"]) => {
      setIsSubmitting(true);
      try {
        await openRegister(data.openingFloat);
      } finally {
        setIsSubmitting(false);
      }
    },
    [openRegister]
  );

  return { form, isSubmitting, onSubmit };
};
