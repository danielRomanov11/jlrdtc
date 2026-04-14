use anyhow::Result;

pub struct J2534Wrapper;

impl J2534Wrapper {
    pub fn new() -> Self {
        Self
    }

    pub fn list_adapters(&self) -> Result<Vec<String>> {
        // TODO: Load vendor DLL and enumerate adapters via J2534 API.
        Ok(vec!["MONGOOSEPRO-MOCK-001".to_string()])
    }

    pub fn read_vin(&self, _adapter_id: &str) -> Result<String> {
        // TODO: Execute vehicle session open and VIN read by identifier.
        Ok("SALXXXXXXXXXXXXXX".to_string())
    }
}
