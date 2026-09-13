use crate::State;
use crate::state::{CacheBehaviour, CachedEntry};
pub use daedalus::minecraft::VersionManifest;
pub use daedalus::modded::Manifest;

#[tracing::instrument]
pub async fn get_minecraft_versions() -> crate::Result<VersionManifest> {
    let state = State::get().await?;
    let minecraft_versions = CachedEntry::get_minecraft_manifest(
        None,
        &state.pool,
        &state.api_semaphore,
    )
    .await?
    .ok_or_else(|| {
        crate::ErrorKind::NoValueFor("minecraft versions".to_string())
    })?;

    Ok(minecraft_versions)
}

// #[tracing::instrument]
pub async fn get_loader_versions(loader: &str) -> crate::Result<Manifest> {
	get_loader_versions_with_cache(loader, None).await
}

/// Fetch the loader manifest directly from launcher-meta.
///
/// Launches use this path so a loader version saved in an older instance can
/// never silently become the version we run forever. The normal cached API is
/// kept for UI callers that deliberately prefer cache-first rendering.
pub async fn get_loader_versions_latest(loader: &str) -> crate::Result<Manifest> {
	get_loader_versions_with_cache(loader, Some(CacheBehaviour::Bypass)).await
}

async fn get_loader_versions_with_cache(
	loader: &str,
	cache_behaviour: Option<CacheBehaviour>,
) -> crate::Result<Manifest> {
	let state = State::get().await?;
	let cache_key =
		daedalus::modded::loader_manifest_metadata(loader).cache_key;
	let loaders = CachedEntry::get_loader_manifest(
		&cache_key,
		cache_behaviour,
		&state.pool,
		&state.api_semaphore,
    )
    .await?
    .ok_or_else(|| {
        crate::ErrorKind::NoValueFor(format!("{loader} loader versions"))
    })?;

    Ok(loaders.manifest)
}
