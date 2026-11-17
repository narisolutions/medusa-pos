import React, { useLayoutEffect } from "react";
import CustomerDisplayView from "./view";
import { useCustomerDisplayFeed } from "./hooks";
import { tauriReceiver } from "@/utils/customer-display/transport";

/** The whole app in the customer display's window: no login, no backend, no input. */
const CustomerDisplay: React.FC = () => {
  const { state, highlightKey } = useCustomerDisplayFeed(tauriReceiver);

  // Sized for the screen, readable from 1–1.5 m on anything from a 10″ panel up.
  useLayoutEffect(() => {
    document.documentElement.style.fontSize = "clamp(16px, 2.6vh, 40px)";
  }, []);

  return <CustomerDisplayView state={state} highlightKey={highlightKey} />;
};

export default CustomerDisplay;
