import type { ComponentType, ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";

/**
 * POS plugin registry. A plugin contributes UI and lifecycle hooks through
 * this typed seam; the core app stays plugin-agnostic.
 *
 * Private/commercial plugins are mounted via `./local.ts` (gitignored, see
 * .gitignore) which default-exports a `PosPlugin[]`. A checkout without that
 * file builds with an empty registry — nothing else changes.
 */
export type PosPlugin = {
  id: string;
  /** Sidebar entry, rendered inside the main SidebarMenu; owns its visibility. */
  NavItem?: ComponentType;
  /** Route mounted under the protected layout. */
  route?: { path: string; Page: ComponentType };
  /** Panel rendered under Settings → Plugins. */
  SettingsPanel?: ComponentType;
  /** App-wide provider mounted in the Layout (subscriptions, sounds, badges). */
  Provider?: ComponentType<{ children: ReactNode }>;
  /** Called on login/logout so session-scoped caches can't leak across users. */
  resetSessionCaches?: (queryClient: QueryClient) => void;
  /** Called when the backend URL changes. */
  resetBackendCaches?: (queryClient: QueryClient) => void;
};

// import.meta.glob tolerates ./local.ts being absent — public checkouts get [].
const localModules = import.meta.glob<{ default: PosPlugin[] }>("./local.ts", {
  eager: true,
});

export const plugins: PosPlugin[] = Object.values(localModules).flatMap(
  (module) => module.default,
);
