use anyhow::{bail, Result};
use serde::Serialize;
use super::dll::J2534Dll;

#[derive(Serialize)]
pub struct DiagnosticCode {
    pub code: String,
    pub description: String,
    pub severity: String,
}

pub struct J2534Wrapper {
    dll: Option<J2534Dll>,
}

impl J2534Wrapper {
    pub fn new() -> Self {
        let dll = J2534Dll::load_from_env().ok();
        Self { dll }
    }

    pub fn list_adapters(&self) -> Result<Vec<String>> {
        if let Some(dll) = &self.dll {
            return Ok(vec![format!("J2534-DLL-READY:{}", dll.path().display())]);
        }

        // TODO: Enumerate adapters via PassThruOpen/PassThruIoctl once bindings are wired.
        Ok(vec!["MONGOOSEPRO-MOCK-001".to_string()])
    }

    pub fn read_vin(&self, _adapter_id: &str) -> Result<String> {
        // TODO: Execute vehicle session open and VIN read by identifier.
        Ok("SALXXXXXXXXXXXXXX".to_string())
    }

    pub fn scan_modules(&self, _adapter_id: &str, _protocol_hint: Option<&str>) -> Result<Vec<String>> {
        // TODO: Query available modules from active diagnostic session.
        Ok(vec![
            "ECM_PCM".to_string(),
            "TCM".to_string(),
            "BCM_CJB".to_string(),
            "EAS".to_string(),
            "ABS_DSC".to_string(),
        ])
    }

    pub fn read_dtcs(&self, _adapter_id: &str, module: &str) -> Result<Vec<DiagnosticCode>> {
        // TODO: Execute per-module DTC read using UDS/KWP path for selected ECU.
        let dtcs = match module {
            "ECM_PCM" => vec![
                DiagnosticCode {
                    code: "P0087".to_string(),
                    description: "Fuel rail pressure too low".to_string(),
                    severity: "HIGH".to_string(),
                },
                DiagnosticCode {
                    code: "P0401".to_string(),
                    description: "EGR flow insufficient detected".to_string(),
                    severity: "MEDIUM".to_string(),
                },
            ],
            "EAS" => vec![DiagnosticCode {
                code: "C1A20".to_string(),
                description: "Pressure increases too slow when filling reservoir".to_string(),
                severity: "HIGH".to_string(),
            }],
            "ABS_DSC" => vec![DiagnosticCode {
                code: "C1A96".to_string(),
                description: "ABS hydraulic pump motor circuit".to_string(),
                severity: "MEDIUM".to_string(),
            }],
            _ => vec![DiagnosticCode {
                code: "U0001".to_string(),
                description: format!("No module-specific mock DTC mapping for {}", module),
                severity: "INFO".to_string(),
            }],
        };

        Ok(dtcs)
    }

    pub fn clear_dtcs(
        &self,
        _adapter_id: &str,
        module: Option<&str>,
        clear_all: bool,
        confirmed: bool,
    ) -> Result<String> {
        if !confirmed {
            bail!("Clear DTC operation requires explicit confirmation");
        }

        let detail = if clear_all {
            "Cleared DTCs for all modules (mock service).".to_string()
        } else {
            format!(
                "Cleared DTCs for {} (mock service).",
                module.unwrap_or("UNKNOWN_MODULE")
            )
        };

        Ok(detail)
    }
}
