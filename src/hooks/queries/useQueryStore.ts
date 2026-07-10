import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { AdminStore } from "@medusajs/types";
import { getSdk } from "@/config/medusa";
import { queryKeys } from "@/config/query";
import { handleErrorToast } from "@/utils/helpers";
import { useUser } from "@/context/user";

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
    queryKey: queryKeys.store,
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
    mutationFn: async ({ storeId, payload }) => {
      const sdk = getSdk();
      const { store } = await sdk.admin.store.update(storeId, payload);
      return store as AdminStore;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.store });
    },
    onError: (error) => handleErrorToast(error),
  });
};

export { useQueryStore, useUpdateStore, fetchStore };
