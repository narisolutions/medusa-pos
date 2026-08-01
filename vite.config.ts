import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite';
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

/**
 * src/plugins/ entries may be symlinks to out-of-repo plugin checkouts (see
 * src/plugins/index.ts); Vite's dev-server fs guard needs their REAL paths.
 */
function pluginRealPaths(): string[] {
  const roots = [
    path.resolve(__dirname, "src/plugins"),
    // linked (yarn link) workspace deps plugins build against
    path.resolve(__dirname, "node_modules/@narisolutions"),
  ];
  const real: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      try {
        const resolved = fs.realpathSync(path.join(root, entry));
        if (!resolved.startsWith(__dirname)) real.push(resolved);
      } catch {
        /* dangling symlink — ignore */
      }
    }
  }
  return real;
}

const host = process.env.TAURI_DEV_HOST;

function getGitVersion(): string {
  // CI sets APP_VERSION to the release version
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  // Local tags only — fetching here blocked every dev start on the network.

  try {
    const tags = execSync('git tag -l "v*.*.*"', { encoding: 'utf-8' }).trim();
    if (!tags) return 'dev';

    const tagList = tags.split('\n').filter(Boolean);
    if (tagList.length === 0) return 'dev';

    const sortedTags = tagList.sort((a, b) => {
      const vA = a.replace(/^v/, '').split('.').map(Number);
      const vB = b.replace(/^v/, '').split('.').map(Number);

      for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
        const diff = (vB[i] || 0) - (vA[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

    return sortedTags[0].replace(/^v/, '');
  } catch {
    return 'dev';
  }
}

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Symlinked plugin sources (src/plugins/*) and linked packages resolve bare
    // imports from their REAL location — force host-app copies for everything
    // that must be a singleton here (React tree, query/router/i18n contexts,
    // Tauri plugin bindings, form state).
    dedupe: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "i18next",
      "react-i18next",
      "lucide-react",
      "react-hook-form",
      "@hookform/resolvers",
      "@tauri-apps/plugin-http",
      "@tauri-apps/plugin-store",
    ],
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(getGitVersion()),
  },
  build: {
    // Tauri ships its own WebView — no need to downlevel for legacy browsers.
    target: "esnext",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Vendor code changes far less often than app code; splitting it keeps
        // the big dependency chunks cached across releases.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (/[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id))
            return "vendor-react";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("@medusajs")) return "vendor-medusa";
          if (/(react-hook-form|@hookform|zod)/.test(id)) return "vendor-forms";
        },
      },
    },
  },
  clearScreen: false,
  server: {
    port: 3000,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    fs: {
      allow: [".", ...pluginRealPaths()],
    },
  },
}));
