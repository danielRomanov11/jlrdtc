import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { AuditStore } from "@jlrdtc/data";
import { J2534ServiceClient } from "./service-client";

const serviceClient = new J2534ServiceClient();
let auditStore: AuditStore | null = null;
let activeSessionId: number | undefined;

function inferModule(payload: Record<string, unknown>): string | undefined {
    const value = payload.module;
    return typeof value === "string" ? value : undefined;
}

function writeAuditRecord(
    action: string,
    payload: Record<string, unknown>,
    ok: boolean,
    responseOrError: unknown
): void {
    if (!auditStore) {
        return;
    }

    const details = {
        action,
        ok,
        payload,
        response: ok ? responseOrError : undefined,
        error: ok ? undefined : String(responseOrError)
    };

    auditStore.appendAudit({
        sessionId: activeSessionId,
        operation: action,
        module: inferModule(payload),
        details: JSON.stringify(details)
    });
}

async function dispatchToService(
    action: string,
    payload: Record<string, unknown> = {}
): Promise<unknown> {
    try {
        const response = await serviceClient.send({
            action,
            timestamp: Date.now(),
            ...payload
        });

        writeAuditRecord(action, payload, true, response);
        return response;
    } catch (error) {
        writeAuditRecord(action, payload, false, error instanceof Error ? error.message : "Unknown service error");
        const message = error instanceof Error ? error.message : "Unknown service error.";
        throw new Error(`${action} failed: ${message}`);
    }
}

function initializeAuditStore(): void {
    const dbPath = path.join(app.getPath("userData"), "jlrdtc.sqlite");
    auditStore = new AuditStore(dbPath);
}

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
        return dispatchToService("adapter.list");
    });

    ipcMain.handle("vehicle:readVin", async (_event, adapterId: string) => {
        return dispatchToService("vehicle.readVin", {
            adapterId
        });
    });

    ipcMain.handle("session:open", async (_event, adapterId: string) => {
        const result = await dispatchToService("session.open", {
            adapterId,
        });

        const typed = result as {
            adapterId?: string;
        };

        if (auditStore) {
            if (activeSessionId) {
                auditStore.closeSession(activeSessionId);
            }

            activeSessionId = auditStore.openSession({
                adapterId: typed.adapterId ?? adapterId
            });
        }

        return result;
    });

    ipcMain.handle("diag:scanModules", async (_event, adapterId: string, protocolHint?: "KWP2000" | "UDS") => {
        return dispatchToService("diag.scanModules", {
            adapterId,
            protocolHint
        });
    });

    ipcMain.handle("diag:readDtcs", async (_event, adapterId: string, module: string) => {
        return dispatchToService("diag.readDtcs", {
            adapterId,
            module
        });
    });

    ipcMain.handle(
        "diag:clearDtcs",
        async (_event, params: { adapterId: string; module?: string; clearAll: boolean; confirmed: boolean }) => {
            return dispatchToService("diag.clearDtcs", params);
        }
    );
}

function registerServiceLogging(): void {
    serviceClient.on("service-log", (entry: string) => {
        console.info(`[j2534-service] ${entry.trim()}`);
    });
}

app.whenReady().then(() => {
    initializeAuditStore();
    serviceClient.start();
    registerServiceLogging();
    registerIpcHandlers();
    createMainWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (auditStore && activeSessionId) {
        auditStore.closeSession(activeSessionId);
    }
    auditStore?.close();
    serviceClient.stop();
    if (process.platform !== "darwin") {
        app.quit();
    }
});
