import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Proxy de /api/v1 -> backend FastAPI en desarrollo, para no pelear con CORS
// mientras trabajas local. En producción, VITE_API_BASE_URL apunta al backend real.
const BACKEND_DEV_URL = "http://localhost:8000";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "FORTIMETAL",
        short_name: "FORTIMETAL",
        description: "Cotizador, calculadora de metrados y proveedores para estructuras metálicas.",
        theme_color: "#1A1A1A",
        background_color: "#EDEEEC",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api/v1": {
        target: BACKEND_DEV_URL,
        changeOrigin: true,
      },
    },
  },
});
