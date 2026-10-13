import {
  AbstractPaymentProvider,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentOutput,
  CancelPaymentOutput,
  CapturePaymentOutput,
  DeletePaymentOutput,
  GetPaymentStatusOutput,
  InitiatePaymentOutput,
  RefundPaymentOutput,
  RetrievePaymentOutput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import crypto from "node:crypto"

// Funds are collected on the physical terminal before the order reaches Medusa,
// so to the backend a POS payment is already settled: every session authorizes
// immediately, the same way the built-in System provider does. Returning an
// empty `data` object on each call (rather than omitting it) keeps the payment
// and session records consistent. Concrete providers differ only by their
// `identifier`, which yields the `pp_<identifier>_pos` registration id used to
// record the real tender (cash, card, bank transfer) on the order.
abstract class AbstractPOSPaymentProvider extends AbstractPaymentProvider {
  constructor(cradle: Record<string, unknown>, config: Record<string, unknown> = {}) {
    super(cradle, config)
  }

  async initiatePayment(): Promise<InitiatePaymentOutput> {
    return { id: `${this.getIdentifier()}_pos_${crypto.randomUUID()}`, data: {} }
  }

  async authorizePayment(): Promise<AuthorizePaymentOutput> {
    return { data: {}, status: PaymentSessionStatus.AUTHORIZED }
  }

  async capturePayment(): Promise<CapturePaymentOutput> {
    return { data: {} }
  }

  async getPaymentStatus(): Promise<GetPaymentStatusOutput> {
    return { status: PaymentSessionStatus.AUTHORIZED, data: {} }
  }

  async retrievePayment(): Promise<RetrievePaymentOutput> {
    return { data: {} }
  }

  async updatePayment(): Promise<UpdatePaymentOutput> {
    return { data: {} }
  }

  async refundPayment(): Promise<RefundPaymentOutput> {
    return { data: {} }
  }

  async cancelPayment(): Promise<CancelPaymentOutput> {
    return { data: {} }
  }

  async deletePayment(): Promise<DeletePaymentOutput> {
    return { data: {} }
  }

  async getWebhookActionAndData(): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }
}

export default AbstractPOSPaymentProvider
