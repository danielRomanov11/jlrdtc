declare global {
    interface Window {
        desktopApi: {
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
    }
}

export { };
