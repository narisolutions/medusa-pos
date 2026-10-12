import { logger, safeStringify } from "@/utils/logger";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUser } from "@/context/user";
import { NavLink, useNavigate } from "react-router-dom";
import { Bookmark, ChevronLeft, LogOut, Settings, Loader2, Palette } from "lucide-react";
import Payments from "@/assets/icons/payments";
import Checkout from "@/assets/icons/checkout";
import { useUnfulfilledOrdersCount } from "@/hooks/queries/useUnfulfilledOrdersCount";
import { useParkedSalesCount } from "@/hooks/queries/useParkedSalesCount";
import { plugins } from "@/plugins";
import { useTranslation } from "@/i18n";
import RegisterMenuItem from "@/components/register/register-menu-item";
import { ROUTES } from "@/router/routes";
import { useState } from "react";
import LogoutDialog from "./logout-dialog";

const AppSidebar = () => {
  const sidebar = useSidebar();
  const logout = useUser((state) => state.logout);
  const navigate = useNavigate();
  const unfulfilled = useUnfulfilledOrdersCount();
  const parked = useParkedSalesCount();
  const { t } = useTranslation();
  const [isLogoutOpen, setLogoutOpen] = useState(false);

  const mainMenuItems = [
    { id: "checkout", label: t("nav.pos"), to: "/checkout", icon: Checkout },
    {
      id: "parked",
      label: t("nav.parked"),
      to: "/parked",
      icon: Bookmark,
      badge: parked.data ?? 0,
      badgeLoading: parked.isLoading,
    },
    {
      id: "orders",
      label: t("nav.orders"),
      to: "/orders",
      icon: Payments,
      badge: unfulfilled.data ?? 0,
      // Pending covers the deliberate delay before the first scan, not only the request.
      badgeLoading: unfulfilled.isPending,
    },
  ];

  const bottomMenuItems = [
    // Dev builds only: the UI catalogue, for reviewing components on the touchscreen.
    ...(import.meta.env.DEV ? [{ id: "dev-ui", label: "UI kit", to: ROUTES.devUi, icon: Palette }] : []),
    { id: "settings", label: t("nav.settings"), to: "/settings", icon: Settings },
    { id: "logout", label: t("nav.logout"), to: "/sign-in", icon: LogOut },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.signIn);
    } catch (error) {
      void logger.error(`Logout failed: ${safeStringify(error)}`);
    }
  };

  return (
    <Sidebar>
      <SidebarContent className="flex flex-col h-full">
        <SidebarHeader className="h-24 flex flex-col items-center justify-center shadow gap-2">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => sidebar.toggleSidebar()}
            aria-label={t("nav.collapse")}
          >
            <ChevronLeft className="size-8" />
          </Button>
        </SidebarHeader>

        <SidebarMenu className="px-2 py-6 flex-1">
          {mainMenuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col min-h-tap-xl items-center justify-center gap-1 px-2 py-3 w-full text-center rounded-md text-fg-muted relative active:bg-accent ${
                    isActive
                      ? "bg-(--color-bg-base) border border-primary text-primary"
                      : ""
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <item.icon
                        className={`size-8 ${isActive ? "text-primary" : ""}`}
                      />
                      {"badgeLoading" in item && item.badgeLoading ? (
                        <span
                          role="status"
                          aria-label={t("common.loading")}
                          className="absolute -top-2 -right-3 flex items-center justify-center size-6 rounded-full bg-primary ring-2 ring-surface"
                        >
                          <Loader2 className="size-4 animate-spin text-primary-foreground" />
                        </span>
                      ) : !!item.badge && item.badge > 0 && (
                        <span className="absolute -top-2 -right-3 flex items-center justify-center min-w-6 h-6 px-1.5 text-base leading-none font-semibold tabular-nums text-primary-foreground bg-primary rounded-full ring-2 ring-surface">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </div>
                    <span className="block w-full text-base font-medium leading-tight text-center whitespace-normal break-words">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
          {plugins.map(
            (plugin) => plugin.NavItem && <plugin.NavItem key={plugin.id} />,
          )}
        </SidebarMenu>

        {/* Settings and Log out sit apart from the work items. */}
        <SidebarMenu className="px-2 pt-4 pb-6 mt-auto border-t border-theme-border">
          <RegisterMenuItem />
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              {item.id === "logout" ? (
                <Button
                  onClick={() => setLogoutOpen(true)}
                  variant="ghost"
                  className="flex flex-col h-auto min-h-tap-xl items-center justify-center gap-1 px-2 py-3 w-full text-center rounded-md"
                >
                  <item.icon className="size-8 text-fg-muted" />
                  <span className="block w-full text-base font-medium text-fg-muted leading-tight text-center whitespace-normal break-words">
                    {item.label}
                  </span>
                </Button>
              ) : (
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex flex-col min-h-tap-xl items-center justify-center gap-1 px-2 py-3 w-full text-center rounded-md text-fg-muted active:bg-accent ${
                      isActive
                        ? "bg-(--color-bg-base) border border-primary text-primary"
                        : ""
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`size-8 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="block w-full text-base font-medium leading-tight text-center whitespace-normal break-words">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <div className="text-sm text-fg-subtle font-mono text-center pb-4">
          v{import.meta.env.VITE_APP_VERSION || "0.0.0"}
        </div>
      </SidebarContent>
      <LogoutDialog open={isLogoutOpen} onOpenChange={setLogoutOpen} onConfirm={handleLogout} />
    </Sidebar>
  );
};

export default AppSidebar;
