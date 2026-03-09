import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import PrinterSettings from "./printer";
import ApiSettings from "./preferences";
import StoreSettings from "./store";
import DateTimeSettings from "./date-time";
import storage from "@/utils/storage";

type SettingsTabs = "printer" | "preferences" | "store" | "date-time";

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
    <div className="bg-white p-12 rounded-lg flex flex-col space-y-8">
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
        <TabsList className="flex justify-start w-full border-b border-gray-200 bg-transparent p-0 h-auto">
          <TabsTrigger
            value="printer"
            className="text-lg px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-gray-600 bg-transparent rounded-none min-h-[48px]"
          >
            Printer
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="text-lg px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-gray-600 bg-transparent rounded-none min-h-[48px]"
          >
            Preferences
          </TabsTrigger>
          <TabsTrigger
            value="store"
            className="text-lg px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-gray-600 bg-transparent rounded-none min-h-[48px]"
          >
            Store
          </TabsTrigger>
          <TabsTrigger
            value="date-time"
            className="text-lg px-6 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-gray-600 bg-transparent rounded-none min-h-[48px]"
          >
            Date & Time
          </TabsTrigger>
        </TabsList>

        <TabsContent value="printer" className="flex flex-col">
          <PrinterSettings />
        </TabsContent>

        <TabsContent value="preferences" className="flex flex-col">
          <ApiSettings />
        </TabsContent>

        <TabsContent value="store" className="flex flex-col">
          <StoreSettings />
        </TabsContent>

        <TabsContent value="date-time" className="flex flex-col">
          <DateTimeSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
