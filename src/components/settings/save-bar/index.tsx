import React from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface Props {
  dirty: boolean;
  saving: boolean;
  disabled?: boolean;
  /** Leave out where a change applies live (e.g. theme) and can't simply be reset. */
  onDiscard?: () => void;
  saveLabel: string;
  savingLabel: string;
}

/** A form's Save, pinned to the bottom of the screen and flagged while changes are unsaved. */
const SaveBar: React.FC<Props> = ({ dirty, saving, disabled, onDiscard, saveLabel, savingLabel }) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
        // Pinned only while there is something to save; otherwise it sits at the form's end.
        dirty ? "sticky bottom-0 z-10 border-warning bg-surface-elevated shadow-lg" : "border-transparent px-0"
      )}
    >
      {dirty && (
        <span role="status" className="flex items-center gap-2 text-base font-medium text-warning-text">
          <CircleAlert className="size-5" aria-hidden />
          {t("settings.unsaved_changes")}
        </span>
      )}
      <div className="ml-auto flex gap-3">
        {dirty && onDiscard && (
          <Button type="button" variant="outline" size="lg" onClick={onDiscard} disabled={saving} className="px-6">
            {t("settings.discard_changes")}
          </Button>
        )}
        <Button type="submit" size="lg" disabled={!dirty || disabled} loading={saving} className="px-8">
          {saving ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
};

export default SaveBar;
