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
import { useTranslation } from "@/i18n";
import { useNoSale } from "./hooks";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Opening the drawer without a sale: logged with a reason, then the drawer opens. */
const NoSaleDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useTranslation();
  const { form, isSubmitting, onSubmit } = useNoSale(() => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("register.no_sale.title")}</DialogTitle>
          <DialogDescription>{t("register.no_sale.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">{t("register.no_sale.reason")}</FormLabel>
                  <FormControl>
                    <Input type="text" autoFocus value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage className="text-base" />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" size="lg" loading={isSubmitting} className="flex-2">
                {t("register.no_sale.submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NoSaleDialog;
