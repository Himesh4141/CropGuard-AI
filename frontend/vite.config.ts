import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": "/src",
    },
  },

  server: { proxy: { "/api": { target: "https://cropguard-api-himesh4141.onrender.com", changeOrigin: true, secure: true, cookieDomainRewrite: "" } },
    host: "0.0.0.0",
    port: 4141,
    strictPort: true,
  },

  preview: {
    host: "0.0.0.0",
    port: 4142,
    strictPort: true,
  },

  build: {
    target: "es2022",
    sourcemap: false,
    reportCompressedSize: true,
  },
});
