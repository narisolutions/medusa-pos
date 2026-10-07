import { getSdk } from "@/config/medusa";
import type { OrderChangeStep } from ".";

type Items = { id: string; quantity: number }[];

/**
 * Receiving a confirmed return: restocked lines are received, damaged ones
 * dismissed. `cancel` is rejected while a receive is open, so the receive's
 * own undo runs first (verified on staging). Shared by returns and exchanges.
 */
export function receiveReturnSteps(
  getReturnId: () => string,
  plan: { receive: Items; dismiss: Items }
): OrderChangeStep[] {
  const sdk = getSdk();
  return [
    {
      key: "initiate_receive",
      run: async () => {
        await sdk.admin.return.initiateReceive(getReturnId(), {});
      },
      undo: async () => {
        await sdk.admin.return.cancelReceive(getReturnId());
      },
    },
    ...(plan.receive.length
      ? [
          {
            key: "receive",
            run: async () => {
              await sdk.admin.return.receiveItems(getReturnId(), { items: plan.receive });
            },
          },
        ]
      : []),
    ...(plan.dismiss.length
      ? [
          {
            key: "dismiss",
            run: async () => {
              await sdk.admin.return.dismissItems(getReturnId(), { items: plan.dismiss });
            },
          },
        ]
      : []),
    {
      key: "confirm_receive",
      run: async () => {
        await sdk.admin.return.confirmReceive(getReturnId(), { no_notification: true });
      },
    },
  ];
}
