import React from "react";
import ReactDOM from "react-dom/client";
import "./globals.css";
import "@/i18n";
import { initLogger } from "./utils/logger";
import { applyBootPreferences } from "./utils/settings/preferences/boot";
import { installTouchGuards } from "./utils/ui/touch-guards";
import { installKeyboardInset } from "./utils/ui/keyboard-inset";
import { markPlatform } from "./utils/ui/platform";
import { isCustomerDisplayWindow } from "./utils/customer-display/window";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

initLogger();
// Both windows: no browser menu on a long press, no dragging, no pinch zoom.
installTouchGuards(import.meta.env.DEV);

// The customer display shares this bundle but loads none of the till: each side is its own
// chunk, so the cart, the backend client and their storage never start in that window.
if (isCustomerDisplayWindow()) {
  void import("./components/customer-display").then(({ default: CustomerDisplay }) =>
    root.render(
      <React.StrictMode>
        <CustomerDisplay />
      </React.StrictMode>,
    ),
  );
} else {
  applyBootPreferences();
  installKeyboardInset();
  markPlatform();

  void import("./App").then(({ default: App }) =>
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  );
}
