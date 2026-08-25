#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm run build:firefox
npx web-ext build --source-dir dist-firefox --artifacts-dir install-scripts/web-ext-artifacts --overwrite-dest
