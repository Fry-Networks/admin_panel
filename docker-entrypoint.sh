#!/bin/sh
set -eu

TOKEN_FILE=/run/secrets/op_service_account_token
CRYPTO_TOKEN_FILE=/run/secrets/op_sa_crypto
FRYBOT_KEY_FILE=/run/secrets/frybot_api_key

if [ ! -s "$TOKEN_FILE" ]; then
  echo "Missing or empty op service account token file: $TOKEN_FILE" >&2
  exit 1
fi

OP_SERVICE_ACCOUNT_TOKEN="$(cat "$TOKEN_FILE")"
OP_CONFIG_DIR=/tmp/op

# Pre-resolve ALGOD_TOKEN from crypto SA key (separate vault from AdminPanel secrets)
ALGOD_TOKEN=""
if [ -s "$CRYPTO_TOKEN_FILE" ]; then
  CRYPTO_SA_TOKEN="$(cat "$CRYPTO_TOKEN_FILE")"
  if ! ALGOD_TOKEN=$(gosu appuser env OP_SERVICE_ACCOUNT_TOKEN="$CRYPTO_SA_TOKEN" op read "op://Selfhosted Crypto Nodes/ATLAS00 Algod Token/ALGOD_TOKEN" 2>/dev/null); then
    echo "WARNING: Failed to resolve ALGOD_TOKEN from 1Password" >&2
    ALGOD_TOKEN=""
  fi
  unset CRYPTO_SA_TOKEN
else
  echo "WARNING: Crypto SA token file not found: $CRYPTO_TOKEN_FILE" >&2
fi

# Build env args for all variables that need op:// resolution
ENV_ARGS="OP_SERVICE_ACCOUNT_TOKEN=$OP_SERVICE_ACCOUNT_TOKEN OP_CONFIG_DIR=$OP_CONFIG_DIR"

# Add ALGOD_TOKEN if resolved
if [ -n "$ALGOD_TOKEN" ]; then
  ENV_ARGS="$ENV_ARGS ALGOD_TOKEN=$ALGOD_TOKEN"
fi

# Add FRYBOT_API_KEY if present
if [ -s "$FRYBOT_KEY_FILE" ]; then
  FRYBOT_API_KEY="$(cat "$FRYBOT_KEY_FILE")"
  ENV_ARGS="$ENV_ARGS FRYBOT_API_KEY=$FRYBOT_API_KEY"
fi

# Add all op:// variables from current environment
for var in MONGO_URI NEXTAUTH_SECRET GITHUB_ID GITHUB_SECRET GITHUB_ID_DEV GITHUB_SECRET_DEV BASE_API_KEY ADMIN_PASSWORD STAKE_MNEMONIC STAKE_REKEY REWARD_REKEY REWARD_MNEMONIC CLUSTER_API_URL CLUSTER_API_KEY; do
  val=$(printenv "$var" 2>/dev/null || true)
  if [ -n "$val" ]; then
    ENV_ARGS="$ENV_ARGS $var=$val"
  fi
done

exec gosu appuser env $ENV_ARGS op run -- "$@"
