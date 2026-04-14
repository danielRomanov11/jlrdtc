# Vehicle Test Matrix

## Coverage Targets
- One 2000-2007 vehicle using legacy or mixed KWP paths.
- One 2007-2015 vehicle using mixed KWP and UDS modules.
- One 2015-2018 vehicle using UDS-heavy module stack.

## Adapter and Environment
- Primary adapter: JLR MongoosePro on Windows.
- Validate with clean machine and pre-configured machine.
- Record installed driver version and firmware version per test run.

## Validation Cases
1. Adapter detection and session open.
2. VIN read success and timeout path.
3. Module scan for ECM, TCM, BCM, EAS, ABS.
4. Per-module DTC read and clear.
5. Global DTC clear with confirmation.
6. Service interval reset preconditions and success path.
7. EPB service mode enter and exit.
8. 15-minute live polling stability run.

## Exit Criteria
- No unhandled crashes in desktop app or rust service during test suite.
- No blocked operation can be executed through renderer API.
- All mandatory modules return deterministic error envelopes when unavailable.
