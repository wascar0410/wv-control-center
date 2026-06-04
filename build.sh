#!/bin/bash

# Build script for Railway deployment
# Ensures VITE_* environment variables are available during build time

set -e

echo "[Build] Starting build process..."

# Export VITE_* variables from environment if they exist
# This ensures Vite can access them during the build
if [ -n "$VITE_GOOGLE_MAPS_API_KEY" ]; then
  echo "[Build] VITE_GOOGLE_MAPS_API_KEY is available"
  export VITE_GOOGLE_MAPS_API_KEY
else
  echo "[Build] Warning: VITE_GOOGLE_MAPS_API_KEY not set in environment"
fi

# Export other VITE variables that might be needed
export VITE_APP_ID
export VITE_OAUTH_PORTAL_URL
export VITE_FRONTEND_FORGE_API_URL
export VITE_FRONTEND_FORGE_API_KEY
export VITE_ANALYTICS_ENDPOINT
export VITE_ANALYTICS_WEBSITE_ID
export VITE_APP_TITLE
export VITE_APP_LOGO

echo "[Build] Running pnpm build..."
pnpm build

echo "[Build] Running migrations..."
pnpm migrate

echo "[Build] Build complete!"
