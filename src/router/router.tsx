import React from "react";
import {
  createHashRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
} from "react-router-dom";
import { Layout } from "@/components/layout";
import Login from "@/pages/login";
import Orders from "@/pages/orders";
import Checkout from "@/pages/checkout";
import Settings from "@/pages/settings";
import Order from "@/pages/order";
import ProtectedRoute from "@/components/router";
import Auth from "@/components/auth";

const router = createHashRouter(
  createRoutesFromElements(
    <React.Fragment>
      <Route element={<Auth />}>
        <Route path="/sign-in" element={<Login />} />
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
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:orderId" element={<Order />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </React.Fragment>
  )
);

export default router;
