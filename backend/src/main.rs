mod ai;
mod config;
mod error;
mod handlers;
mod models;
mod parser;
mod store;

use std::path::PathBuf;
use std::sync::Arc;

use axum::{Router, routing::{get, post, delete, put}, Json};
use serde_json::{json, Value};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use handlers::skills::AppState;

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

#[tokio::main]
async fn main() {
    // Load .env file if present
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt::init();

    let config = config::Config::from_env();
    tracing::info!("Config: {:?}", config);

    // Open database
    let store = store::Store::open(&config.db_path).expect("Failed to open database");

    // Sync from filesystem
    store.sync_from_fs(&config.registry_path).expect("Failed to sync from filesystem");

    let state = AppState {
        store: Arc::new(store),
        registry_path: config.registry_path.clone(),
        skills_install_path: config.skills_install_path.clone(),
        http_client: reqwest::Client::new(),
        anthropic_api_key: config.anthropic_api_key.clone(),
        anthropic_base_url: config.anthropic_base_url.clone(),
        anthropic_model: config.anthropic_model.clone(),
    };

    let api_routes = Router::new()
        .route("/health", get(health))
        // Skills CRUD
        .route("/skills", get(handlers::skills::list_skills).post(handlers::skills::add_skill))
        .route("/skills/auto-tag", post(handlers::auto_tag::auto_tag_all))
        .route("/skills/{name}", get(handlers::skills::get_skill).delete(handlers::skills::delete_skill))
        // Tags
        .route("/tags", get(handlers::tags::list_tags))
        .route("/tags/detail", get(handlers::tags::list_tag_details))
        .route("/tags/{tag}", put(handlers::tags::rename_tag).delete(handlers::tags::delete_tag))
        .route("/skills/{name}/suggest-tags", post(handlers::auto_tag::suggest_tags))
        .route("/skills/{name}/tags", post(handlers::tags::add_tag))
        .route("/skills/{name}/tags/{tag}", delete(handlers::tags::remove_tag))
        // Combinations
        .route("/combinations", get(handlers::combinations::list_combinations).post(handlers::combinations::create_combination))
        .route("/combinations/{name}", get(handlers::combinations::get_combination).delete(handlers::combinations::delete_combination).put(handlers::combinations::update_combination))
        .route("/combinations/{name}/install", post(handlers::combinations::install_combination))
        // Install/Import
        .route("/skills/{name}/install", post(handlers::install::install_skill))
        .route("/skills/import", post(handlers::install::import_skills))
        .route("/skills/import-github", post(handlers::install::import_from_github))
        .route("/skills/importable", get(handlers::install::list_importable))
        .with_state(state);

    let frontend_dist = std::env::var("FRONTEND_DIST")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            // Default: look for frontend/dist relative to project root
            let base = std::env::current_dir().unwrap_or_default();
            base.join("frontend").join("dist")
        });

    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(ServeDir::new(frontend_dist))
        .layer(CorsLayer::permissive());

    let addr = format!("0.0.0.0:{}", config.port);
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
