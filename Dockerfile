# =============================================================================
# Stage 1: Build Rust backend
# =============================================================================
FROM rust:1.86-bookworm AS backend-builder

WORKDIR /app

# Copy manifests first for dependency caching
COPY backend/Cargo.toml backend/Cargo.lock* /app/backend/
COPY backend/src /app/backend/src/

# Build backend
RUN cd /app/backend && cargo build --release

# =============================================================================
# Stage 2: Build frontend
# =============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy and install dependencies
COPY frontend/package.json frontend/package-lock.json* /app/frontend/
RUN cd /app/frontend && npm install

# Copy source and build
COPY frontend/ /app/frontend/
RUN cd /app/frontend && npm run build

# =============================================================================
# Stage 3: Runtime
# =============================================================================
FROM debian:bookworm-slim

# Install CA certificates for HTTPS and required runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

# Copy built binary
COPY --from=backend-builder /app/backend/target/release/skills-registry /usr/local/bin/

# Copy frontend dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy default env and create data directories
COPY .env.example /app/.env.example
RUN mkdir -p /app/registry /app/data

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Default environment variables
ENV REGISTRY_PATH=/app/registry
ENV DB_PATH=/app/data/registry.db
ENV SKILLS_INSTALL_PATH=/home/appuser/.claude/skills
ENV PORT=3000
ENV FRONTEND_DIST=/app/frontend/dist

CMD ["skills-registry"]
