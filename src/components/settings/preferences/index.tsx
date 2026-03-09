import React from "react";
import DateTimeSettings from "./date-time";
import DisplaySettings from "./display";

const PreferencesSettings: React.FC = () => {
  return (
    <div className="flex flex-col h-full space-y-10">
      <div className="border-b border-gray-200 pb-6">
        <p className="text-lg leading-relaxed text-gray-600 font-medium">
          Customize how the application looks and behaves
        </p>
      </div>

      <section>
        <h3 className="text-xl font-semibold mb-6">Date & Time</h3>
        <DateTimeSettings />
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <h3 className="text-xl font-semibold mb-6">Display</h3>
        <DisplaySettings />
      </section>
    </div>
  );
};

export default PreferencesSettings;
