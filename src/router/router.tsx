import React, { Suspense, lazy } from "react";
import {
  createHashRouter,
  createRoutesFromElements,
  Navigate,
  Route,
} from "react-router-dom";
import { Layout } from "@/components/layout";
import ProtectedRoute from "@/components/router";
import Auth from "@/components/auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { plugins } from "@/plugins";

// Pages are lazy so each route ships as its own chunk, off the boot path.
const Login = lazy(() => import("@/pages/login"));
const Orders = lazy(() => import("@/pages/orders"));
const Checkout = lazy(() => import("@/pages/checkout"));
const Settings = lazy(() => import("@/pages/settings"));
const Order = lazy(() => import("@/pages/order"));

const PageFallback = () => (
  <div className="flex h-full min-h-[50vh] items-center justify-center">
    <LoadingSpinner size={36} />
  </div>
);

const page = (element: React.ReactNode) => (
  <Suspense fallback={<PageFallback />}>{element}</Suspense>
);

const router = createHashRouter(
  createRoutesFromElements(
    <React.Fragment>
      <Route element={<Auth />}>
        <Route path="/sign-in" element={page(<Login />)} />
      </Route>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/checkout" replace />} />
        <Route path="orders" element={page(<Orders />)} />
        <Route path="orders/:orderId" element={page(<Order />)} />
        <Route path="checkout" element={page(<Checkout />)} />
        <Route path="settings" element={page(<Settings />)} />
        {plugins.map(
          (plugin) =>
            plugin.route && (
              <Route
                key={plugin.id}
                path={plugin.route.path}
                element={page(<plugin.route.Page />)}
              />
            ),
        )}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </React.Fragment>
  )
);

export default router;
