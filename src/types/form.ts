import schemas from "@/utils/schemas";

import { infer as zodInfer } from "zod";

export type Forms = {
  Login: zodInfer<typeof schemas.login>;
  Config: zodInfer<typeof schemas.configSchema>;
  Printer: zodInfer<typeof schemas.printer>;
  ApiSettings: zodInfer<typeof schemas.apiSettings>;
  StoreSettings: zodInfer<typeof schemas.storeSettings>;
  StoreConfig: zodInfer<typeof schemas.storeConfig>;
};
