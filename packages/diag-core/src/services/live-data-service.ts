import type { ModuleName } from "@jlrdtc/shared";

export type PidSample = {
    pid: string;
    value: number;
    unit: string;
    timestamp: number;
};

export type LiveDataGateway = {
    poll(module: ModuleName, pids: string[]): Promise<PidSample[]>;
};

export class LiveDataService {
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly gateway: LiveDataGateway) { }

    public start(
        module: ModuleName,
        pids: string[],
        intervalMs: number,
        onSamples: (samples: PidSample[]) => void
    ): void {
        if (this.timer) {
            this.stop();
        }

        this.timer = setInterval(async () => {
            const samples = await this.gateway.poll(module, pids);
            onSamples(samples);
        }, intervalMs);
    }

    public stop(): void {
        if (!this.timer) {
            return;
        }

        clearInterval(this.timer);
        this.timer = null;
    }
}
