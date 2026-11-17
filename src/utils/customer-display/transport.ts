import type { DisplayState } from "@/types/customer-display";

/** The window the customer display opens in; its capability is granted to this label only. */
export const CUSTOMER_DISPLAY_WINDOW = "customer-display";

const STATE_EVENT = "cds://state";
const HELLO_EVENT = "cds://hello";

/** The till's side of the link. Same-machine today; a LAN device later only adds another one. */
export interface DisplayTransport {
  send(state: DisplayState): void;
  /** Called when a display (re)opens and needs the current screen. */
  onHello(callback: () => void): Promise<() => void>;
}

/** The display's side: listen first, then say hello, or the answer can arrive before anyone listens. */
export interface DisplayReceiver {
  subscribe(callback: (payload: unknown) => void): Promise<() => void>;
  hello(): Promise<void>;
}

export const tauriTransport: DisplayTransport = {
  send(state) {
    void import("@tauri-apps/api/event").then(({ emitTo }) => emitTo(CUSTOMER_DISPLAY_WINDOW, STATE_EVENT, state));
  },
  async onHello(callback) {
    const { listen } = await import("@tauri-apps/api/event");
    return listen(HELLO_EVENT, () => callback());
  },
};

export const tauriReceiver: DisplayReceiver = {
  async subscribe(callback) {
    const { listen } = await import("@tauri-apps/api/event");
    return listen(STATE_EVENT, (event) => callback(event.payload));
  },
  async hello() {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(HELLO_EVENT);
  },
};
