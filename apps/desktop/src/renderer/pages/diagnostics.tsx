import { useMemo, useState } from "react";

type ConnectionState = "idle" | "loading" | "ready" | "error";

export function DiagnosticsPage() {
    const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
    const [adapters, setAdapters] = useState<string[]>([]);
    const [selectedAdapter, setSelectedAdapter] = useState<string>("");
    const [vin, setVin] = useState<string>("");
    const [log, setLog] = useState<string[]>([]);

    const canReadVin = useMemo(() => connectionState === "ready" && Boolean(selectedAdapter), [connectionState, selectedAdapter]);

    const appendLog = (message: string) => {
        setLog((prev) => [new Date().toISOString() + " " + message, ...prev].slice(0, 30));
    };

    async function detectAdapters() {
        try {
            setConnectionState("loading");
            const result = await window.desktopApi.listAdapters();
            setAdapters(result.adapters);
            setSelectedAdapter(result.adapters[0] ?? "");
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
                    <li>DTC scan/clear for ECM, TCM, BCM, EAS, ABS</li>
                    <li>Live data polling and graph overlays</li>
                    <li>Service interval reset + EPB mode</li>
                </ul>
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
