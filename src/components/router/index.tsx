import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "@/context/user";
import { ROUTES } from "@/router/routes";
import { protectedRouteOutcome } from "@/router/guards";

const ProtectedRoute = () => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);
  const globalLoading = useUser((state) => state.globalLoading);
  const outcome = protectedRouteOutcome({ isAuthenticated, globalLoading });

  // App already shows the backdrop while a login finishes.
  if (outcome === "wait") return null;
  if (outcome === "sign-in") return <Navigate to={ROUTES.signIn} replace />;
  return <Outlet />;
};

export default ProtectedRoute;
