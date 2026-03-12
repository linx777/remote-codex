#!/bin/zsh
set -euo pipefail

ROOT_DIR=${0:A:h:h}
cd "$ROOT_DIR"

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

SERVER_LOG=${SERVER_LOG:-/tmp/farfield-remote-server.log}
TUNNEL_LOG=${TUNNEL_LOG:-/tmp/farfield-remote-tunnel.log}
API_PASSWORD=${FARFIELD_API_PASSWORD:-zxczxc}

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun not found. Run 'source ~/.zshrc' or install Bun first." >&2
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "error: cloudflared not found. Install it with 'brew install cloudflared'." >&2
  exit 1
fi

cleanup() {
  local code=$?
  trap - INT TERM EXIT
  if [[ -n "${tunnel_pid:-}" ]]; then
    kill "$tunnel_pid" >/dev/null 2>&1 || true
  fi
  if [[ -n "${server_pid:-}" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
  fi
  wait >/dev/null 2>&1 || true
  exit $code
}
trap cleanup INT TERM EXIT

print_log_hint() {
  echo "Server log: $SERVER_LOG"
  echo "Tunnel log: $TUNNEL_LOG"
}

echo "Preparing Farfield workspace..."
bun run prepare:workspace-dist

echo "Starting Farfield backend..."
rm -f "$SERVER_LOG" "$TUNNEL_LOG"
bun run server >"$SERVER_LOG" 2>&1 &
server_pid=$!

health_check() {
  if [[ -n "$API_PASSWORD" ]]; then
    curl -fsS -H "x-farfield-api-password: $API_PASSWORD" \
      http://127.0.0.1:4311/api/health >/dev/null 2>&1
    return
  fi
  curl -fsS http://127.0.0.1:4311/api/health >/dev/null 2>&1
}

for _ in {1..30}; do
  if health_check; then
    break
  fi
  sleep 1
done

if ! health_check; then
  echo "error: Farfield backend did not become healthy on http://127.0.0.1:4311" >&2
  tail -n 40 "$SERVER_LOG" >&2 || true
  exit 1
fi

echo "Starting Cloudflare tunnel..."
cloudflared tunnel run farfield-api >"$TUNNEL_LOG" 2>&1 &
tunnel_pid=$!

sleep 2
if ! kill -0 "$tunnel_pid" >/dev/null 2>&1; then
  echo "error: Cloudflare tunnel exited during startup." >&2
  tail -n 40 "$TUNNEL_LOG" >&2 || true
  exit 1
fi

echo
echo "Farfield remote stack is running."
echo "Frontend: https://remote.ailin.uk"
echo "Backend:  https://api.ailin.uk"
echo "Local:    http://127.0.0.1:4311"
print_log_hint
echo "Press Ctrl+C to stop both processes."
echo

while true; do
  if ! kill -0 "$server_pid" >/dev/null 2>&1; then
    echo "Farfield backend exited." >&2
    tail -n 40 "$SERVER_LOG" >&2 || true
    exit 1
  fi
  if ! kill -0 "$tunnel_pid" >/dev/null 2>&1; then
    echo "Cloudflare tunnel exited." >&2
    tail -n 40 "$TUNNEL_LOG" >&2 || true
    exit 1
  fi
  sleep 1
done
