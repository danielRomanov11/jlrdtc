# JLRDTC

JLRDTC is a Windows-first desktop diagnostic application for Land Rover vehicles (2000-2018) using a J2534 pass-thru adapter such as JLR MongoosePro.

## Stack
- Electron + React + Vite for the desktop UI
- Rust service for J2534 transport and adapter communication
- TypeScript diagnostic core for protocol/session orchestration
- SQLite for local mappings, logs, and audit trails

## Current Scope (MVP)
- Module scan for ECM/PCM, TCM, BCM/CJB, EAS, ABS/DSC
- DTC read and clear (with safety confirmation)
- Live PID polling foundation
- Service interval reset and EPB service mode toggle
- Import-based DTC/PID mapping packs

## Getting Started
1. Install Node.js 20+ and Rust stable toolchain.
2. Run npm install at repository root.
3. Run npm run dev for desktop + transport service in parallel.

## Safety
MVP explicitly excludes immobilizer/key programming and module flashing.
