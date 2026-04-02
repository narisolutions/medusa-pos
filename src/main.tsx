import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";
import { initLogger } from "./utils/logger";
import { applyBootPreferences } from "./utils/settings/preferences/boot";

initLogger();
applyBootPreferences();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
