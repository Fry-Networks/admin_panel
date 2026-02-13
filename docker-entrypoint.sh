#!/bin/sh
set -eu

TOKEN_FILE=/run/secrets/op_service_account_token

if [ ! -s "$TOKEN_FILE" ]; then
  echo "Missing or empty op service account token file: $TOKEN_FILE" >&2
  exit 1
fi

export OP_SERVICE_ACCOUNT_TOKEN="$(cat "$TOKEN_FILE")"
export OP_CONFIG_DIR=/tmp/op

exec gosu appuser op run -- "$@"
