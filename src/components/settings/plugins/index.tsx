import { useTranslation } from "@/i18n";
import { plugins } from "@/plugins";

/** Settings → Plugins: each registered plugin contributes one panel. */
const PluginsSettings = () => {
  const { t } = useTranslation();
  const panels = plugins.filter(
    (plugin): plugin is typeof plugin & { SettingsPanel: NonNullable<(typeof plugin)["SettingsPanel"]> } =>
      plugin.SettingsPanel !== undefined,
  );

  return (
    <div className="flex flex-col space-y-8">
      <p className="text-base text-fg-muted">{t("settings.plugins.description")}</p>
      {panels.length === 0 && (
        <p className="text-base text-fg-muted">{t("settings.plugins.empty")}</p>
      )}
      {panels.map((plugin) => (
        <plugin.SettingsPanel key={plugin.id} />
      ))}
    </div>
  );
};

export default PluginsSettings;
