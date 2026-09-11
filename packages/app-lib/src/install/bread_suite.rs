use crate::state::{ModLoader, State};

struct SuiteJar {
	file_name: &'static str,
	bytes: &'static [u8],
}

const SUITE_1_16: SuiteJar = SuiteJar {
	file_name: "BreadClient-3.1.6+1.16_combat-6.jar",
	bytes: include_bytes!("../../assets/bread-suite/BreadClient-suite-1.16_combat-6.jar"),
};
const SUITE_1_20: SuiteJar = SuiteJar {
	file_name: "BreadClient-3.1.6+1.20.1.jar",
	bytes: include_bytes!("../../assets/bread-suite/BreadClient-suite-1.20.1.jar"),
};
const SUITE_1_21: SuiteJar = SuiteJar {
	file_name: "BreadClient-3.1.6+1.21.1.jar",
	bytes: include_bytes!("../../assets/bread-suite/BreadClient-suite-1.21.1.jar"),
};
const SUITE_1_LATEST: SuiteJar = SuiteJar {
	file_name: "BreadClient-3.1.6+1.21.10.jar",
	bytes: include_bytes!("../../assets/bread-suite/BreadClient-suite-1.21.10.jar"),
};
const SUITE_26_2: SuiteJar = SuiteJar {
	file_name: "BreadClient-3.1.6+26.2.jar",
	bytes: include_bytes!("../../assets/bread-suite/BreadClient-suite-26.2.jar"),
};

fn suite_for_version(game_version: &str) -> Option<&'static SuiteJar> {
	match game_version.trim() {
		"1.16" | "1.16.5" | "1.16_combat-6" => Some(&SUITE_1_16),
		"1.20" | "1.20.1" => Some(&SUITE_1_20),
		"1.21" | "1.21.1" => Some(&SUITE_1_21),
		"1.21.10" | "latest" => Some(&SUITE_1_LATEST),
		"26.2" => Some(&SUITE_26_2),
		_ => None,
	}
}

/// Installs the version-matched Bread gameplay suite and locks its file in the
/// content index. The jar remains visible and can be toggled, but deletion is
/// rejected and a later launch restores it if an external tool removed it.
pub(crate) async fn ensure_bread_suite(
	instance_id: &str,
	state: &State,
) -> crate::Result<bool> {
	let Some(context) = crate::state::instances::commands::get_instance_launch_context(
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
	let Some(suite) = suite_for_version(&context.applied_content_set.game_version)
	else {
		tracing::debug!(
			instance_id,
			game_version = %context.applied_content_set.game_version,
			"No Bread suite build is available for this Minecraft version"
		);
		return Ok(false);
	};

	let mods_dir = state
		.directories
		.instances_dir()
		.join(&context.instance.path)
		.join("mods");
	tokio::fs::create_dir_all(&mods_dir).await?;
	let target = mods_dir.join(suite.file_name);
	let needs_write = match tokio::fs::metadata(&target).await {
		Ok(metadata) => metadata.len() != suite.bytes.len() as u64,
		Err(error) if error.kind() == std::io::ErrorKind::NotFound => true,
		Err(error) => return Err(error.into()),
	};
	if needs_write {
		let temporary = target.with_extension("jar.bread-tmp");
		tokio::fs::write(&temporary, suite.bytes).await?;
		if let Err(error) = tokio::fs::remove_file(&target).await
			&& error.kind() != std::io::ErrorKind::NotFound
		{
			let _ = tokio::fs::remove_file(&temporary).await;
			return Err(error.into());
		}
		tokio::fs::rename(&temporary, &target).await?;
	}

	let relative_path = format!("mods/{}", suite.file_name);
	crate::state::instances::commands::sync_content_files(instance_id, state)
		.await?;
	crate::state::instances::commands::set_project_locked(
		instance_id,
		&relative_path,
		true,
		state,
	)
	.await?;

	if needs_write {
		tracing::info!(
			instance_id,
			game_version = %context.applied_content_set.game_version,
			path = %relative_path,
			"Installed the built-in Bread gameplay suite"
		);
	}
	Ok(needs_write)
}
