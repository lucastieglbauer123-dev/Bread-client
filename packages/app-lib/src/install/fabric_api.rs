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
    if installed.iter().any(|file| {
        file.project_id.as_deref() == Some(FABRIC_API_PROJECT_ID)
            || Path::new(&file.relative_path)
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| {
                    name.starts_with("fabric-api-") && name.ends_with(".jar")
                })
    }) {
        return Ok(false);
    }

    let plan = crate::state::instances::commands::resolve_install_plan(
        instance_id,
        crate::state::instances::commands::InstanceInstallProjectRequest {
            project_id: FABRIC_API_PROJECT_ID.to_string(),
            version_id: None,
            content_type: ContentType::Mod,
            selected: ResolutionPreferences::default(),
        },
        state,
    )
    .await?;

    crate::state::instances::commands::install_resolved_content_plan(
        instance_id,
        &plan,
        state,
    )
    .await?;

    tracing::info!(
        instance_id,
        game_version = %context.applied_content_set.game_version,
        "Installed Fabric API and its required dependencies"
    );
    Ok(true)
}
