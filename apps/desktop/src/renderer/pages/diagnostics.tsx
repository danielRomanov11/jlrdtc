import { useMemo, useState } from "react";

type ConnectionState = "idle" | "loading" | "ready" | "error";
type DtcRecord = { code: string; description: string; severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" };

const MODULE_LABELS: Record<string, string> = {
    ECM_PCM: "ECM/PCM",
    TCM: "TCM",
    BCM_CJB: "BCM/CJB",
    EAS: "EAS",
    ABS_DSC: "ABS/DSC"
};

export function DiagnosticsPage() {
    const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
    const [adapters, setAdapters] = useState<string[]>([]);
    const [selectedAdapter, setSelectedAdapter] = useState<string>("");
    const [modules, setModules] = useState<string[]>([]);
    const [selectedModule, setSelectedModule] = useState<string>("");
    const [dtcs, setDtcs] = useState<DtcRecord[]>([]);
    const [vin, setVin] = useState<string>("");
    const [log, setLog] = useState<string[]>([]);

    const canReadVin = useMemo(() => connectionState === "ready" && Boolean(selectedAdapter), [connectionState, selectedAdapter]);
    const canRunDtcOps = useMemo(
        () => connectionState === "ready" && Boolean(selectedAdapter),
        [connectionState, selectedAdapter]
    );
    const canReadModuleDtcs = useMemo(
        () => canRunDtcOps && Boolean(selectedModule),
        [canRunDtcOps, selectedModule]
    );

    const appendLog = (message: string) => {
        setLog((prev) => [new Date().toISOString() + " " + message, ...prev].slice(0, 30));
    };

    async function detectAdapters() {
        try {
            setConnectionState("loading");
            const result = await window.desktopApi.listAdapters();
            setAdapters(result.adapters);
            setSelectedAdapter(result.adapters[0] ?? "");
            setModules([]);
            setSelectedModule("");
            setDtcs([]);
            setConnectionState("ready");
            appendLog(`Detected ${result.adapters.length} adapter(s).`);
        } catch (error) {
            setConnectionState("error");
            appendLog(`Adapter detection failed: ${(error as Error).message}`);
        }
    }

    async function readVin() {
        if (!selectedAdapter) {
            return;
        }

        try {
            const result = await window.desktopApi.readVin(selectedAdapter);
            setVin(result.vin);
            appendLog("VIN read completed.");
        } catch (error) {
            appendLog(`VIN read failed: ${(error as Error).message}`);
        }
    }

    async function scanModules() {
        if (!selectedAdapter) {
            return;
        }

        try {
            const result = await window.desktopApi.scanModules(selectedAdapter);
            setModules(result.modules);
            setSelectedModule((current) => {
                if (current && result.modules.includes(current)) {
                    return current;
                }
                return result.modules[0] ?? "";
            });
            appendLog(`Scanned ${result.modules.length} module(s) using ${result.protocol}.`);
        } catch (error) {
            appendLog(`Module scan failed: ${(error as Error).message}`);
        }
    }

    async function readDtcs() {
        if (!selectedAdapter || !selectedModule) {
            return;
        }

        try {
            const result = await window.desktopApi.readDtcs(selectedAdapter, selectedModule);
            setDtcs(result.dtcs);
            appendLog(`${result.module} returned ${result.dtcs.length} DTC(s).`);
        } catch (error) {
            appendLog(`Read DTC failed: ${(error as Error).message}`);
        }
    }

    async function clearDtcs(module?: string, clearAll = false) {
        if (!selectedAdapter) {
            return;
        }

        const warning = clearAll
            ? "Clear ALL DTCs from all scanned modules?"
            : `Clear DTCs for ${MODULE_LABELS[module ?? ""] ?? module}?`;

        if (!window.confirm(warning)) {
            appendLog("Clear DTC canceled by user.");
            return;
        }

        try {
            const result = await window.desktopApi.clearDtcs({
                adapterId: selectedAdapter,
                module,
                clearAll,
                confirmed: true
            });
            setDtcs([]);
            appendLog(result.detail);
        } catch (error) {
            appendLog(`Clear DTC failed: ${(error as Error).message}`);
        }
    }

    return (
        <div className="page-shell">
            <header>
                <h1>JLRDTC MVP</h1>
                <p>Windows-first diagnostics for Land Rover 2000-2018 over J2534.</p>
            </header>

            <section className="panel">
                <h2>Connection</h2>
                <div className="row">
                    <button onClick={detectAdapters}>Detect Adapter</button>
                    <select
                        value={selectedAdapter}
                        onChange={(event) => setSelectedAdapter(event.target.value)}
                    >
                        <option value="">Select adapter</option>
                        {adapters.map((adapter) => (
                            <option key={adapter} value={adapter}>
                                {adapter}
                            </option>
                        ))}
                    </select>
                    <button onClick={readVin} disabled={!canReadVin}>
                        Read VIN
                    </button>
                </div>
                <p>Status: {connectionState}</p>
                <p>VIN: {vin || "Not read"}</p>
            </section>

            <section className="panel">
                <h2>Roadmap Hooks</h2>
                <ul>
                    <li>Module scan and DTC read/clear wired through IPC</li>
                    <li>Live data polling and graph overlays</li>
                    <li>Service interval reset + EPB mode</li>
                </ul>
            </section>

            <section className="panel">
                <h2>DTC Operations</h2>
                <div className="row">
                    <button onClick={scanModules} disabled={!canRunDtcOps}>
                        Scan Modules
                    </button>
                    <select
                        value={selectedModule}
                        onChange={(event) => setSelectedModule(event.target.value)}
                        disabled={!modules.length}
                    >
                        <option value="">Select module</option>
                        {modules.map((module) => (
                            <option key={module} value={module}>
                                {MODULE_LABELS[module] ?? module}
                            </option>
                        ))}
                    </select>
                    <button onClick={readDtcs} disabled={!canReadModuleDtcs}>
                        Read DTCs
                    </button>
                    <button
                        onClick={() => clearDtcs(selectedModule, false)}
                        disabled={!canReadModuleDtcs}
                    >
                        Clear Selected
                    </button>
                    <button onClick={() => clearDtcs(undefined, true)} disabled={!canRunDtcOps || !modules.length}>
                        Clear All
                    </button>
                </div>

                <div className="table-wrap">
                    <table className="dtc-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Description</th>
                                <th>Severity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!dtcs.length ? (
                                <tr>
                                    <td colSpan={3} className="empty-cell">
                                        No DTC records loaded.
                                    </td>
                                </tr>
                            ) : (
                                dtcs.map((dtc) => (
                                    <tr key={dtc.code + dtc.description}>
                                        <td>{dtc.code}</td>
                                        <td>{dtc.description}</td>
                                        <td>{dtc.severity}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="panel">
                <h2>Session Log</h2>
                <div className="log-box">
                    {log.map((line) => (
                        <div key={line}>{line}</div>
                    ))}
                </div>
            </section>
        </div>
    );
}
