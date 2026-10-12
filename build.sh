#!/usr/bin/env sh
# Builds dist/firefox/ and dist/chrome/ (plus a .zip of each) from src/ + platform/<browser>/manifest.json.
set -e
cd "$(dirname "$0")"
rm -rf dist
for b in firefox chrome; do
  mkdir -p "dist/$b"
  cp -r src/. "dist/$b/"
  cp "platform/$b/manifest.json" "dist/$b/"
  (cd "dist/$b" && zip -qr "../leetcode-github-sync-$b.zip" .)
  echo "built dist/$b and dist/leetcode-github-sync-$b.zip"
done
