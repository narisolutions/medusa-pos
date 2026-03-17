import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "@/context/user";
import Backdrop from "../base/backdrop";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const globalLoading = useUser((state) => state.globalLoading);

  if (globalLoading) {
    return <Backdrop loading={true} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
