import { create } from "zustand";

interface State {
  salesChannelId: string | undefined;
  needsWarning: boolean;
  setSalesChannelId: (id: string | undefined) => void;
  setNeedsWarning: (value: boolean) => void;
}

const useSalesChannel = create<State>((set) => ({
  salesChannelId: undefined,
  needsWarning: false,
  setSalesChannelId: (id) =>
    set((state) => ({
      salesChannelId: id,
      needsWarning: id ? false : state.needsWarning,
    })),
  setNeedsWarning: (value) => set({ needsWarning: value }),
}));

export { useSalesChannel };
