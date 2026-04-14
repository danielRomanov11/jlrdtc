CREATE TABLE IF NOT EXISTS mapping_pack (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    source TEXT NOT NULL,
    checksum TEXT,
    imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dtc_definition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    module TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'LOW',
    pack_id INTEGER NOT NULL,
    UNIQUE (code, module, pack_id),
    FOREIGN KEY (pack_id) REFERENCES mapping_pack (id)
);

CREATE TABLE IF NOT EXISTS pid_definition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    pid TEXT NOT NULL,
    label TEXT NOT NULL,
    unit TEXT NOT NULL,
    scale REAL NOT NULL DEFAULT 1,
    offset
        REAL NOT NULL DEFAULT 0,
        pack_id INTEGER NOT NULL,
        UNIQUE (module, pid, pack_id),
        FOREIGN KEY (pack_id) REFERENCES mapping_pack (id)
);

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
    FOREIGN KEY (session_id) REFERENCES diagnostic_session (id)
);