import { z } from "zod";

export const moduleNameSchema = z.enum(["ECM_PCM", "TCM", "BCM_CJB", "EAS", "ABS_DSC"]);
export type ModuleName = z.infer<typeof moduleNameSchema>;

export const protocolSchema = z.enum(["KWP2000", "UDS"]);
export type DiagnosticProtocol = z.infer<typeof protocolSchema>;

export const baseEnvelopeSchema = z.object({
    requestId: z.string().min(1),
    timestamp: z.number().int().nonnegative()
});

export const readVinRequestSchema = baseEnvelopeSchema.extend({
    action: z.literal("vehicle.readVin"),
    adapterId: z.string().min(1)
});

export const scanModulesRequestSchema = baseEnvelopeSchema.extend({
    action: z.literal("diag.scanModules"),
    adapterId: z.string().min(1),
    protocolHint: protocolSchema.optional()
});

export const readDtcsRequestSchema = baseEnvelopeSchema.extend({
    action: z.literal("diag.readDtcs"),
    adapterId: z.string().min(1),
    module: moduleNameSchema
});

export const clearDtcsRequestSchema = baseEnvelopeSchema.extend({
    action: z.literal("diag.clearDtcs"),
    adapterId: z.string().min(1),
    module: moduleNameSchema.optional(),
    clearAll: z.boolean().default(false),
    confirmed: z.boolean()
});

export const serviceRoutineRequestSchema = baseEnvelopeSchema.extend({
    action: z.literal("routine.execute"),
    adapterId: z.string().min(1),
    routine: z.enum(["SERVICE_INTERVAL_RESET", "EPB_SERVICE_MODE"]),
    confirmed: z.boolean()
});

export const ipcRequestSchema = z.discriminatedUnion("action", [
    readVinRequestSchema,
    scanModulesRequestSchema,
    readDtcsRequestSchema,
    clearDtcsRequestSchema,
    serviceRoutineRequestSchema
]);

export type IpcRequest = z.infer<typeof ipcRequestSchema>;

export const dtcSchema = z.object({
    code: z.string().min(5),
    description: z.string().min(1),
    severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH"]).default("LOW")
});

export type DtcRecord = z.infer<typeof dtcSchema>;

export const ipcErrorSchema = z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional()
});

export type IpcError = z.infer<typeof ipcErrorSchema>;

export const ipcResponseSchema = z.object({
    requestId: z.string().min(1),
    ok: z.boolean(),
    payload: z.unknown().optional(),
    error: ipcErrorSchema.optional(),
    timestamp: z.number().int().nonnegative()
});

export type IpcResponse = z.infer<typeof ipcResponseSchema>;
