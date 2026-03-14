#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "[1/3] npm ci"
npm ci

echo "[2/3] compile"
npm run compile

echo "[3/3] package VSIX"
npm run package

echo "Done. VSIX file is in: $ROOT_DIR"
