import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    main: {
        build: {
            outDir: "out/main",
            lib: {
                entry: resolve("src/main/main.ts")
            },
            rollupOptions: {
                external: ["better-sqlite3"]
            }
        },
        resolve: {
            alias: {
                "@main": resolve("src/main")
            }
        }
    },
    preload: {
        build: {
            outDir: "out/preload",
            lib: {
                entry: resolve("src/main/preload.ts")
            }
        },
        resolve: {
            alias: {
                "@main": resolve("src/main")
            }
        }
    },
    renderer: {
        root: "src/renderer",
        resolve: {
            alias: {
                "@renderer": resolve("src/renderer"),
                "@shared": resolve("../../packages/shared/src")
            }
        },
        plugins: [react()]
    }
});
