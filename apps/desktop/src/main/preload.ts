import { contextBridge, ipcRenderer } from "electron";

type DesktopApi = {
    listAdapters: () => Promise<{ adapters: string[] }>;
    readVin: (adapterId: string) => Promise<{ vin: string }>;
    openSession: (adapterId: string) => Promise<{ adapterId: string; channelId: number }>;
    scanModules: (
        adapterId: string,
        protocolHint?: "KWP2000" | "UDS"
    ) => Promise<{ modules: string[]; protocol: string }>;
    readDtcs: (
        adapterId: string,
        module: string
    ) => Promise<{
        module: string;
        dtcs: Array<{ code: string; description: string; severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" }>;
    }>;
    clearDtcs: (params: {
        adapterId: string;
        module?: string;
        clearAll: boolean;
        confirmed: boolean;
    }) => Promise<{ cleared: boolean; scope: string; detail: string }>;
};

const api: DesktopApi = {
    listAdapters: async () => ipcRenderer.invoke("adapter:list"),
    readVin: async (adapterId: string) => ipcRenderer.invoke("vehicle:readVin", adapterId),
    openSession: async (adapterId: string) => ipcRenderer.invoke("session:open", adapterId),
    scanModules: async (adapterId: string, protocolHint?: "KWP2000" | "UDS") =>
        ipcRenderer.invoke("diag:scanModules", adapterId, protocolHint),
    readDtcs: async (adapterId: string, module: string) =>
        ipcRenderer.invoke("diag:readDtcs", adapterId, module),
    clearDtcs: async (params) => ipcRenderer.invoke("diag:clearDtcs", params)
};

contextBridge.exposeInMainWorld("desktopApi", api);
