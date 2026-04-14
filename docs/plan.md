## Plan: Land Rover J2534 Desktop MVP

Build a Windows-first Electron desktop diagnostic app for Land Rover 2000-2018 using a J2534-based MongoosePro integration, not serial COM. The recommended approach is a secure split architecture: React/Electron UI + native J2534 service + protocol engine + SQLite data layer, with strict safety gates and import-based proprietary mapping packs.

**Steps**
1. Phase 0: Repository foundation and architecture baseline. Create a monorepo with dedicated packages for Electron + React/Vite desktop UI, shared contracts, protocol core, Rust native J2534 bridge, and data tools. Define IPC contracts first so all components build against stable request/response schemas.
2. Phase 0: Safety and legal guardrails definition. Establish an operation allowlist/denylist before protocol implementation: allow read DTC, clear DTC (confirmed), service interval reset, EPB service mode; deny immobilizer/key programming, flashing, coding writes, and odometer functions. This blocks unsafe feature creep early.
3. Phase 1: J2534 transport service (Windows). Implement a Rust native service process that loads vendor J2534 DLLs, enumerates devices, opens channels, writes/reads frames, and reports structured errors. This is the hard dependency for all diagnostic operations.
4. Phase 1: Electron host and secure IPC bridge. Implement Electron main + preload with a tightly scoped command surface and runtime validation of payloads. The renderer must never call native DLLs directly.
5. Phase 1: Diagnostic session manager and handshake. Implement VIN read and model-year inference, protocol/session negotiation (KWP2000 and UDS path selection), and module-address catalog bootstrap for 2000-2018 vehicles. Depends on steps 3 and 4.
6. Phase 2: Module scan + DTC workflows. Implement full module interrogation for ECM/PCM, TCM, BCM/CJB, EAS, and ABS/DSC; parse and normalize responses; support per-module clear and global clear with confirmation and audit logging. Depends on step 5.
7. Phase 2: Live data MVP. Add PID polling scheduler with configurable rates, graph overlays, and baseline compare views for key troubleshooting pairs. Include anti-flood controls and timeout fallback to keep sessions stable. Depends on step 5.
8. Phase 2: Service routines MVP. Implement service interval reset and EPB service mode toggle with precondition checks (battery/ignition/session state), clear user warnings, and post-operation verification readback. Depends on step 5.
9. Phase 2 (parallel with steps 6-8): Mapping pipeline and SQLite schema. Create import tooling for DTC/PID/mode metadata packs (CSV/JSON), validation rules, versioned schema migrations, and provenance metadata so mapping packs are traceable and replaceable.
10. Phase 3: UX hardening and observability. Add session timeline, command/response trace viewer, recoverable error states, retry policy per operation type, and offline diagnostic log export for support and regression analysis.
11. Phase 3: Installer and runtime prerequisites. Package Windows installer with dependency checks (driver presence, supported adapter detection, permissions), first-run readiness checks, and crash-report envelope without sensitive payload leakage.
12. Phase 3: Test matrix and release gate. Run bench + vehicle validation matrix across at least one 2000-2007 KWP vehicle, one 2007-2015 mixed vehicle, and one 2015-2018 UDS vehicle before tagging MVP.

**Relevant files**
- c:/Users/fcdra/Documents/GitHub/jlrdtc/package.json — Workspace scripts and package orchestration.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/pnpm-workspace.yaml — Monorepo package boundaries.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/apps/desktop/src/main/main.ts — Electron process, IPC registration, lifecycle.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/apps/desktop/src/main/preload.ts — Secure renderer API bridge.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/apps/desktop/src/renderer/pages/diagnostics.tsx — DTC scan/clear and live-data view orchestration.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/shared/src/ipc-contracts.ts — Typed command contracts and error envelopes.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/shared/src/vehicle-profile.ts — Year/model/protocol resolution and module map metadata.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/diag-core/src/session-manager.ts — Diagnostic session lifecycle and protocol strategy.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/diag-core/src/services/dtc-service.ts — Read/normalize/clear DTC workflows.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/diag-core/src/services/live-data-service.ts — Poll scheduler, rate controls, and stream normalization.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/diag-core/src/services/routine-service.ts — Service interval + EPB routines and safety checks.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/j2534-service/src/main.rs — Native service entry and request router.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/j2534-service/src/j2534/wrapper.rs — Dynamic loading and J2534 function bindings.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/j2534-service/src/j2534/channel.rs — Device/channel lifecycle and frame IO.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/data/src/sqlite/schema.sql — Core tables for DTC/PID mappings, audit, and session logs.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/packages/data/src/importers/mapping-importer.ts — Mapping pack ingestion and validation.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/docs/architecture.md — Trust boundaries and component interaction.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/docs/safety-policy.md — Allowlist/denylist and user-confirmation policy.
- c:/Users/fcdra/Documents/GitHub/jlrdtc/docs/vehicle-test-matrix.md — Hardware/vehicle verification grid and release criteria.

**Verification**
1. Contract tests: validate every IPC request/response shape, error code, and timeout path.
2. Unit tests: protocol decoding/encoding, DTC normalization, session transitions, and module routing.
3. Transport integration tests: mock J2534 DLL behavior for open/connect/read/write/error conditions.
4. Hardware smoke tests on Windows with JLR MongoosePro: enumerate device, open channel, read VIN, scan mandatory modules.
5. Feature tests: read DTC, clear per-module and global, service interval reset, EPB mode toggle with precondition failures.
6. Live data tests: sustained polling under load with graph rendering and no UI lockups.
7. Safety tests: verify blocked operations cannot execute (immobilizer, flashing, coding writes).
8. Persistence tests: SQLite migration, mapping import idempotency, and session/audit retention.
9. Manual regression pass on representative vehicles for each protocol era (KWP legacy, mixed, UDS).
10. Installer validation on clean Windows machine with and without drivers present.

**Decisions**
- Chosen runtime: Electron (Windows-first reliability with J2534 workflow).
- Chosen native service language: Rust with focused FFI wrapper for J2534 DLL calls.
- Chosen renderer stack: React + Vite inside Electron.
- Adapter target: JLR MongoosePro using J2534 pass-thru, replacing serialport assumptions.
- Vehicle scope: Land Rover 2000-2018.
- Mandatory v1 modules: ECM/PCM, TCM, BCM/CJB, EAS, ABS/DSC.
- Mandatory v1 routines: service interval reset and EPB service mode toggle.
- Data strategy: import-based mapping pipeline; sourcing and normalization included.
- Explicitly excluded from v1: immobilizer/key programming and module flashing.

**Further Considerations**
1. Mapping governance: define a signed mapping-pack format in phase 2 to prevent accidental or untrusted pack ingestion.