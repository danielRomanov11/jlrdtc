import type { DiagnosticProtocol, ModuleName } from "./ipc-contracts";

export type VehicleProfile = {
    minYear: number;
    maxYear: number;
    preferredProtocol: DiagnosticProtocol;
    modules: ModuleName[];
};

export const LAND_ROVER_PROFILE: VehicleProfile = {
    minYear: 2000,
    maxYear: 2018,
    preferredProtocol: "UDS",
    modules: ["ECM_PCM", "TCM", "BCM_CJB", "EAS", "ABS_DSC"]
};

export function inferProtocolByYear(year: number): DiagnosticProtocol {
    if (year <= 2007) {
        return "KWP2000";
    }
    return "UDS";
}
