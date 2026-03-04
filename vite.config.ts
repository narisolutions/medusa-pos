import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite';
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "child_process";

const host = process.env.TAURI_DEV_HOST;

function getGitVersion(): string {
  try {
    execSync('git fetch --tags --quiet', { encoding: 'utf-8', stdio: 'ignore' });
  } catch {
    void 0;
  }
  
  try {
    const tags = execSync('git tag -l "release-*"', { encoding: 'utf-8' }).trim();
    if (!tags) return 'dev';

    const tagList = tags.split('\n').filter(Boolean);
    if (tagList.length === 0) return 'dev';

    const sortedTags = tagList.sort((a, b) => {
      const vA = a.replace(/^release-/, '').split('.').map(Number);
      const vB = b.replace(/^release-/, '').split('.').map(Number);
      
      for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
        const diff = (vB[i] || 0) - (vA[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

    return sortedTags[0].replace(/^release-/, '');
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
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(getGitVersion()),
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
  },
}));
