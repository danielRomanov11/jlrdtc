export type RoutineName = "SERVICE_INTERVAL_RESET" | "EPB_SERVICE_MODE";

export type RoutineGateway = {
    execute(routine: RoutineName): Promise<{ success: boolean; detail: string }>;
};

export class RoutineService {
    constructor(private readonly gateway: RoutineGateway) { }

    public async execute(routine: RoutineName, confirmed: boolean): Promise<{ success: boolean; detail: string }> {
        if (!confirmed) {
            throw new Error("Routine execution requires confirmation.");
        }

        return this.gateway.execute(routine);
    }
}
