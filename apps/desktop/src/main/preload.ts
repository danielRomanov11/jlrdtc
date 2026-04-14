import { contextBridge, ipcRenderer } from "electron";

type DesktopApi = {
    listAdapters: () => Promise<{ adapters: string[] }>;
    readVin: (adapterId: string) => Promise<{ vin: string }>;
    openSession: (adapterId: string) => Promise<{ adapterId: string; channelId: number }>;
};

const api: DesktopApi = {
    listAdapters: async () => ipcRenderer.invoke("adapter:list"),
    readVin: async (adapterId: string) => ipcRenderer.invoke("vehicle:readVin", adapterId),
    openSession: async (adapterId: string) => ipcRenderer.invoke("session:open", adapterId)
};

contextBridge.exposeInMainWorld("desktopApi", api);
