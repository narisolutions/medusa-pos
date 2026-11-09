import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/config/query";
import storage from "@/utils/storage";
import type { RegisterSession } from "@/types/register";

/** The till's closed sessions, newest first, exactly as stored at close. */
const useSessionBook = () =>
  useQuery<RegisterSession[]>({
    queryKey: queryKeys.registerHistory,
    queryFn: async () => {
      const stored = await storage.getItem<RegisterSession[]>("closed_register_sessions");
      return Array.isArray(stored) ? stored : [];
    },
    // Local and cheap: read fresh every time the book opens, so a close just made is in it.
    staleTime: 0,
  });

export { useSessionBook };
