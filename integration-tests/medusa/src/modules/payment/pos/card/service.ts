import AbstractPOSPaymentProvider from "../pos-payment-provider"

// Registered as pp_card_pos: money taken at the till, recorded as already settled.
class POSCardPaymentProvider extends AbstractPOSPaymentProvider {
  static identifier = "card"
}

export default POSCardPaymentProvider
