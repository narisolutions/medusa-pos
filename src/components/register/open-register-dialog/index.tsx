import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOpenRegister } from "./hooks";
import { useTranslation } from "@/i18n";

/**
 * Blocking dialog shown at app start on the first launch of each business day.
 * Cannot be dismissed — checkout stays gated until the register is open.
 */
const OpenRegisterDialog: React.FC = () => {
  const { form, isSubmitting, onSubmit } = useOpenRegister();
  const { t } = useTranslation();

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        preventOutsideClose
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t("register.open.title")}</DialogTitle>
          <DialogDescription>
            {t("register.open.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="openingFloat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    {t("register.open.opening_float")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      autoFocus
                      placeholder="0.00"
                      value={field.value === 0 ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-base text-white bg-primary hover:bg-primary/90"
            >
              {isSubmitting
                ? t("register.open.opening")
                : t("register.open.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default OpenRegisterDialog;
