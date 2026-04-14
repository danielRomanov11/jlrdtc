import { inferProtocolByYear, LAND_ROVER_PROFILE, type DiagnosticProtocol } from "@jlrdtc/shared";

export type SessionState = "DISCONNECTED" | "CONNECTED" | "ACTIVE";

export type SessionContext = {
    adapterId: string;
    vehicleYear: number;
    protocol: DiagnosticProtocol;
    vin?: string;
};

export class SessionManager {
    private state: SessionState = "DISCONNECTED";
    private context: SessionContext | null = null;
    private connectedAdapterId: string | null = null;

    public getState(): SessionState {
        return this.state;
    }

    public getContext(): SessionContext | null {
        return this.context;
    }

    public connect(adapterId: string): void {
        if (!adapterId) {
            throw new Error("Adapter id is required.");
        }

        this.state = "CONNECTED";
        this.connectedAdapterId = adapterId;
        this.context = null;
    }

    public activate(vehicleYear: number, vin?: string): SessionContext {
        if (this.state !== "CONNECTED") {
            throw new Error("Cannot activate a session before connecting an adapter.");
        }

        if (vehicleYear < LAND_ROVER_PROFILE.minYear || vehicleYear > LAND_ROVER_PROFILE.maxYear) {
            throw new Error("Vehicle year is out of current supported range.");
        }

        const protocol = inferProtocolByYear(vehicleYear);

        this.context = {
            adapterId: this.connectedAdapterId ?? "unknown-adapter",
            vehicleYear,
            protocol,
            vin
        };

        this.state = "ACTIVE";
        return this.context;
    }

    public close(): void {
        this.state = "DISCONNECTED";
        this.connectedAdapterId = null;
        this.context = null;
    }
}
