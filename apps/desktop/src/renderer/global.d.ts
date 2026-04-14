declare global {
    interface Window {
        desktopApi: {
            listAdapters: () => Promise<{ adapters: string[] }>;
            readVin: (adapterId: string) => Promise<{ vin: string }>;
            openSession: (adapterId: string) => Promise<{ adapterId: string; channelId: number }>;
        };
    }
}

export { };
