import { create } from "zustand";

interface State {
  needsSetup: boolean;
  setNeedsSetup: (value: boolean) => void;
}

const useStore = create<State>((set) => ({
  needsSetup: false,
  setNeedsSetup: (value) => set({ needsSetup: value }),
}));

export { useStore };
