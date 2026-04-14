import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { J2534ServiceClient } from "./service-client";

const serviceClient = new J2534ServiceClient();

function createMainWindow(): void {
    const window = new BrowserWindow({
        width: 1280,
        height: 840,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const rendererUrl = process.env.ELECTRON_RENDERER_URL;
    if (rendererUrl) {
        void window.loadURL(rendererUrl);
    } else {
        void window.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
}

function registerIpcHandlers(): void {
    ipcMain.handle("adapter:list", async () => {
        const payload = await serviceClient.send({ action: "adapter.list", timestamp: Date.now() });
        return payload;
    });

    ipcMain.handle("vehicle:readVin", async (_event, adapterId: string) => {
        const payload = await serviceClient.send({
            action: "vehicle.readVin",
            adapterId,
            timestamp: Date.now()
        });
        return payload;
    });

    ipcMain.handle("session:open", async (_event, adapterId: string) => {
        const payload = await serviceClient.send({
            action: "session.open",
            adapterId,
            timestamp: Date.now()
        });
        return payload;
    });
}

app.whenReady().then(() => {
    serviceClient.start();
    registerIpcHandlers();
    createMainWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on("window-all-closed", () => {
    serviceClient.stop();
    if (process.platform !== "darwin") {
        app.quit();
    }
});
