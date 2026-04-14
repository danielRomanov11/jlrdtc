import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import path from "node:path";

type PendingRequest = {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
};

type ResponseMessage = {
    requestId: string;
    ok: boolean;
    payload?: unknown;
    error?: string;
};

export class J2534ServiceClient extends EventEmitter {
    private processRef: ChildProcessWithoutNullStreams | null = null;
    private pending = new Map<string, PendingRequest>();

    public start(): void {
        if (this.processRef) {
            return;
        }

        const serviceCwd = path.resolve(process.cwd(), "../../packages/j2534-service");
        this.processRef = spawn("cargo", ["run", "--quiet"], {
            cwd: serviceCwd,
            stdio: "pipe",
            shell: true
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

            if (parsed.ok) {
                match.resolve(parsed.payload);
            } else {
                match.reject(new Error(parsed.error ?? "Service call failed."));
            }
        });

        this.processRef.stderr.on("data", (chunk) => {
            this.emit("service-log", chunk.toString());
        });

        this.processRef.on("exit", () => {
            for (const pendingRequest of this.pending.values()) {
                pendingRequest.reject(new Error("J2534 service exited before response."));
            }
            this.pending.clear();
            this.processRef = null;
        });
    }

    public stop(): void {
        if (!this.processRef) {
            return;
        }

        this.processRef.kill();
        this.processRef = null;
    }

    public send(request: { action: string } & Record<string, unknown>): Promise<unknown> {
        if (!this.processRef) {
            throw new Error("J2534 service is not running.");
        }

        return new Promise((resolve, reject) => {
            const requestId = String(request.requestId ?? randomUUID());
            const message = {
                ...request,
                requestId
            };

            this.pending.set(requestId, { resolve, reject });
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
}
