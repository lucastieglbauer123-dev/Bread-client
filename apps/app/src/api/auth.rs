use crate::api::Result;
use chrono::{Duration, Utc};
use std::sync::{
    Arc,
    atomic::{AtomicU64, Ordering},
};
use tauri::plugin::TauriPlugin;
use tauri::{Manager, Runtime, UserAttentionType};
use theseus::prelude::*;
use url::Url;

const LOOPBACK_AUTH_REPLY_URL: &str = "http://localhost";
const DESKTOP_AUTH_REPLY_URL: &str =
    "https://login.live.com/oauth20_desktop.srf";
const REGISTERED_AUTH_REPLY_URLS: [&str; 2] =
    [LOOPBACK_AUTH_REPLY_URL, DESKTOP_AUTH_REPLY_URL];

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::<R>::new("auth")
        .invoke_handler(tauri::generate_handler![
            check_reachable,
            login,
            remove_user,
            get_default_user,
            set_default_user,
            get_users,
        ])
        .build()
}

/// Checks if the authentication servers are reachable.
#[tauri::command]
pub async fn check_reachable() -> Result<()> {
    minecraft_auth::check_reachable().await?;
    Ok(())
}

fn matched_auth_reply_url(url: &Url) -> Option<&'static str> {
    REGISTERED_AUTH_REPLY_URLS
        .iter()
        .copied()
        .find(|registered| {
            let Ok(registered) = Url::parse(registered) else {
                return false;
            };

            let current_path = url.path().trim_end_matches('/');
            let registered_path = registered.path().trim_end_matches('/');

            url.scheme() == registered.scheme()
                && url.host_str() == registered.host_str()
                && url.port_or_known_default()
                    == registered.port_or_known_default()
                && current_path == registered_path
        })
}

fn redacted_navigation_url(url: &Url) -> String {
    let mut redacted_url = url.clone();

    if url.query().is_some() {
        let mut query = url::form_urlencoded::Serializer::new(String::new());
        for (key, value) in url.query_pairs() {
            if matches!(
                key.as_ref(),
                "code"
                    | "state"
                    | "client_secret"
                    | "access_token"
                    | "refresh_token"
                    | "id_token"
            ) {
                query.append_pair(&key, "[redacted]");
            } else {
                query.append_pair(&key, &value);
            }
        }
        redacted_url.set_query(Some(&query.finish()));
    }

    redacted_url.to_string()
}

/// Authenticate a user with Hydra - part 1
/// This begins the authentication flow quasi-synchronously, returning a URL to visit (that the user will sign in at)
#[tauri::command]
pub async fn login<R: Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<Credentials>> {
    let mut flow = minecraft_auth::begin_login().await?;

    let start = Utc::now();

    if let Some(window) = app.get_webview_window("signin") {
        window.close()?;
    }

    let navigation_sequence = Arc::new(AtomicU64::new(0));
    let navigation_sequence_for_handler = Arc::clone(&navigation_sequence);
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        "signin",
        tauri::WebviewUrl::External(flow.auth_request_uri.parse().map_err(
            |_| {
                theseus::ErrorKind::OtherError(
                    "Error parsing auth redirect URL".to_string(),
                )
                .as_error()
            },
        )?),
    )
    .on_navigation(move |url| {
        let sequence =
            navigation_sequence_for_handler.fetch_add(1, Ordering::Relaxed) + 1;
        let url = redacted_navigation_url(url);
        tracing::info!(sequence, url = %url, "Microsoft login WebView2 navigation");
        true
    })
    .title("Sign into Bread Client")
    .always_on_top(true)
    .min_inner_size(500.0, 500.0)
    .inner_size(1000.0, 700.0)
    .focused(true)
    .center()
    .build()?;

    window.request_user_attention(Some(UserAttentionType::Critical))?;

    while (Utc::now() - start) < Duration::minutes(10) {
        if window.title().is_err() {
            // user closed window, cancelling flow
            return Ok(None);
        }

        let current_url = window.url()?;
        if let Some(redirect_uri) = matched_auth_reply_url(&current_url)
            && let Some((_, code)) =
                current_url.query_pairs().find(|x| x.0 == "code")
        {
            tracing::info!(redirect_uri, "Microsoft login callback captured");
            flow.redirect_uri = redirect_uri.to_string();
            window.close()?;
            let val = minecraft_auth::finish_login(&code, flow).await?;

            return Ok(Some(val));
        }

        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    window.close()?;
    Ok(None)
}

#[tauri::command]
pub async fn remove_user(user: uuid::Uuid) -> Result<()> {
    Ok(minecraft_auth::remove_user(user).await?)
}

#[tauri::command]
pub async fn get_default_user() -> Result<Option<uuid::Uuid>> {
    Ok(minecraft_auth::get_default_user().await?)
}

#[tauri::command]
pub async fn set_default_user(user: uuid::Uuid) -> Result<()> {
    Ok(minecraft_auth::set_default_user(user).await?)
}

/// Get a copy of the list of all user credentials
#[tauri::command]
pub async fn get_users() -> Result<Vec<Credentials>> {
    Ok(minecraft_auth::users().await?)
}
