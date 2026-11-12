import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const htmlPages = [
  "index.html",
  "driver-login.html",
  "ui/index.html",
  "ui/login.html",
  "ui/face-verification.html",
  "ui/permissions.html",
  "ui/student-login.html",
  "ui/school-driver-dashboard.html",
  "ui/engineering-driver-dashboard.html",
  "ui/company-driver-dashboard.html",
  "ui/engineering-student-dashboard.html",
  "ui/junior-student-dashboard.html",
  "ui/employee-dashboard.html",
  "ui/parent-dashboard.html",
  "ui/ui/driver-portal.html",
  "ui/ui/employee-login.html",
  "ui/ui/parent-login.html",
];

const copyDriverServiceWorker = {
  name: "copy-driver-service-worker",
  apply: "build",
  async closeBundle() {
    const outputDirectory = resolve(projectRoot, "dist/ui");
    await mkdir(outputDirectory, { recursive: true });
    await copyFile(
      resolve(projectRoot, "ui/sw.js"),
      resolve(outputDirectory, "sw.js"),
    );
  },
};

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), copyDriverServiceWorker],
  build: {
    modulePreload: { polyfill: false },
    rolldownOptions: {
      input: htmlPages.map((page) => resolve(projectRoot, page)),
      output: {
        entryFileNames: "ui/assets/[name].js",
        chunkFileNames: "ui/assets/[name].js",
        assetFileNames: (asset) =>
          asset.name === "app.css"
            ? "ui/assets/app.css"
            : "ui/assets/[name]-[hash][extname]",
      },
    },
  },
});