import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL("./rewrite/", import.meta.url)),
  plugins: [react()],
  server: {
    port: 8081,
    strictPort: true,
  },
  preview: {
    port: 8081,
    strictPort: true,
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist-rewrite/", import.meta.url)),
    emptyOutDir: true,
  },
});
