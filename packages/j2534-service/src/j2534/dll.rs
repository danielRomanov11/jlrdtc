use anyhow::{Context, Result};
use libloading::{Library, Symbol};
use std::env;
use std::path::{Path, PathBuf};

// J2534 requires these functions for the basic transport lifecycle.
const REQUIRED_EXPORTS: &[&[u8]] = &[
    b"PassThruOpen\0",
    b"PassThruClose\0",
    b"PassThruConnect\0",
    b"PassThruDisconnect\0",
    b"PassThruReadMsgs\0",
    b"PassThruWriteMsgs\0",
    b"PassThruIoctl\0",
];

type J2534Fn = unsafe extern "system" fn() -> u32;

pub struct J2534Dll {
    _library: Library,
    path: PathBuf,
}

impl J2534Dll {
    pub fn load_from_env() -> Result<Self> {
        let path = env::var("JLRDTC_J2534_DLL")
            .context("JLRDTC_J2534_DLL is not set. Point it to the vendor J2534 DLL path.")?;

        Self::load(Path::new(&path))
    }

    pub fn load(path: &Path) -> Result<Self> {
        let library = unsafe { Library::new(path) }
            .with_context(|| format!("Unable to load J2534 DLL at {}", path.display()))?;

        let dll = Self {
            _library: library,
            path: path.to_path_buf(),
        };

        dll.validate_required_exports()?;
        Ok(dll)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn validate_required_exports(&self) -> Result<()> {
        for export in REQUIRED_EXPORTS {
            let _symbol: Symbol<'_, J2534Fn> = unsafe { self._library.get(export) }.with_context(|| {
                format!(
                    "J2534 DLL {} is missing required export {}",
                    self.path.display(),
                    String::from_utf8_lossy(export).trim_end_matches('\0')
                )
            })?;
        }

        Ok(())
    }
}
