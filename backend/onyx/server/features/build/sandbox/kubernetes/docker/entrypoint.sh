#!/bin/bash
# Sandbox container supervisor. Runs `opencode serve` in a restart loop
# with exponential backoff.
#
# Environment contract:
#   OPENCODE_SERVER_PASSWORD  HTTP Basic password for opencode-serve. Mounted
#                             from a per-pod K8s Secret (kubernetes backend)
#                             or injected at container create (docker
#                             backend). An empty value disables auth — we
#                             log loudly.
#   XDG_DATA_HOME             defaults to /workspace/.opencode-data so
#                             opencode's SQLite lands on the shared
#                             workspace volume and is captured by snapshots.
#
# Logs go to stdout/stderr so kubectl logs and the sidecar-mirrored log
# paths both pick them up.

set -euo pipefail

OPENCODE_PORT="${OPENCODE_SERVE_PORT:-4096}"
WORKSPACE_DATA_HOME="/workspace/.opencode-data"

export XDG_DATA_HOME="${XDG_DATA_HOME:-$WORKSPACE_DATA_HOME}"
mkdir -p "$XDG_DATA_HOME"

# Forward SIGTERM/SIGINT to the child so kubectl delete and graceful
# shutdown reach opencode.
child_pid=
trap 'if [ -n "$child_pid" ]; then kill -TERM "$child_pid" 2>/dev/null || true; fi; exit 0' SIGTERM SIGINT

if [ -z "${OPENCODE_SERVER_PASSWORD:-}" ]; then
    echo "[entrypoint] WARNING: OPENCODE_SERVER_PASSWORD is empty — opencode serve will run without auth"
fi

backoff=1
max_backoff=30

while true; do
    echo "[entrypoint] starting opencode serve on 0.0.0.0:$OPENCODE_PORT (XDG_DATA_HOME=$XDG_DATA_HOME)"
    set +e
    opencode serve --hostname 0.0.0.0 --port "$OPENCODE_PORT" --print-logs &
    child_pid=$!
    wait "$child_pid"
    exit_code=$?
    set -e
    child_pid=

    echo "[entrypoint] opencode serve exited (code=$exit_code); restarting in ${backoff}s"
    sleep "$backoff"
    # Exponential backoff capped at max_backoff
    backoff=$((backoff * 2))
    if [ "$backoff" -gt "$max_backoff" ]; then
        backoff=$max_backoff
    fi
done
