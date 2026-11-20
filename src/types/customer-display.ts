import type { infer as zodInfer } from "zod";
import type {
  displayBrandingSchema,
  displayFormatSchema,
  displayLineSchema,
  displayPaymentMethodSchema,
  displayStateSchema,
  displayTotalsSchema,
} from "@/utils/schemas/customer-display";

export type DisplayState = zodInfer<typeof displayStateSchema>;
export type DisplayPhase = DisplayState["phase"];
export type DisplayLine = zodInfer<typeof displayLineSchema>;
export type DisplayTotals = zodInfer<typeof displayTotalsSchema>;
export type DisplayBranding = zodInfer<typeof displayBrandingSchema>;
export type DisplayFormat = zodInfer<typeof displayFormatSchema>;
export type DisplayPaymentMethod = zodInfer<typeof displayPaymentMethodSchema>;

/** The screen without its envelope: what the mapper decides, before a sequence number is stamped on. */
export type DisplayScreen = DistributiveOmit<DisplayState, "v" | "seq" | "sentAt" | "branding" | "format">;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
