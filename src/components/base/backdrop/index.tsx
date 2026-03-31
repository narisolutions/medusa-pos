import { LoadingSpinner } from "@/components/ui/loading-spinner";
import React from "react";

interface Props {
  loading: boolean;
  showLogo?: boolean;
  message?: string;
}

const Backdrop: React.FC<Props> = ({ loading, showLogo, message }) => {
  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 z-50 w-full h-full bg-black/20 flex items-center justify-center">
      {showLogo ? (
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.svg" alt="Medusa POS" className="h-28 w-auto object-contain" />
          <LoadingSpinner size={28} />
          {message && (
            <p className="text-xs text-zinc-500 tracking-wide">{message}</p>
          )}
        </div>
      ) : (
        <LoadingSpinner size={36} />
      )}
    </div>
  );
};

export default Backdrop;
