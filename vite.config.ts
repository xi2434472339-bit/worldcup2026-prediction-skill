import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const staticDeployment = process.env.VITE_STATIC_DEPLOYMENT === "true";

  return {
    base: staticDeployment ? "/worldcup2026-prediction-skill/" : "/",
    plugins: [react()],
    server: {
      port: 5173,
    },
  };
});
