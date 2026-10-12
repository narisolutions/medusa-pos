import React from "react";
import { Navigate, NavLink, useParams } from "react-router-dom";
import { Plug, Printer, Puzzle, ScanBarcode, SlidersHorizontal, Store } from "lucide-react";
import PrinterSettings from "./printer";
import ConnectionSettings from "./connection";
import StoreSettings from "./store";
import PreferencesSettings from "./preferences";
import PluginsSettings from "./plugins";
import ScannerSettings from "./scanner";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { ROUTES, SETTINGS_SECTIONS, type SettingsSection } from "@/router/routes";

const SECTIONS: Record<SettingsSection, { icon: React.ComponentType<{ className?: string }>; Page: React.ComponentType }> = {
  printer: { icon: Printer, Page: PrinterSettings },
  scanner: { icon: ScanBarcode, Page: ScannerSettings },
  connection: { icon: Plug, Page: ConnectionSettings },
  store: { icon: Store, Page: StoreSettings },
  preferences: { icon: SlidersHorizontal, Page: PreferencesSettings },
  plugins: { icon: Puzzle, Page: PluginsSettings },
};

const isSection = (value: string | undefined): value is SettingsSection =>
  !!value && (SETTINGS_SECTIONS as readonly string[]).includes(value);

/** Settings as a list of sections, each its own route: survives a reload, works with Back. */
const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { section } = useParams();

  if (!isSection(section)) return <Navigate to={ROUTES.settingsSection("printer")} replace />;

  const { Page } = SECTIONS[section];

  return (
    <div className="flex items-start gap-8 bg-surface p-8 rounded-lg min-h-full">
      <nav aria-label={t("nav.settings")} className="sticky top-0 flex w-60 shrink-0 flex-col gap-1">
        {SETTINGS_SECTIONS.map((id) => {
          const Icon = SECTIONS[id].icon;
          return (
            <NavLink
              key={id}
              to={ROUTES.settingsSection(id)}
              replace
              className={({ isActive }) =>
                cn(
                  "flex min-h-tap-xl items-center gap-3 rounded-lg px-4 text-lg transition-colors duration-100",
                  isActive
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "text-fg-muted hover:bg-accent hover:text-fg active:bg-accent"
                )
              }
            >
              <Icon className="size-6 shrink-0" />
              {t(`settings.${id}.title`)}
            </NavLink>
          );
        })}
      </nav>
      <section className="flex min-w-0 flex-1 flex-col">
        <Page />
      </section>
    </div>
  );
};

export default Settings;
