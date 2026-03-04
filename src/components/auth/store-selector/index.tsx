import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

import { useStoreManager } from "@/context/store-manager";
import StoreSwitcherDialog from "./store-switcher-dialog";
import { Button } from "@/components/ui/button";
import MedusaIcon from "@/assets/icons/medusa";

const StoreSelectorBox: React.FC = () => {
  const { activeStore } = useStoreManager();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="w-full h-auto justify-start gap-4 px-5 py-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:bg-gray-200"
        aria-label="Select store"
      >
        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-white border border-gray-200 shrink-0">
          {activeStore?.logo ? (
            <img
              src={activeStore.logo}
              alt={activeStore.name}
              className="h-10 w-10 object-contain rounded-lg"
            />
          ) : (
            <MedusaIcon className="size-10 shrink-0" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {activeStore ? (
            <p className="text-lg font-semibold text-gray-800 truncate">{activeStore.name}</p>
          ) : (
            <p className="text-base text-gray-400 italic truncate">No store selected — add one to continue</p>
          )}
        </div>

        <ChevronDown size={20} className="text-gray-400 shrink-0" />
      </Button>

      <StoreSwitcherDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default StoreSelectorBox;
