#!/usr/bin/env bash
set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly RPC_URL="http://127.0.0.1:8899"
readonly LEDGER_DIR="/tmp/stocklana-test-ledger"
readonly VALIDATOR_LOG="/tmp/stocklana-validator.log"
readonly WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"
validator_pid=""

cleanup() {
  if [[ -n "$validator_pid" ]] && kill -0 "$validator_pid" 2>/dev/null; then
    kill "$validator_pid"
    wait "$validator_pid" 2>/dev/null || true
  fi
  rm -rf -- "$LEDGER_DIR"
}
trap cleanup EXIT INT TERM

cd "$REPO_ROOT"

if solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
  echo "Port 8899 is already in use by a validator." >&2
  exit 1
fi

rm -rf -- \
  "$REPO_ROOT/target/sbpfv2-solana-solana" \
  "$REPO_ROOT/target/sbpfv3-solana-solana"
rm -f -- "$REPO_ROOT/target/deploy/basket_vault.so"

cargo build-sbf \
  --tools-version v1.57 \
  --manifest-path programs/basket-vault/Cargo.toml

rm -rf -- "$LEDGER_DIR"
solana-test-validator \
  --reset \
  --ledger "$LEDGER_DIR" \
  --quiet >"$VALIDATOR_LOG" 2>&1 &
validator_pid=$!

validator_ready=false
for _ in {1..30}; do
  if solana cluster-version --url "$RPC_URL" >/dev/null 2>&1; then
    validator_ready=true
    break
  fi
  sleep 1
done

if [[ "$validator_ready" != true ]]; then
  echo "Validator did not become ready. Log output:" >&2
  cat "$VALIDATOR_LOG" >&2
  exit 1
fi

solana airdrop 100 --url "$RPC_URL"
solana program deploy \
  target/deploy/basket_vault.so \
  --program-id target/deploy/basket_vault-keypair.json \
  --url "$RPC_URL"

ANCHOR_PROVIDER_URL="$RPC_URL" \
ANCHOR_WALLET="$WALLET" \
npm run test:ts
