import { LoadingSpinner } from "@/components/ui/loading-spinner";
import React from "react";

interface Props {
  loading: boolean;
}

const Backdrop: React.FC<Props> = ({ loading }) => {
  return loading ? (
    <div className="fixed top-0 left-0 z-50 w-full h-full bg-black/20  flex items-center justify-center">
      <LoadingSpinner size={36} />
    </div>
  ) : null;
};

export default Backdrop;
