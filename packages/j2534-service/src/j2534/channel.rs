use anyhow::{bail, Result};

#[derive(Clone, Debug)]
pub struct J2534Channel {
    pub adapter_id: String,
    pub channel_id: u32,
}

impl J2534Channel {
    pub fn open(adapter_id: &str) -> Result<Self> {
        if adapter_id.is_empty() {
            bail!("Adapter id is required");
        }

        Ok(Self {
            adapter_id: adapter_id.to_string(),
            channel_id: 1,
        })
    }
}
