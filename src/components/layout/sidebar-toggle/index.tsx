import React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useTranslation } from "@/i18n";

/**
 * The one control that folds and unfolds the sidebar, pinned to the same spot on screen
 * in both states, so the cashier's hand finds it without looking. Open, it sits centred
 * in the sidebar's top bar; folded, the header leaves the same place free for it.
 */
const SidebarToggle: React.FC = () => {
  const { t } = useTranslation();
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label={isOpen ? t("nav.collapse") : t("nav.expand")}
      aria-expanded={isOpen}
      className="fixed top-6 left-9 z-30"
    >
      {isOpen ? <PanelLeftClose className="size-7" /> : <PanelLeftOpen className="size-7" />}
    </Button>
  );
};

export default SidebarToggle;
