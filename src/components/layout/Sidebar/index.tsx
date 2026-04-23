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
import { ChevronLeft, LogOut, Settings } from "lucide-react";
import Payments from "@/assets/icons/payments";
import Checkout from "@/assets/icons/checkout";
import { useUnfulfilledOrdersCount } from "@/hooks/queries/useUnfulfilledOrdersCount";
import { useTranslation } from "@/i18n";

const AppSidebar = () => {
  const sidebar = useSidebar();
  const logout = useUser((state) => state.logout);
  const navigate = useNavigate();
  const { data: unfulfilledCount = 0 } = useUnfulfilledOrdersCount();
  const { t } = useTranslation();

  const mainMenuItems = [
    { id: "checkout", label: t("nav.pos"), to: "/checkout", icon: Checkout },
    { id: "orders", label: t("nav.orders"), to: "/orders", icon: Payments },
  ];

  const bottomMenuItems = [
    { id: "settings", label: t("nav.settings"), to: "/settings", icon: Settings },
    { id: "logout", label: t("nav.logout"), to: "/sign-in", icon: LogOut },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/sign-in");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sidebar>
      <SidebarContent className="flex flex-col h-full">
        <SidebarHeader className="h-24 flex flex-col items-center justify-center shadow gap-2">
          <Button
            variant="ghost"
            className="size-7"
            onClick={() => sidebar.toggleSidebar()}
          >
            <ChevronLeft className="size-10" />
          </Button>
        </SidebarHeader>

        <SidebarMenu className="px-4 py-6 flex-1">
          {mainMenuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col h-auto items-center justify-center p-4 w-full text-center rounded-md text-fg-muted relative ${
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
                        className={`size-8 mb-0.5 ${isActive ? "text-primary" : ""}`}
                      />
                      {item.id === "orders" && unfulfilledCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-xs font-medium text-white bg-primary rounded-full">
                          {unfulfilledCount > 99 ? "99+" : unfulfilledCount}
                        </span>
                      )}
                    </div>
                    <span className="text-base font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarMenu className="px-4 pb-6 mt-auto">
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              {item.id === "logout" ? (
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="flex flex-col h-auto items-center justify-center p-4 w-full text-center rounded-md"
                >
                  <item.icon className="size-8 text-fg-muted" />
                  <span className="text-base font-medium text-fg-muted">
                    {item.label}
                  </span>
                </Button>
              ) : (
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex flex-col h-auto items-center justify-center p-4 w-full text-center rounded-md text-fg-muted ${
                      isActive
                        ? "bg-(--color-bg-base) border border-primary text-primary"
                        : ""
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`size-8 mb-0.5 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="text-base font-medium">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <div className="text-xs text-fg-subtle font-mono text-center pb-4">
          v{import.meta.env.VITE_APP_VERSION || "0.0.0"}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
