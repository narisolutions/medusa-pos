import AbstractPOSPaymentProvider from "../pos-payment-provider"

// Registered as pp_cash_pos: money taken at the till, recorded as already settled.
class POSCashPaymentProvider extends AbstractPOSPaymentProvider {
  static identifier = "cash"
}

export default POSCashPaymentProvider
