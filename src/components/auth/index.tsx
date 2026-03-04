import { Outlet } from "react-router-dom";

const Auth: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-gray-100 to-gray-200 bg-fixed">
      <div className="w-full max-w-lg flex flex-col items-center">
        <Outlet />
      </div>
    </div>
  );
};

export default Auth;
