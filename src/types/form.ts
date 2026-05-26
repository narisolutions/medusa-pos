import schemas from "@/utils/schemas";

import { infer as zodInfer } from "zod";

export type Forms = {
  Login: zodInfer<typeof schemas.login>;
  Config: zodInfer<typeof schemas.configSchema>;
  Customer: zodInfer<typeof schemas.customerSchema>;
  Printer: zodInfer<typeof schemas.printer>;
  ApiSettings: zodInfer<typeof schemas.apiSettings>;
  StoreSettings: zodInfer<typeof schemas.storeSettings>;
  StoreConfig: zodInfer<typeof schemas.storeConfig>;
  DateTimeSettings: zodInfer<typeof schemas.dateTimeSettings>;
  CurrencySettings: zodInfer<typeof schemas.currencySettings>;
  PreferencesSettings: zodInfer<typeof schemas.preferencesSettings>;
};
