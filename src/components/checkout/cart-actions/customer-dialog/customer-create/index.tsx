// CustomerDialog/CustomerCreateForm.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n";
import { useForm } from "react-hook-form";
import { Forms } from "@/types/form";
import schemas from "@/utils/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AdminCustomer } from "@medusajs/types";
import { useCustomerCreate } from "./hooks";

type CustomerCreateFormProps = {
  onCustomerCreated?: (customer: AdminCustomer) => void;
  onCancel?: () => void;
};

export const CustomerCreateForm: React.FC<CustomerCreateFormProps> = ({
  onCustomerCreated,
  onCancel,
}) => {
  const { t } = useTranslation();

  // Each component uses its own hook
  const { isCreating, createCustomer,resetCreation } =
    useCustomerCreate();

  const form = useForm<Forms["Customer"]>({
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      phone: "",
      company_name: "",
    },
    resolver: zodResolver(schemas.customerSchema),
  });

  const { handleSubmit, control, reset } = form;

  const onSubmit = async (data: Forms["Customer"]) => {
    const created = await createCustomer(data);
    if (created) {
      onCustomerCreated?.(created);
      reset();
      resetCreation();
    }
  };

  return (
   
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("checkout.customer_email_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("checkout.customer_email_placeholder")}
                      className="h-12 text-lg px-4"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-base text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("checkout.customer_phone_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder={t("checkout.customer_phone_placeholder")}
                      className="h-12 text-lg px-4"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-base text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("checkout.customer_first_name_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t(
                        "checkout.customer_first_name_placeholder",
                      )}
                      className="h-12 text-lg px-4"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-base text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("checkout.customer_last_name_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t("checkout.customer_last_name_placeholder")}
                      className="h-12 text-lg px-4"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-base text-red-600" />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">
                    {t("checkout.customer_company_label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t("checkout.customer_company_placeholder")}
                      className="h-12 text-lg px-4"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-base text-red-600" />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={onCancel}
              className="h-12 px-5 text-base"
            >
              {t("common.back")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isCreating}
              className="h-12 px-5 text-base"
            >
              {isCreating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t("common.add")
              )}
            </Button>
          </div>
        </form>
      </Form>

  );
};
