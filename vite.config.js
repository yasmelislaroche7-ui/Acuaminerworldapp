import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5000,
    host: true,
    allowedHosts: true,
  },

  define: {
    global: "globalThis",
  },

  build: {
    sourcemap: false,
    target: "es2020",
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "INVALID_ANNOTATION") return;
        if (warning.code === "CIRCULAR_DEPENDENCY") return;
        warn(warning);
      },
    },
  },

  optimizeDeps: {
    exclude: ["@reown/appkit"],
    esbuildOptions: {
      sourcemap: false,
      ignoreAnnotations: true,
      target: "es2020",
    },
  },
});
