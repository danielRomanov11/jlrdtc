import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { z } from "zod";

const dtcSchema = z.object({
    code: z.string().min(5),
    module: z.string().min(1),
    description: z.string().min(1),
    severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH"]).default("LOW")
});

const pidSchema = z.object({
    module: z.string().min(1),
    pid: z.string().min(1),
    label: z.string().min(1),
    unit: z.string().min(1),
    scale: z.coerce.number().default(1),
    offset: z.coerce.number().default(0)
});

const mappingPackSchema = z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    source: z.string().min(1),
    dtcs: z.array(dtcSchema).default([]),
    pids: z.array(pidSchema).default([])
});

export type MappingPack = z.infer<typeof mappingPackSchema>;

function parseCsvRows(input: string): Record<string, string>[] {
    return parse(input, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as Record<string, string>[];
}

export async function loadMappingPack(filePath: string): Promise<MappingPack> {
    const ext = path.extname(filePath).toLowerCase();
    const raw = await readFile(filePath, "utf8");

    if (ext === ".json") {
        return mappingPackSchema.parse(JSON.parse(raw));
    }

    if (ext === ".csv") {
        const rows = parseCsvRows(raw);
        const dtcs = rows
            .filter((row) => Boolean(row.code))
            .map((row) => dtcSchema.parse(row));
        const pids = rows
            .filter((row) => Boolean(row.pid))
            .map((row) => pidSchema.parse(row));

        return {
            name: path.basename(filePath, ".csv"),
            version: "0.0.1",
            source: filePath,
            dtcs,
            pids
        };
    }

    throw new Error(`Unsupported mapping pack extension: ${ext}`);
}
