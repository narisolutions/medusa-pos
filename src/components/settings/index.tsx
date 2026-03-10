import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import PrinterSettings from "./printer";
import ConnectionSettings from "./connection";
import StoreSettings from "./store";
import PreferencesSettings from "./preferences";
import storage from "@/utils/storage";

type SettingsTabs = "printer" | "connection" | "store" | "preferences";

const Settings: React.FC = () => {
  const [settingsTab, setSettingsTab] = useState<SettingsTabs>("printer");

  useEffect(() => {
    const loadStoredTab = async () => {
      const storedTab = await storage.getItem("settings_tab");
      if (storedTab) {
        setSettingsTab(storedTab as SettingsTabs);
      }
    };

    loadStoredTab();
  }, []);

  return (
    <div className="bg-surface p-12 rounded-lg flex flex-col space-y-8">
      <Tabs
        value={settingsTab}
        className="flex flex-col space-y-8"
        onValueChange={async (val) => {
          if (val === "printer") {
            setSettingsTab(val as SettingsTabs);
            await storage.removeItem("settings_tab");
          } else {
            setSettingsTab(val as SettingsTabs);
            await storage.setItem("settings_tab", val);
          }
        }}
      >
        <TabsList className="flex justify-start w-full border-b border-theme-border bg-transparent p-0 h-auto">
          <TabsTrigger
            value="printer"
            className="text-lg px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-fg-muted bg-transparent rounded-none min-h-[48px]"
          >
            Printer
          </TabsTrigger>
          <TabsTrigger
            value="connection"
            className="text-lg px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-fg-muted bg-transparent rounded-none min-h-[48px]"
          >
            Connection
          </TabsTrigger>
          <TabsTrigger
            value="store"
            className="text-lg px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-fg-muted bg-transparent rounded-none min-h-[48px]"
          >
            Store
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="text-lg px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-fg-muted bg-transparent rounded-none min-h-[48px]"
          >
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="printer" className="flex flex-col">
          <PrinterSettings />
        </TabsContent>

        <TabsContent value="connection" className="flex flex-col">
          <ConnectionSettings />
        </TabsContent>

        <TabsContent value="store" className="flex flex-col">
          <StoreSettings />
        </TabsContent>

        <TabsContent value="preferences" className="flex flex-col">
          <PreferencesSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
