import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    allowedHosts: ["hh-frontend.onrender.com"],
    proxy: {
      "/api": {
        target: "https://hh-backend-dxl9.onrender.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    allowedHosts: ["hh-frontend.onrender.com"],
  },
});
