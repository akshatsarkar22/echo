import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: path.resolve(__dirname, "node_modules/buffer"),
      events: path.resolve(__dirname, "node_modules/events"),
    },
  },
  optimizeDeps: {
    include: ["buffer", "events"],
    exclude: ["@solana/wallet-adapter-wallets"],
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
});
