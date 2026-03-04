import Login from "@/components/auth/login";
import withErrorBoundary from "@/components/hoc/with-error-boundary";
import React from "react";

const LoginPage: React.FC = () => {
  return <Login />;
};

const LoginPageWithErrorBoundary = withErrorBoundary({ component: "LoginPage" })(LoginPage);

export default LoginPageWithErrorBoundary
