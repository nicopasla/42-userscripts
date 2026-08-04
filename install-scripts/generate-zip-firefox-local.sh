#!/usr/bin/env bash
set -euo pipefail

npm run build:firefox
npx web-ext build --source-dir dist-firefox --artifacts-dir web-ext-artifacts
