import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  vite: {
    envDir: repoRoot,
    server: {
      host: "0.0.0.0",
      port: Number(process.env.PORT ?? 3000),
    },
    preview: {
      host: "0.0.0.0",
      port: Number(process.env.PORT ?? 3000),
    },
  },
  nitro: {
    preset: "node-server",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
