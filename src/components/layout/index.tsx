import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./Sidebar";
import Header from "./Header";
import StoreSetupModal from "@/components/base/store-setup-dialog";
import SalesChannelWarningDialog from "@/components/base/sales-channel-dialog";

export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen">
        <Header />
        <main className="flex-1 min-h-0 overflow-auto">
          <div className="h-full w-full p-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <StoreSetupModal />
      <SalesChannelWarningDialog />
    </SidebarProvider>
  );
}
