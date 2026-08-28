import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "src",
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: {
    // Tauri 从项目根目录的 dist 读取资源，必须与 frontendDist 保持一致。
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: { main: "src/index.html", settings: "src/settings.html" },
    },
  },
});
