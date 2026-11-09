import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/router/routes";
import { searchSettings } from "@/utils/settings/search";

interface Props {
  /** The section list, shown while the search is empty. */
  children: React.ReactNode;
}

/** Finds a setting by name and opens its section with the field highlighted. */
const SettingsSearch: React.FC<Props> = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const hits = searchSettings(query, (key) => t(key));

  return (
    <>
      <div className="mb-2">
        <Input
          clearable
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("settings.search_placeholder")}
          aria-label={t("settings.search_placeholder")}
        />
      </div>
      {query.trim() === "" ? (
        children
      ) : hits.length === 0 ? (
        <p className="px-4 py-3 text-base text-fg-muted">{t("settings.search_no_results")}</p>
      ) : (
        hits.map((hit) => (
          <ListRow
            key={`${hit.section}:${hit.setting ?? ""}`}
            title={hit.title}
            subtitle={hit.setting ? hit.sectionTitle : undefined}
            navigates
            onClick={() => {
              setQuery("");
              navigate(ROUTES.settingsSection(hit.section), {
                replace: true,
                state: hit.setting ? { setting: hit.setting } : null,
              });
            }}
          />
        ))
      )}
    </>
  );
};

export default SettingsSearch;
