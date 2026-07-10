import { useRef, useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./sidebar";
import Header from "./header";
import StoreSetupModal from "@/components/base/store-setup-dialog";
import SalesChannelWarningDialog from "@/components/base/sales-channel-dialog";
import { RegisterProvider } from "@/context/register";
import RegisterDialogs from "@/components/register/register-dialogs";

export function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <RegisterProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen">
          <Header />
          <main ref={mainRef} className="flex-1 min-h-0 overflow-auto">
            <div className="h-full w-full p-6">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
        <StoreSetupModal />
        <SalesChannelWarningDialog />
      </SidebarProvider>
      <RegisterDialogs />
    </RegisterProvider>
  );
}
