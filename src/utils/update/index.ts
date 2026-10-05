/** How often a till that stays open checks for an update after the startup check. */
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Whether installing (which restarts the app) is safe now. A cart with items or a parked
 * draft bound to it is a sale in progress — including one mid-payment — and a restart
 * would drop the payment step; an open register session survives the restart in storage.
 */
const canInstallUpdateNow = (cart: { itemCount: number; draftOrderId: string | null }): boolean =>
  cart.itemCount === 0 && !cart.draftOrderId;

export { UPDATE_CHECK_INTERVAL_MS, canInstallUpdateNow };
