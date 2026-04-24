import React from "react";
import { AdminOrder } from "@medusajs/types";
import { User } from "lucide-react";
import { isOrderGuestCustomer } from "@/utils/helpers";
import { useQueryStore } from "@/hooks/queries/useQueryStore";
import { getGuestCustomerEmail } from "@/utils/settings/store/metadata";
import { useTranslation } from "@/i18n";
// import CustomerDialog from "./customer-dialog";

interface Props {
  order: AdminOrder;
}

const Customer: React.FC<Props> = ({ order }) => {
  const { t } = useTranslation();
  const { customer, shipping_address, billing_address } = order;
  const { data: store } = useQueryStore();
  const guestEmail = getGuestCustomerEmail(store);
  // const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  // const hasAccount = customer?.has_account || null;

  return (
    <div className="bg-surface rounded-lg border border-theme-border overflow-hidden shadow-sm flex flex-col h-full">
      <div className="px-6 py-4 border-b border-theme-border bg-surface-muted shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-fg-muted" />
            <h2 className="text-lg font-semibold text-fg">
              {t("orders.customer_address_header")}
            </h2>
          </div>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomerDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {hasAccount ? "Change customer" : "Attach customer"}
          </Button> */}
        </div>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
        {customer && (
          <>
            {(!customer.email || customer.email.trim() === "") &&
            isOrderGuestCustomer(customer.email, guestEmail) ? (
              <div className="text-base">
                <span className="text-fg-muted">{t("orders.customer_label")}: </span>
                <span className="font-medium text-fg">{t("orders.guest_customer")}</span>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-medium text-fg mb-2">
                    {t("orders.customer_information_header")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
                    {(customer.first_name && customer.last_name) ||
                    (billing_address?.first_name &&
                      billing_address?.last_name) ? (
                      <div>
                        <span className="text-fg-muted">{t("orders.customer_name_label")}</span>
                        <span className="font-medium text-fg">
                          {customer.first_name && customer.last_name
                            ? `${customer.first_name} ${customer.last_name}`
                            : `${billing_address?.first_name} ${billing_address?.last_name}`}
                        </span>
                      </div>
                    ) : null}
                    {customer.email && (
                      <div>
                        <span className="text-fg-muted">{t("orders.customer_email_label")}</span>
                        <span className="font-medium text-fg">
                          {customer.email}
                        </span>
                      </div>
                    )}
                    {(customer.phone || billing_address?.phone) && (
                      <div className="sm:col-span-2">
                        <span className="text-fg-muted">{t("orders.customer_phone_label")}</span>
                        <span className="font-medium text-fg">
                          {customer.phone || billing_address?.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {shipping_address &&
                  (!!shipping_address.address_1 ||
                    !!shipping_address.city ||
                    !!shipping_address.postal_code ||
                    (!shipping_address.country_code && false)) && (
                    <div>
                      <h3 className="text-base font-medium text-fg mb-2">
                        {t("orders.shipping_address_header")}
                      </h3>
                      <div className="text-base text-fg-muted">
                        {[
                          shipping_address?.address_1,
                          shipping_address?.city,
                          shipping_address?.postal_code,
                          shipping_address?.country_code?.toUpperCase(),
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>
                  )}
              </>
            )}
          </>
        )}
      </div>

      {/* TODO: Get back to this later and implement customer dialog */}
      {/* <CustomerDialog
        open={isCustomerDialogOpen}
        onClose={() => setIsCustomerDialogOpen(false)}
        order={order}
      /> */}
    </div>
  );
};

export default Customer;
