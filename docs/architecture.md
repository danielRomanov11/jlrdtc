# Architecture Overview

## Runtime Topology
- Electron main process hosts app lifecycle and IPC handlers.
- React renderer provides the diagnostics UI and sends high-level commands.
- Rust j2534-service process handles adapter operations over stdio JSON.
- Shared TypeScript contracts package validates command and response shape.
- Data package stores mapping metadata, session data, and audit entries in SQLite.

## Trust Boundaries
- Renderer has no direct native adapter access.
- Preload exposes a restricted API surface only.
- Main process mediates requests and can enforce operation allowlists.
- Rust service is isolated in a separate process to contain low-level failures.

## Initial Command Flow
1. Renderer requests adapter list through preload.
2. Main process forwards action to rust service.
3. Rust service returns structured response with request id.
4. Main process returns payload to renderer.

## Next Integration Layers
- J2534 DLL dynamic loading and capability detection.
- KWP2000 and UDS session manager in diag-core.
- Module-targeted scan and DTC parser pipeline.
- Live PID polling scheduler with adaptive rate limits.
