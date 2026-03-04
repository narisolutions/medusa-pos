// import React from "react";
// import CustomerDialog from "@/components/checkout/cart-actions/customer-dialog";
// import { AdminOrder } from "@medusajs/types";
// import { useOrder } from "@/hooks/order/useOrder";

// type Props = {
//   open: boolean;
//   onClose: () => void;
//   order: AdminOrder;
//   onSuccess?: () => void;
// };

// const OrderCustomerDialog: React.FC<Props> = ({
//   open,
//   onClose,
//   order,
//   onSuccess,
// }) => {
//   const { attachCustomerToOrder, removeCustomerFromOrder } =
//     useOrder(order);
//   const currentOrderCustomer = order.customer;
//   const currentCustomerEmail = currentOrderCustomer?.email || null;

//   return (
//     <CustomerDialog
//       open={open}
//       onClose={onClose}
//       initialEmail={null}
//       currentCustomerEmail={currentCustomerEmail}
//       onApply={async (customerId, email) => {
//         await attachCustomerToOrder(customerId, email);
//         onSuccess?.();
//       }}
//       onRemove={async () => {
//         await removeCustomerFromOrder();
//         onSuccess?.();
//       }}
//       order={order}
//     />
//   );
// };

// export default OrderCustomerDialog;
