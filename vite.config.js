import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiBaseUrl =
    env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

  return {
    define: {
      __DAYFLOW_API_BASE_URL__: JSON.stringify(apiBaseUrl),
    },
    plugins: [react()],
  };
});
