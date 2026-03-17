import { Outlet } from "react-router-dom";

const Auth: React.FC = () => {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-linear-to-br from-gray-100 to-gray-200 dark:from-slate-900 dark:to-slate-800 bg-fixed">
      <div className="w-full max-w-lg flex flex-col items-center">
        <Outlet />
      </div>
      <span className="absolute bottom-4 right-4 text-xs text-fg-muted/50">
        Press F11 to toggle fullscreen
      </span>
    </div>
  );
};

export default Auth;
