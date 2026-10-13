import AbstractPOSPaymentProvider from "../pos-payment-provider"

// Registered as pp_banktransfer_pos: money taken at the till, recorded as already settled.
class POSBankTransferPaymentProvider extends AbstractPOSPaymentProvider {
  static identifier = "banktransfer"
}

export default POSBankTransferPaymentProvider
