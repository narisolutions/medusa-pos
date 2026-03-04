import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import storage from "@/utils/storage";
import { useUser } from "@/context/user";
import Backdrop from "../base/backdrop";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const globalLoading = useUser((state) => state.globalLoading);
  const [hasLastLogin, setHasLastLogin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLastLogin = async () => {
      const lastLogin = await storage.getItem("last_login");
      setHasLastLogin(!!lastLogin);
    };
    checkLastLogin();
  }, []);

  if (hasLastLogin === null || globalLoading) {
    return <Backdrop loading={true} />;
  }

  if (!isAuthenticated && !hasLastLogin) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
