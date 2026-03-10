import { z } from "zod";

export default {
  login: z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" }),
  }),

  configSchema: z.object({
    backend_url: z
      .string()
      .url({ message: "Please enter a valid URL" })
      .transform((url) => {
        return url.endsWith("/") ? url.slice(0, -1) : url;
      }),
  }),

  printer: z.object({
    id: z.string().optional(),
    name: z.string().min(1, { message: "Printer name is required" }),
    type: z.enum(["receipt"], { message: "Please select a printer type" }),
    connectionType: z.enum(["usb", "network", "bluetooth"], {
      message: "Please select a connection type",
    }),
    address: z.string().min(1, { message: "Address/IP is required" }),
    port: z.string().optional(),
    isDefault: z.boolean().optional().default(false),
  }),

  apiSettings: z.object({
    backend_url: z
      .string()
      .url({ message: "Please enter a valid API URL" })
      .transform((url) => {
        return url.endsWith("/") ? url.slice(0, -1) : url;
      })
      .optional()
      .or(z.literal("")),
    sales_channel: z.string().min(1, { message: "Sales channel is required" }),
    stock_location: z.string().min(1, { message: "Stock location is required" }),
  }),

  storeConfig: z.object({
    backendUrl: z
      .string()
      .url({ message: "Please enter a valid URL" })
      .transform((url) => (url.endsWith("/") ? url.slice(0, -1) : url)),
  }),

  dateTimeSettings: z.object({
    dateFormat: z.enum(["system", "DD.MM.YYYY", "YYYY-MM-DD", "MM/DD/YYYY"]),
    timeFormat: z.enum(["system", "24h", "12h"]),
  }),

  currencySettings: z.object({
    symbolPosition: z.enum(["before", "after"]),
    decimalSeparator: z.enum(["dot", "comma"]),
  }),

  preferencesSettings: z.object({
    dateFormat: z.enum(["system", "DD.MM.YYYY", "YYYY-MM-DD", "MM/DD/YYYY"]),
    timeFormat: z.enum(["system", "24h", "12h"]),
    symbolPosition: z.enum(["before", "after"]),
    decimalSeparator: z.enum(["dot", "comma"]),
    startFullscreen: z.boolean(),
  }),

  storeSettings: z.object({
    storeName: z.string().min(1, { message: "Store name is required" }),
    brandName: z.string().min(1, { message: "Brand name is required" }),
    logoUrl: z.string().optional(),
    primaryColor: z.string().min(1, { message: "Primary color is required" }),
    secondaryColor: z.string().min(1, { message: "Secondary color is required" }),
    fontSize: z.string().min(1, { message: "Font size is required" }),
    storeAddress: z.string().min(1, { message: "Store address is required" }),
    storeAddress2: z.string().optional(),
    storePhone: z.string().min(1, { message: "Store phone is required" }),
    paymentMethods: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          enabled: z.boolean(),
          icon: z.enum(["cash", "card"]).optional(),
        })
      )
      .optional(),
  }),
};
