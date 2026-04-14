mod j2534;

use anyhow::Result;
use j2534::channel::J2534Channel;
use j2534::wrapper::J2534Wrapper;
use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, Write};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Deserialize)]
#[serde(tag = "action")]
enum Request {
    #[serde(rename = "adapter.list")]
    AdapterList { requestId: String },
    #[serde(rename = "vehicle.readVin")]
    VehicleReadVin { requestId: String, adapterId: String },
    #[serde(rename = "session.open")]
    SessionOpen { requestId: String, adapterId: String },
    #[serde(rename = "diag.scanModules")]
    DiagScanModules {
        requestId: String,
        adapterId: String,
        protocolHint: Option<String>,
    },
    #[serde(rename = "diag.readDtcs")]
    DiagReadDtcs {
        requestId: String,
        adapterId: String,
        module: String,
    },
    #[serde(rename = "diag.clearDtcs")]
    DiagClearDtcs {
        requestId: String,
        adapterId: String,
        module: Option<String>,
        clearAll: bool,
        confirmed: bool,
    },
}

#[derive(Serialize)]
struct Response {
    requestId: String,
    ok: bool,
    payload: serde_json::Value,
    timestamp: u128,
    error: Option<String>,
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn handle_request(wrapper: &J2534Wrapper, request: Request) -> Response {
    match request {
        Request::AdapterList { requestId } => match wrapper.list_adapters() {
            Ok(adapters) => Response {
                requestId,
                ok: true,
                payload: serde_json::json!({ "adapters": adapters }),
                timestamp: now_ms(),
                error: None,
            },
            Err(err) => Response {
                requestId,
                ok: false,
                payload: serde_json::json!({}),
                timestamp: now_ms(),
                error: Some(err.to_string()),
            },
        },
        Request::VehicleReadVin {
            requestId,
            adapterId,
        } => match wrapper.read_vin(&adapterId) {
            Ok(vin) => Response {
                requestId,
                ok: true,
                payload: serde_json::json!({ "vin": vin }),
                timestamp: now_ms(),
                error: None,
            },
            Err(err) => Response {
                requestId,
                ok: false,
                payload: serde_json::json!({}),
                timestamp: now_ms(),
                error: Some(err.to_string()),
            },
        },
        Request::SessionOpen {
            requestId,
            adapterId,
        } => match J2534Channel::open(&adapterId) {
            Ok(channel) => Response {
                requestId,
                ok: true,
                payload: serde_json::json!({
                    "adapterId": channel.adapter_id,
                    "channelId": channel.channel_id
                }),
                timestamp: now_ms(),
                error: None,
            },
            Err(err) => Response {
                requestId,
                ok: false,
                payload: serde_json::json!({}),
                timestamp: now_ms(),
                error: Some(err.to_string()),
            },
        },
        Request::DiagScanModules {
            requestId,
            adapterId,
            protocolHint,
        } => match wrapper.scan_modules(&adapterId, protocolHint.as_deref()) {
            Ok(modules) => Response {
                requestId,
                ok: true,
                payload: serde_json::json!({
                    "modules": modules,
                    "protocol": protocolHint.unwrap_or_else(|| "AUTO".to_string())
                }),
                timestamp: now_ms(),
                error: None,
            },
            Err(err) => Response {
                requestId,
                ok: false,
                payload: serde_json::json!({}),
                timestamp: now_ms(),
                error: Some(err.to_string()),
            },
        },
        Request::DiagReadDtcs {
            requestId,
            adapterId,
            module,
        } => match wrapper.read_dtcs(&adapterId, &module) {
            Ok(dtcs) => Response {
                requestId,
                ok: true,
                payload: serde_json::json!({
                    "module": module,
                    "dtcs": dtcs
                }),
                timestamp: now_ms(),
                error: None,
            },
            Err(err) => Response {
                requestId,
                ok: false,
                payload: serde_json::json!({}),
                timestamp: now_ms(),
                error: Some(err.to_string()),
            },
        },
        Request::DiagClearDtcs {
            requestId,
            adapterId,
            module,
            clearAll,
            confirmed,
        } => match wrapper.clear_dtcs(&adapterId, module.as_deref(), clearAll, confirmed) {
            Ok(detail) => Response {
                requestId,
                ok: true,
                payload: serde_json::json!({
                    "cleared": true,
                    "scope": if clearAll {
                        "ALL".to_string()
                    } else {
                        module.unwrap_or_else(|| "UNKNOWN_MODULE".to_string())
                    },
                    "detail": detail
                }),
                timestamp: now_ms(),
                error: None,
            },
            Err(err) => Response {
                requestId,
                ok: false,
                payload: serde_json::json!({}),
                timestamp: now_ms(),
                error: Some(err.to_string()),
            },
        },
    }
}

fn run() -> Result<()> {
    let wrapper = J2534Wrapper::new();
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = line?;

        if line.trim().is_empty() {
            continue;
        }

        let request: Result<Request, _> = serde_json::from_str(&line);
        let response = match request {
            Ok(req) => handle_request(&wrapper, req),
            Err(err) => Response {
                requestId: "parse-error".to_string(),
                ok: false,
                payload: serde_json::json!({}),
                timestamp: now_ms(),
                error: Some(err.to_string()),
            },
        };

        let serialized = serde_json::to_string(&response)?;
        writeln!(stdout, "{}", serialized)?;
        stdout.flush()?;
    }

    Ok(())
}

fn main() {
    if let Err(err) = run() {
        eprintln!("j2534-service fatal error: {err}");
    }
}
