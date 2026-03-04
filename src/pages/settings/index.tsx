import withErrorBoundary from "@/components/hoc/with-error-boundary";
import Settings from "@/components/settings";

const SettingsPage = () => {
  return <Settings />;
};

const SettingsPageWithErrorBoundary = withErrorBoundary({
  component: "SettingsPage",
})(SettingsPage);

export default SettingsPageWithErrorBoundary;
