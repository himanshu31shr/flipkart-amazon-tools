  import { defineConfig } from "vite";
  import react from "@vitejs/plugin-react";
  import { VitePWA } from "vite-plugin-pwa";

  // https://vite.dev/config/
  export default defineConfig({
    plugins: [
      react(),
      VitePWA({
        manifest: {
          name: "Sacred Sutra Tools",
          short_name: "Sacred Sutra Tools",
          theme_color: "#2196f3", // Material UI primary blue color
          background_color: "#ffffff",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "favicon.ico",
              sizes: "64x64 32x32 24x24 16x16",
              type: "image/x-icon",
            },
          ],
        },
        workbox: {
          // Skip waiting on install and activate immediately
          skipWaiting: true,
          // Take control of clients immediately
          clientsClaim: true,
          // Disable service worker registration in development
          disableDevLogs: true,
        },
        // Include firebase-messaging-sw.js in the build
        includeAssets: ["favicon.ico"],
        // Use manual registration for better control
        injectRegister: null,
        // Use minimal strategy for development
        strategies: "generateSW",
        devOptions: {
          // Disable service worker in development to avoid conflicts
          enabled: false,
          type: "module",
        },
      }),
    ],
    base: "/",
    server: {
      port: 5173, // Use Vite's default port
      strictPort: false, // Allow fallback to another port if needed
      allowedHosts: [
        '8690-2405-201-3034-5047-acbc-3d30-cd62-9d80.ngrok-free.app'
      ],
      // Proxy Firebase emulator requests to avoid CORS issues in E2E tests
      proxy: {
        // Proxy Firestore emulator requests
        '/__/firestore': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/__\/firestore/, ''),
        },
        // Proxy Auth emulator requests
        '/__/auth': {
          target: 'http://localhost:9099',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/__\/auth/, ''),
        },
        // Proxy Storage emulator requests
        '/__/storage': {
          target: 'http://localhost:9199',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/__\/storage/, ''),
        },
      },
    },
    worker: {
      format: "es",
      plugins: () => [],
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        // Exclude test files from the build
        external: (id) => {
          // Exclude test files and directories
          return (
            id.includes("__tests__") ||
            id.includes(".test.") ||
            id.includes(".spec.") ||
            id.includes("jest.config") ||
            id.includes("jest.setup") ||
            id.includes("setupTests") ||
            id.includes("/test/") ||
            id.includes("/tests/") ||
            id.endsWith(".test.ts") ||
            id.endsWith(".test.tsx") ||
            id.endsWith(".test.js") ||
            id.endsWith(".test.jsx") ||
            id.endsWith(".spec.ts") ||
            id.endsWith(".spec.tsx") ||
            id.endsWith(".spec.js") ||
            id.endsWith(".spec.jsx")
          );
        },
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "mui-vendor": ["@mui/material", "@mui/icons-material"],
            "firebase-vendor": [
              "firebase/app",
              "firebase/auth",
              "firebase/firestore",
            ],
            // add redux vendor
            "redux-vendor": ["redux", "react-redux"],
            "pdf-vendor": ["pdf-lib", "jspdf"],
            "utils-vendor": ["papaparse", "xlsx"],
          },
        },
        onwarn(warning, warn) {
          // Suppress eval warnings from pdf.js
          if (warning.code === "EVAL" && warning.id?.includes("pdfjs-dist")) {
            return;
          }
          warn(warning);
        },
      },
    },
    esbuild: {
      supported: {
        "top-level-await": true,
      },
    },
  });
