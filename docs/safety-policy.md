# Safety Policy (MVP)

## Allowed Operations
- Read module DTCs.
- Clear DTCs with explicit user confirmation.
- Service interval reset.
- EPB service mode toggle.
- Read VIN and metadata identifiers.

## Blocked Operations
- Immobilizer and key programming.
- ECU module flashing or firmware updates.
- Odometer writes.
- Unrestricted coding or configuration writes.

## Runtime Controls
- All write-like actions require confirmation payloads.
- Main process maintains operation allowlist.
- Audit records include timestamp, module target, operation name, and result.
- Future release requires battery/ignition precondition checks before service routines.

## Liability and User Communication
- App must display user-facing warning before any state-changing operation.
- Session log must retain operation trace for troubleshooting and accountability.
