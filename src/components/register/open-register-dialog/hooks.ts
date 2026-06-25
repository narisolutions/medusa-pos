import { useCallback, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import schemas from "@/utils/schemas";
import { Forms } from "@/types/form";
import { useRegister } from "@/context/register";

export const useOpenRegister = () => {
  const { openRegister } = useRegister();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Forms["OpenRegister"]>({
    resolver: zodResolver(schemas.openRegister) as unknown as Resolver<
      Forms["OpenRegister"]
    >,
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
