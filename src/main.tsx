import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";
import "@/i18n";
import { initLogger } from "./utils/logger";
import { applyBootPreferences } from "./utils/settings/preferences/boot";
import { installTouchGuards } from "./utils/ui/touch-guards";

initLogger();
applyBootPreferences();
installTouchGuards(import.meta.env.DEV);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
