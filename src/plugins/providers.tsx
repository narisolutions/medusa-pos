import type { ReactNode } from "react";
import { plugins } from "@/plugins";

/** Nests every registered plugin Provider around the app content (Layout). */
export function PluginProviders(props: { children: ReactNode }) {
  return plugins.reduceRight(
    (children, plugin) =>
      plugin.Provider ? <plugin.Provider>{children}</plugin.Provider> : children,
    <>{props.children}</>,
  );
}
