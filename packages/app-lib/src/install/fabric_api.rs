use crate::state::{ModLoader, State};
use modrinth_content_management::{ContentType, ResolutionPreferences};
use std::path::Path;

const FABRIC_API_PROJECT_ID: &str = "P7dR8mSH";

/// Ensures every Fabric instance has a compatible Fabric API version.
///
/// Resolution and dependency installation deliberately go through the same
/// content-management pipeline as normal mod installs. That keeps API
/// metadata, hashes, dependency edges, and instance events consistent with
/// user-installed content. The operation is idempotent and also repairs an
/// instance created before Fabric API was made automatic.
pub(crate) async fn ensure_fabric_api(
    instance_id: &str,
    state: &State,
) -> crate::Result<bool> {
    let Some(context) =
        crate::state::instances::commands::get_instance_launch_context(
            instance_id,
            &state.pool,
        )
        .await?
    else {
        return Ok(false);
    };

    if context.applied_content_set.loader != ModLoader::Fabric {
        return Ok(false);
    }

	// Prefer project metadata recorded by the content pipeline. The filename
	// fallback covers an API jar copied into an instance before it was indexed.
	let installed = crate::state::instances::commands::list_project_files(
		instance_id,
		state,
	)
	.await?;
	let installed_api_files = installed
		.iter()
		.filter(|file| {
			file.project_id.as_deref() == Some(FABRIC_API_PROJECT_ID)
				|| Path::new(&file.relative_path)
					.file_name()
					.and_then(|name| name.to_str())
					.is_some_and(|name| {
						name.starts_with("fabric-api-") && name.ends_with(".jar")
					})
		})
		.map(|file| file.relative_path.clone())
		.collect::<Vec<_>>();
	let installed_api_versions = installed
		.iter()
		.filter(|file| {
			file.project_id.as_deref() == Some(FABRIC_API_PROJECT_ID)
				|| Path::new(&file.relative_path)
					.file_name()
					.and_then(|name| name.to_str())
					.is_some_and(|name| {
						name.starts_with("fabric-api-") && name.ends_with(".jar")
					})
		})
		.filter_map(|file| file.version_id.as_deref())
		.collect::<std::collections::HashSet<_>>();

	// Resolve against the origin before removing the current jar. If the
	// network is unavailable, keep the known-good installed API so an offline
	// launch is still possible; the next launch will retry the fresh lookup.
	let plan = match crate::state::instances::commands::resolve_install_plan_fresh(
		instance_id,
		crate::state::instances::commands::InstanceInstallProjectRequest {
			project_id: FABRIC_API_PROJECT_ID.to_string(),
			version_id: None,
			content_type: ContentType::Mod,
			selected: ResolutionPreferences::default(),
		},
		state,
	)
	.await
	{
		Ok(plan) => plan,
		Err(error) if !installed_api_files.is_empty() => {
			tracing::warn!(
				instance_id,
				error = %error,
				"Unable to refresh Fabric API metadata; keeping the installed API for offline launch"
			);
			return Ok(false);
		}
		Err(error) => return Err(error),
	};
	if installed_api_versions.len() == 1
		&& installed_api_versions.contains(plan.primary.version_id.as_str())
	{
		return Ok(false);
	}

	for relative_path in installed_api_files {
		crate::state::instances::commands::remove_project(
			instance_id,
			&relative_path,
			state,
		)
		.await?;
	}

	crate::state::instances::commands::install_resolved_content_plan(
		instance_id,
		&plan,
		state,
	)
	.await?;

	tracing::info!(
		instance_id,
		game_version = %context.applied_content_set.game_version,
		version_id = %plan.primary.version_id,
		"Installed the latest compatible Fabric API"
	);
	Ok(true)
}
