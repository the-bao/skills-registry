use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    BadRequest(String),
    Internal(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::BadRequest(msg) => write!(f, "Bad request: {}", msg),
            AppError::Internal(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
        };

        tracing::error!("{}", self);

        (status, Json(json!({ "error": message }))).into_response()
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}

impl From<redb::Error> for AppError {
    fn from(err: redb::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}

impl From<redb::StorageError> for AppError {
    fn from(err: redb::StorageError) -> Self {
        AppError::Internal(err.to_string())
    }
}

impl From<redb::TransactionError> for AppError {
    fn from(err: redb::TransactionError) -> Self {
        AppError::Internal(err.to_string())
    }
}

impl From<redb::TableError> for AppError {
    fn from(err: redb::TableError) -> Self {
        AppError::Internal(err.to_string())
    }
}

impl From<redb::CommitError> for AppError {
    fn from(err: redb::CommitError) -> Self {
        AppError::Internal(err.to_string())
    }
}

impl From<redb::DatabaseError> for AppError {
    fn from(err: redb::DatabaseError) -> Self {
        AppError::Internal(err.to_string())
    }
}
