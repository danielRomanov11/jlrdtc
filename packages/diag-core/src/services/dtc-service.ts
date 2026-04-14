import type { DtcRecord, ModuleName } from "@jlrdtc/shared";

export type DtcGateway = {
    read(module: ModuleName): Promise<DtcRecord[]>;
    clear(module?: ModuleName): Promise<void>;
};

export class DtcService {
    constructor(private readonly gateway: DtcGateway) { }

    public async readByModule(module: ModuleName): Promise<DtcRecord[]> {
        return this.gateway.read(module);
    }

    public async clear(module: ModuleName | undefined, confirmed: boolean): Promise<void> {
        if (!confirmed) {
            throw new Error("Clear operation requires explicit confirmation.");
        }

        await this.gateway.clear(module);
    }
}
