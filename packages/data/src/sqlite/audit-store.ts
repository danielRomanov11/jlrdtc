import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type SessionOpenInput = {
    adapterId: string;
    vin?: string;
    vehicleYear?: number;
};

export type AuditLogInput = {
    sessionId?: number;
    operation: string;
    module?: string;
    details: string;
};

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS diagnostic_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  adapter_id TEXT NOT NULL,
  vin TEXT,
  vehicle_year INTEGER,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  operation TEXT NOT NULL,
  module TEXT,
  details TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES diagnostic_session(id)
);
`;

export class AuditStore {
    private readonly db: Database.Database;

    public constructor(dbPath: string) {
        mkdirSync(path.dirname(dbPath), { recursive: true });
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.exec(INIT_SQL);
    }

    public openSession(input: SessionOpenInput): number {
        const statement = this.db.prepare(
            `
            INSERT INTO diagnostic_session (adapter_id, vin, vehicle_year, started_at, status)
            VALUES (@adapterId, @vin, @vehicleYear, @startedAt, @status)
            `
        );

        const result = statement.run({
            adapterId: input.adapterId,
            vin: input.vin ?? null,
            vehicleYear: input.vehicleYear ?? null,
            startedAt: new Date().toISOString(),
            status: "ACTIVE"
        });

        return Number(result.lastInsertRowid);
    }

    public closeSession(sessionId: number): void {
        const statement = this.db.prepare(
            `
            UPDATE diagnostic_session
            SET ended_at = @endedAt, status = @status
            WHERE id = @id
            `
        );

        statement.run({
            id: sessionId,
            endedAt: new Date().toISOString(),
            status: "CLOSED"
        });
    }

    public appendAudit(entry: AuditLogInput): void {
        const statement = this.db.prepare(
            `
            INSERT INTO audit_log (session_id, operation, module, details, created_at)
            VALUES (@sessionId, @operation, @module, @details, @createdAt)
            `
        );

        statement.run({
            sessionId: entry.sessionId ?? null,
            operation: entry.operation,
            module: entry.module ?? null,
            details: entry.details,
            createdAt: new Date().toISOString()
        });
    }

    public close(): void {
        this.db.close();
    }
}
