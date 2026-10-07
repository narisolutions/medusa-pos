import { createRoutesFromElements, Navigate, Route } from "react-router-dom";
import { Layout } from "@/components/layout";
import ProtectedRoute from "@/components/router";
import RouteError from "@/components/router/route-error";
import Auth from "@/components/auth";
import { plugins } from "@/plugins";
import { logger } from "@/utils/logger";
import Login from "@/pages/login";
import Orders from "@/pages/orders";
import Parked from "@/pages/parked";
import Checkout from "@/pages/checkout";
import Settings from "@/pages/settings";
import Order from "@/pages/order";
import { ROUTES } from "./routes";

// Pages load eagerly: chunks come from local disk in Tauri, so lazy loading only added a spinner per page.

const corePaths = new Set(
  Object.values(ROUTES)
    .filter((path) => typeof path === "string")
    .map((path) => path.split("/")[1])
);

const pluginRoutes = plugins.flatMap((plugin) => {
  if (!plugin.route) return [];
  if (corePaths.has(plugin.route.path.replace(/^\//, "").split("/")[0])) {
    void logger.warn(`Plugin "${plugin.id}" route "${plugin.route.path}" clashes with a core route; skipped`);
    return [];
  }
  return [{ id: plugin.id, ...plugin.route }];
});

const routes = createRoutesFromElements(
  <Route errorElement={<RouteError fullScreen />}>
    <Route element={<Auth />}>
      <Route path={ROUTES.signIn} element={<Login />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route path="/" element={<Layout />}>
        {/* A crashed page keeps the sidebar, so the cashier can move on. */}
        <Route errorElement={<RouteError />}>
          <Route index element={<Navigate to={ROUTES.checkout} replace />} />
          <Route path={ROUTES.checkout} element={<Checkout />} />
          <Route path={ROUTES.orders}>
            <Route index element={<Orders />} />
            <Route path=":orderId" element={<Order />} />
          </Route>
          <Route path={ROUTES.parked} element={<Parked />} />
          <Route path={ROUTES.settings} element={<Settings />} />
          {pluginRoutes.map(({ id, path, Page }) => (
            <Route key={id} path={path} element={<Page />} />
          ))}
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Route>
);

export { routes };
