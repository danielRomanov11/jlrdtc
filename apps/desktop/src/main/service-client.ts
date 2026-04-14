import { execSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";

type PendingRequest = {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timeoutHandle: ReturnType<typeof setTimeout>;
};

type ResponseMessage = {
    requestId: string;
    ok: boolean;
    payload?: unknown;
    error?: string;
};

type DiagnosticModule = "ECM_PCM" | "TCM" | "BCM_CJB" | "EAS" | "ABS_DSC";

type MockDtc = {
    code: string;
    description: string;
    severity: "INFO" | "LOW" | "MEDIUM" | "HIGH";
};

const MOCK_MODULES: DiagnosticModule[] = ["ECM_PCM", "TCM", "BCM_CJB", "EAS", "ABS_DSC"];

const MOCK_DTC_MAP: Record<DiagnosticModule, MockDtc[]> = {
    ECM_PCM: [
        {
            code: "P0087",
            description: "Fuel rail pressure too low",
            severity: "HIGH"
        },
        {
            code: "P0401",
            description: "EGR flow insufficient detected",
            severity: "MEDIUM"
        }
    ],
    TCM: [
        {
            code: "P0730",
            description: "Incorrect gear ratio",
            severity: "MEDIUM"
        }
    ],
    BCM_CJB: [
        {
            code: "B11D0",
            description: "Driver door latch circuit intermittent",
            severity: "LOW"
        }
    ],
    EAS: [
        {
            code: "C1A20",
            description: "Pressure increases too slow when filling reservoir",
            severity: "HIGH"
        }
    ],
    ABS_DSC: [
        {
            code: "C1A96",
            description: "ABS hydraulic pump motor circuit",
            severity: "MEDIUM"
        }
    ]
};

function isDiagnosticModule(value: unknown): value is DiagnosticModule {
    return typeof value === "string" && MOCK_MODULES.includes(value as DiagnosticModule);
}

export class J2534ServiceClient extends EventEmitter {
    private processRef: ChildProcessWithoutNullStreams | null = null;
    private pending = new Map<string, PendingRequest>();
    private useMock = false;

    public start(): void {
        if (this.processRef || this.useMock) {
            return;
        }

        if (!this.hasCargoToolchain()) {
            this.useMock = true;
            this.emit("service-log", "Cargo toolchain not found. Starting in mock mode.");
            return;
        }

        const serviceCwd = this.resolveServiceCwd();
        if (!serviceCwd) {
            this.useMock = true;
            this.emit("service-log", "Rust service folder not found. Starting in mock mode.");
            return;
        }

        this.processRef = spawn("cargo", ["run", "--quiet"], {
            cwd: serviceCwd,
            stdio: "pipe",
            shell: true
        });

        this.processRef.on("error", (error) => {
            this.emit("service-log", `Failed to start rust service. Switching to mock mode: ${error.message}`);
            this.rejectPending("J2534 service failed to start.");
            this.useMock = true;
            this.processRef = null;
        });

        const lineReader = createInterface({
            input: this.processRef.stdout
        });

        lineReader.on("line", (line) => {
            const parsed = this.tryParse(line);
            if (!parsed) {
                return;
            }

            const match = this.pending.get(parsed.requestId);
            if (!match) {
                return;
            }

            this.pending.delete(parsed.requestId);
            clearTimeout(match.timeoutHandle);

            if (parsed.ok) {
                match.resolve(parsed.payload);
            } else {
                match.reject(new Error(parsed.error ?? "Service call failed."));
            }
        });

        this.processRef.stderr.on("data", (chunk) => {
            this.emit("service-log", chunk.toString());
        });

        this.processRef.on("exit", (code) => {
            this.rejectPending("J2534 service exited before response.");
            if (code !== 0) {
                this.emit("service-log", `Rust service exited with code ${String(code)}. Switching to mock mode.`);
                this.useMock = true;
            }
            this.processRef = null;
        });
    }

    public stop(): void {
        if (!this.processRef) {
            return;
        }

        this.processRef.kill();
        this.rejectPending("J2534 service stopped.");
        this.processRef = null;
    }

    public send(request: { action: string } & Record<string, unknown>): Promise<unknown> {
        if (this.useMock) {
            return Promise.resolve(this.handleMockRequest(request));
        }

        if (!this.processRef) {
            this.useMock = true;
            this.emit("service-log", "J2534 service not running. Falling back to mock mode.");
            return Promise.resolve(this.handleMockRequest(request));
        }

        return new Promise((resolve, reject) => {
            const requestId = String(request.requestId ?? randomUUID());
            const message = {
                ...request,
                requestId
            };

            const timeoutHandle = setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error(`Service request timed out for action ${request.action}.`));
            }, 7000);

            this.pending.set(requestId, { resolve, reject, timeoutHandle });
            this.processRef?.stdin.write(`${JSON.stringify(message)}\n`);
        });
    }

    private tryParse(line: string): ResponseMessage | null {
        try {
            return JSON.parse(line) as ResponseMessage;
        } catch {
            this.emit("service-log", `Malformed service response: ${line}`);
            return null;
        }
    }

    private rejectPending(message: string): void {
        for (const pendingRequest of this.pending.values()) {
            clearTimeout(pendingRequest.timeoutHandle);
            pendingRequest.reject(new Error(message));
        }
        this.pending.clear();
    }

    private hasCargoToolchain(): boolean {
        try {
            execSync("cargo --version", { stdio: "ignore" });
            return true;
        } catch {
            return false;
        }
    }

    private resolveServiceCwd(): string | null {
        const candidates = [
            path.resolve(process.cwd(), "packages/j2534-service"),
            path.resolve(process.cwd(), "../../packages/j2534-service"),
            path.resolve(__dirname, "../../../../packages/j2534-service")
        ];

        const found = candidates.find((candidate) => existsSync(path.join(candidate, "Cargo.toml")));
        return found ?? null;
    }

    private handleMockRequest(request: { action: string } & Record<string, unknown>): unknown {
        switch (request.action) {
            case "adapter.list":
                return { adapters: ["MONGOOSEPRO-MOCK-001"] };
            case "vehicle.readVin":
                return { vin: "SALGA2EF1BA000001" };
            case "session.open":
                return {
                    adapterId: this.readString(request, "adapterId", "MONGOOSEPRO-MOCK-001"),
                    channelId: 1
                };
            case "diag.scanModules":
                return {
                    modules: MOCK_MODULES,
                    protocol: this.readString(request, "protocolHint", "UDS")
                };
            case "diag.readDtcs": {
                const module = this.readModule(request, "module", "ECM_PCM");
                return {
                    module,
                    dtcs: MOCK_DTC_MAP[module]
                };
            }
            case "diag.clearDtcs": {
                const confirmed = Boolean(request.confirmed);
                if (!confirmed) {
                    throw new Error("Clear DTC operation requires confirmation.");
                }

                const clearAll = Boolean(request.clearAll);
                const module = this.readModule(request, "module", "ECM_PCM");
                return {
                    cleared: true,
                    scope: clearAll ? "ALL" : module,
                    detail: clearAll
                        ? "All module DTCs cleared in mock transport."
                        : `DTCs for ${module} cleared in mock transport.`
                };
            }
            default:
                throw new Error(`Unsupported service action: ${request.action}`);
        }
    }

    private readString(request: Record<string, unknown>, key: string, fallback: string): string {
        const value = request[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value;
        }
        return fallback;
    }

    private readModule(
        request: Record<string, unknown>,
        key: string,
        fallback: DiagnosticModule
    ): DiagnosticModule {
        const value = request[key];
        if (isDiagnosticModule(value)) {
            return value;
        }
        return fallback;
    }
}
