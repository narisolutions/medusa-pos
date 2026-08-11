import schemas from "@/utils/schemas";

import { infer as zodInfer } from "zod";

/** Payload carried by a transfer ticket's QR code. Contract owned by Tamada. */
export type HandoffPayload = zodInfer<typeof schemas.handoffPayload>;
export type HandoffItem = HandoffPayload["items"][number];
