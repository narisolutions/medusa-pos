import { AdminAddDraftOrderItem, AdminOrder, AdminProduct } from "@medusajs/types";
import { DateRange } from "react-day-picker";

type Params = {
  orderId: string;
};

type ProductStatus = "All" | "published" | "draft" | "archived";

type OrderStatus =
  | "All"
  | "pending"
  | "completed"
  | "draft"
  | "archived"
  | "canceled"
  | "requires_action";

type SelectedRange =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

type TableFilter = {
  dates?: DateRange;
  status?: ProductStatus | OrderStatus;
  selectedRange?: SelectedRange;
};

interface UseQueryOrdersOptions {
  fields?: string;
  expand?: string;
  limit?: number;
  offset?: number;
  q?: string;
  status?: string;
  customer_email?: string;
  sales_channel?: string;
  created_at?: string;
  payment_status?: string;
}

interface ApiProductResponse {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string;
  description?: string;
  images?: Array<{ url: string }>;
  variants: Array<{
    id: string;
    title: string;
    sku?: string;
    ean?: string;
    prices: Array<{
      amount: number;
      currency_code: string;
    }>;
  }>;
}

interface ReceiptItem {
  title: string;
  unit_price: unknown; 
  quantity: unknown; 
  total?: unknown; 
  discount_total?: unknown; 
}

interface ReceiptData {
  storeName: string;
  companyName: string;
  storeAddress: string;
  storeAddress2?: string;
  storePhone?: string;
  orderDisplayId: string;
  customerEmail?: string;
  customerName?: string;
  guestEmail?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  taxRate?: number;
  discount?: number;
  total: number;
  currency: string;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  /** When true, the order is delivered but payment is outstanding (pay later). */
  isUnpaid?: boolean;
  /** Outstanding balance shown on an unpaid receipt instead of Amount Paid/Change. */
  amountDue?: number;
  footer?: string;
}

type CartItem = AdminAddDraftOrderItem;
type OrderDiscount = { type: "amount" | "percent"; value: number } | null;

/** Payment provider ID (e.g. pp_cash_pos). Configurable via store settings. */
type PaymentMethod = string | undefined;

interface ExtendedAdminProduct extends AdminProduct {
  brand?: {
    title?: string;
    name?: string;
  };
  metadata?: {
    brand?: {
      title?: string;
      name?: string;
    };
  };
}

interface Preferences {
  backend_url?: string;
  sales_channel?: string;
  stock_location?: string;
}

interface AppConfig {
  backend_url: string;
}

interface DraftOrderMetadata extends Record<string, unknown> {
  payment_method?: PaymentMethod;
  order_discount?: OrderDiscount;
  order_comment?: string;
  /** Set when the order is delivered but payment is deferred (capture later). */
  pay_later?: boolean;
  /** ISO date the goods were actually delivered offline (created_at is not backdatable). */
  delivered_offline_on?: string;
}

type AddItemResult = {
  success: boolean;
  action: 'added' | 'increased' | 'out_of_stock' | 'insufficient_stock';
  quantityAdded: number;
  message?: string;
};

interface DiscountBreakdown {
  backendDiscount: number;
  itemDiscounts: number;
  orderDiscount: number;
  total: number;
}

interface StoreConfig {
  id: string;
  name: string;
  backendUrl: string;
  logo?: string;
}

interface DraftOrderUpdatePayload {
  metadata?: DraftOrderMetadata;
}

interface DraftOrderCreatePayload {
  email: string;
  items: CartItem[];
  region_id: string;
  shipping_address?: {
    country_code: string;
  };
  sales_channel_id: string;
  shipping_methods?: Array<{
    shipping_option_id: string;
    name: string;
    amount: number;
  }>;
  metadata?: DraftOrderMetadata;
}


interface InventoryKitVariant {
  id: string;
  title: string;
  sku?: string;
  ean?: string;
  inventory_quantity?: number;
  required_quantity?: number;
  product?: {
    id: string;
    title: string;
    thumbnail?: string;
  };
}

interface KitInventoryItem {
  inventory_item_id?: string;
  id?: string;
  required_quantity?: number;
}


interface OrdersResult {
  orders: AdminOrder[];
  count: number;
  limit: number;
  offset: number;
}

interface ActivityEvent {
  id: string;
  type: "delivered" | "fulfilled" | "payment_captured" | "awaiting_payment" | "order_placed" | "shipment_created" | "shipped" | "marked_picked_up";
  title: string;
  timestamp: string;
  amount?: number;
  currency?: string;
  itemCount?: number;
}


export type {
  Params,
  StoreConfig,
  ProductStatus,
  OrderStatus,
  SelectedRange,
  TableFilter,
  UseQueryOrdersOptions,
  ApiProductResponse,
  ReceiptItem,
  ReceiptData,
  CartItem,
  OrderDiscount,
  PaymentMethod,
  ExtendedAdminProduct,
  Preferences,
  AppConfig,
  DraftOrderMetadata,
  AddItemResult,
  DiscountBreakdown,
  DraftOrderUpdatePayload,
  DraftOrderCreatePayload,
  InventoryKitVariant,
  KitInventoryItem,
  OrdersResult,
  ActivityEvent,
};
