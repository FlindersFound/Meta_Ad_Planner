#!/usr/bin/env bash
set -e
export NEXT_TELEMETRY_DISABLED=1
echo "👉 Checking Node and npm..."
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed."
  echo "   Install the LTS version from https://nodejs.org, then re-run: bash run.sh"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm is not available. It normally comes with Node.js."
  echo "   Reinstall Node LTS from https://nodejs.org, then re-run: bash run.sh"
  exit 1
fi
NODE_MAJOR=$(node -v | sed -E 's/v([0-9]+).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ] || [ "$NODE_MAJOR" -ge 23 ]; then
  echo "⚠️  Detected Node $(node -v). Recommended: Node 18.x or 20.x."
  echo "   You can continue, but if you see issues, install LTS from https://nodejs.org"
fi
echo "👉 Installing dependencies (first run only)..."
npm install --no-audit --no-fund
echo "👉 Running security audit fix (safe)..."
npm audit fix || true
echo "👉 Running security audit fix (force, if needed)..."
npm audit fix --force || true
echo "✅ Dependencies installed and audit fixes (if any) applied."
echo "👉 Starting the dev server at http://localhost:3000 ..."
npm run dev
