import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        timeout: 10000,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            // Silently handle connection errors during startup
            // The frontend will retry automatically when components mount
            if (err.code !== "ECONNREFUSED") {
              console.debug("[Proxy] Connection error:", err.message);
            }
          });
        }
      }
    }
  }
});
