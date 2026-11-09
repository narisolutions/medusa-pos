import React from "react";
import { Navigate, NavLink, useParams } from "react-router-dom";
import { Palette, Plug, Printer, Puzzle, ScanBarcode, SlidersHorizontal, Store, Zap } from "lucide-react";
import PrinterSettings from "./printer";
import ConnectionSettings from "./connection";
import StoreSettings from "./store";
import PreferencesSettings from "./preferences";
import PluginsSettings from "./plugins";
import ScannerSettings from "./scanner";
import QuickKeysSettings from "./quick-keys";
import SettingsSearch from "./settings-search";
import { useSettingHighlight } from "./hooks";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { ROUTES, SETTINGS_SECTIONS, type SettingsSection } from "@/router/routes";
import { SETTINGS_SECTION_TITLES } from "@/utils/settings/search";

const SECTIONS: Record<
  SettingsSection,
  { icon: React.ComponentType<{ className?: string }>; Page: React.ComponentType }
> = {
  printer: { icon: Printer, Page: PrinterSettings },
  scanner: { icon: ScanBarcode, Page: ScannerSettings },
  connection: { icon: Plug, Page: ConnectionSettings },
  store: { icon: Store, Page: StoreSettings },
  "quick-keys": { icon: Zap, Page: QuickKeysSettings },
  preferences: { icon: SlidersHorizontal, Page: PreferencesSettings },
  plugins: { icon: Puzzle, Page: PluginsSettings },
};

const isSection = (value: string | undefined): value is SettingsSection =>
  !!value && (SETTINGS_SECTIONS as readonly string[]).includes(value);

/** Settings as a list of sections, each its own route: survives a reload, works with Back. */
const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { section } = useParams();
  useSettingHighlight();

  if (!isSection(section)) return <Navigate to={ROUTES.settingsSection("printer")} replace />;

  const { Page } = SECTIONS[section];

  return (
    <div className="flex items-start gap-6 bg-surface p-6 rounded-lg min-h-full">
      <nav aria-label={t("nav.settings")} className="sticky top-0 flex w-56 shrink-0 flex-col gap-1">
        <SettingsSearch>
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
                {t(SETTINGS_SECTION_TITLES[id])}
              </NavLink>
            );
          })}
        </SettingsSearch>
        {/* Dev builds only: the component catalogue, a tool rather than a setting. */}
        {import.meta.env.DEV && (
          <div className="mt-4 border-t border-theme-border pt-4">
            <NavLink
              to={ROUTES.devUi}
              className="flex min-h-tap items-center gap-3 rounded-lg px-4 text-base text-fg-muted hover:bg-accent hover:text-fg active:bg-accent"
            >
              <Palette className="size-5 shrink-0" />
              UI kit
            </NavLink>
          </div>
        )}
      </nav>
      <section className="flex min-w-0 flex-1 flex-col">
        <Page />
      </section>
    </div>
  );
};

export default Settings;
