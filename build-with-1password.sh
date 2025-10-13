#!/usr/bin/env bash
# Wrapper script to build the admin panel with secrets from 1Password.
set -euo pipefail

VAULT="AdminPanel"
ITEM="AdminPanel"

if ! command -v op >/dev/null 2>&1; then
  echo "Error: 1Password CLI (op) is not installed or not in PATH." >&2
  exit 1
fi

# Attempt to source the service account token if not already exported.
if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
  echo "OP_SERVICE_ACCOUNT_TOKEN not found in environment, attempting to load from 1Password..."
  token="$(op read "op://${VAULT}/${ITEM}/OP_SERVICE_ACCOUNT_TOKEN" 2>/dev/null || true)"
  token="$(echo "${token}" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  if [ -n "${token}" ]; then
    export OP_SERVICE_ACCOUNT_TOKEN="${token}"
  fi
fi

if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ]; then
  cat >&2 <<'EOF'
Error: OP_SERVICE_ACCOUNT_TOKEN is not available.
Set it manually (export OP_SERVICE_ACCOUNT_TOKEN="...") or sign in to the 1Password CLI so it can be read from the vault.
EOF
  exit 1
fi

echo "Loading build-time secrets from 1Password vault: ${VAULT}"

get_secret() {
  local field_name="$1"
  local value
  value="$(op item get "${ITEM}" --vault "${VAULT}" --fields "${field_name}" --reveal 2>/dev/null || true)"
  value="$(echo "${value}" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  if [ -z "${value}" ]; then
    echo "Error: Failed to retrieve ${field_name} from 1Password (${VAULT}/${ITEM})." >&2
    exit 1
  fi
  printf '%s' "${value}"
}

SECRETS=(
  NEXTAUTH_SECRET
  GITHUB_ID
  GITHUB_SECRET
  GITHUB_ID_DEV
  GITHUB_SECRET_DEV
  MONGO_URI
  BASE_API_KEY
  ADMIN_PASSWORD
  STAKE_MNEMONIC
  STAKE_REKEY
  REWARD_REKEY
  REWARD_MNEMONIC
)

for secret_name in "${SECRETS[@]}"; do
  export "${secret_name}"="$(get_secret "${secret_name}")"
done

# Optional secrets (missing fields are ignored gracefully)
OPTIONAL_SECRETS=(
  MAX_REFUND_AMOUNT
)

for secret_name in "${OPTIONAL_SECRETS[@]}"; do
  value="$(op item get "${ITEM}" --vault "${VAULT}" --fields "${secret_name}" --reveal 2>/dev/null || true)"
  value="$(echo "${value}" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  if [ -n "${value}" ]; then
    export "${secret_name}"="${value}"
  fi
done

if [[ ! "${MONGO_URI}" =~ ^mongodb(\+srv)?:// ]]; then
  echo "Error: MONGO_URI retrieved from 1Password does not appear to be a MongoDB URI." >&2
  exit 1
fi

echo "Secrets loaded successfully. Building Next.js app..."
exec npm run build
