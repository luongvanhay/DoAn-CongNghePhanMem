import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      "/api/payments": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },

      "/api/tts": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },

      // API quản lý nội dung/POI
      "/api/content": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },

      // API đăng nhập
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => {
          if (path.startsWith("/api/auth/")) {
            return path.replace(/^\/api/, "");
          }
          return path;
        },
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
          });
        },
      },

      "/payments/vnpay/return": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },

      "/payments": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },

      "/content": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
