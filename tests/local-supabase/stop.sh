#!/usr/bin/env bash
docker rm -f hf-db hf-auth hf-rest hf-storage hf-realtime >/dev/null 2>&1 || true
echo "parado"
