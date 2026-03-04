import { useNavigate } from "react-router-dom";
import { getRoutes } from "@/utils/helpers";
import { useState } from "react";

const useAuth = () => {
  const [authPage, setAuthPage] = useState<"login" | "setup">("login");
  const navigate = useNavigate();
  const routes = getRoutes();

  const onBack = () => {
    navigate(-1);
    setAuthPage("login");
  };

  const onSetup = () => {
    navigate(routes.setup);
    setAuthPage("setup");
  };

  return { onBack, onSetup, authPage };
};

export { useAuth };
