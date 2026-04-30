import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { AdminStore } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";

export const STORE_QUERY_KEY = ["store"] as const;

const fetchStore = async (): Promise<AdminStore | null> => {
  try {
    const sdk = getSdk();
    const { stores } = await sdk.admin.store.list();
    return (stores[0] as AdminStore) ?? null;
  } catch (error) {
    handleErrorToast(error);
    return null;
  }
};

const useQueryStore = (): UseQueryResult<AdminStore | null, Error> => {
  const isAuthenticated = useUser((state) => state.isAuthenticated);

  return useQuery<AdminStore | null, Error>({
    queryKey: STORE_QUERY_KEY,
    queryFn: fetchStore,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
};

export interface UpdateStorePayload {
  name?: string;
  metadata?: Record<string, unknown>;
}

const useUpdateStore = (): UseMutationResult<
  AdminStore,
  Error,
  { storeId: string; payload: UpdateStorePayload }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      payload,
    }: {
      storeId: string;
      payload: UpdateStorePayload;
    }) => {
      const sdk = getSdk();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { store } = await sdk.admin.store.update(storeId, payload as any);
      return store as AdminStore;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORE_QUERY_KEY });
    },
    onError: (error: unknown) => handleErrorToast(error),
  });
};

export { useQueryStore, useUpdateStore, fetchStore };
