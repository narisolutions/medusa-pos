// import { useCallback } from "react";
// import { getSdk } from "@/config/medusa";
// import { AdminOrder } from "@medusajs/types";
// import { useQueryClient } from "@tanstack/react-query";
// import { toast } from "sonner";

// export const useOrder = (order: AdminOrder) => {
//   const queryClient = useQueryClient();

//   const attachCustomerToOrder = useCallback(
//     async (customerId: string, email: string) => {
//       const sdk = getSdk();

//       try {
//         // Step 1: Update email first
//         await sdk.admin.order.update(order.id, {
//           email: email.trim(),
//         } as Parameters<typeof sdk.admin.order.update>[1]);
        
//         // Step 2: Try to attach customer_id using raw fetch with PATCH method
//         try {
//           const response = (await sdk.client.fetch(`/admin/orders/${order.id}`, {
//             method: "PATCH",
//             body: JSON.stringify({
//               customer_id: customerId,
//             }),
//           })) as Response;

//           if (!response.ok) {
//             // Try POST as fallback
//             const postResponse = (await sdk.client.fetch(`/admin/orders/${order.id}`, {
//               method: "POST",
//               body: JSON.stringify({
//                 customer_id: customerId,
//               }),
//             })) as Response;

//             if (!postResponse.ok) {
//               const postErrorBody = await postResponse.text();
//               throw new Error(`Failed to attach customer: ${postResponse.statusText}`);
//             }
//           }
//         } catch (customerIdError) {
//           // Don't throw - email was updated successfully, just customer_id attachment failed
//           toast.warning(`Email updated but customer association may have failed. Please verify.`);
//           await queryClient.invalidateQueries({ queryKey: ["order", order.id] });
//           await queryClient.invalidateQueries({ queryKey: ["orders"] });
//           await queryClient.refetchQueries({ queryKey: ["order", order.id] });
//           return;
//         }

//         toast.success(`Customer ${email} attached to order`);

//         await queryClient.invalidateQueries({ queryKey: ["order", order.id] });
//         await queryClient.invalidateQueries({ queryKey: ["orders"] });
//         await queryClient.refetchQueries({ queryKey: ["order", order.id] });
//       } catch (error) {
//         const errorMessage =
//           error instanceof Error ? error.message : "Failed to attach customer";
//         toast.error(errorMessage);
//         throw error;
//       }
//     },
//     [order.id, queryClient]
//   );

//   const removeCustomerFromOrder = useCallback(async () => {
//     const sdk = getSdk();

//     try {
//       // Try to remove customer by setting customer_id to undefined
//       await sdk.admin.order.update(order.id, {
//         email: constants.ORDER_GUEST_EMAIL,
//         customer_id: undefined,
//       } as Parameters<typeof sdk.admin.order.update>[1] & {
//         customer_id?: string | undefined;
//       });

//       toast.success("Customer removed from order");
//     } catch {
//       // If undefined doesn't work, try without customer_id field at all
//       await sdk.admin.order.update(order.id, {
//         email: constants.ORDER_GUEST_EMAIL,
//       });

//       toast.success("Customer email updated to guest");
//     }

//     await queryClient.invalidateQueries({ queryKey: ["order", order.id] });
//     await queryClient.invalidateQueries({ queryKey: ["orders"] });
//     await queryClient.refetchQueries({ queryKey: ["order", order.id] });
//   }, [order.id, queryClient]);

//   return {
//     attachCustomerToOrder,
//     removeCustomerFromOrder,
//   };
// };

