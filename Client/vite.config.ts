import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely: keeping them in their own files lets browsers reuse them after each deploy
        manualChunks: {
          react: ["react", "react-dom"],
          data: ["@tanstack/react-query", "axios"],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
