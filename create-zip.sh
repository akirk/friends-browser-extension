#!/usr/bin/env bash
set -euo pipefail

rm -f ext.zip
zip -r ext.zip manifest.json background.js content.js icons popup settings
