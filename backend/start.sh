#!/bin/bash
# Development startup script for backend.
# Improves resilience when repeatedly pressing VS Code Run (which can leave an old
# nodemon/server process holding the port). This script will:
# 1. Detect any process already listening on $PORT (default 3000)
# 2. Attempt graceful termination, then force kill if still present
# 3. Start the dev server via npm (nodemon)

set -euo pipefail

PORT=${PORT:-3000}

echo "[backend/start.sh] Ensuring port $PORT is free before starting..."

get_pids() {
	ss -ltnp "sport = :$PORT" 2>/dev/null | awk 'NR>1 {print $7}' | \
		sed -E 's/.*,pid=([0-9]+),.*/\1/' | sort -u | tr '\n' ' '
}

PIDS=$(get_pids || true)
if [ -n "${PIDS// /}" ]; then
	echo "Found existing process(es) on port $PORT: $PIDS"
	echo "Attempting graceful shutdown (SIGTERM)..."
	for pid in $PIDS; do
		kill -TERM "$pid" 2>/dev/null || true
	done

	# Wait up to 5 seconds (10 * 0.5s) for processes to exit
	for i in {1..10}; do
		sleep 0.5
		REMAINING=$(get_pids || true)
		if [ -z "${REMAINING// /}" ]; then
			echo "Port $PORT is now free."
			break
		fi
		if [ $i -eq 10 ]; then
			echo "Processes still present after graceful period: $REMAINING"
			echo "Issuing SIGKILL..."
			for pid in $REMAINING; do
				kill -KILL "$pid" 2>/dev/null || true
			done
		fi
	done
else
	echo "Port $PORT already free."
fi

echo "Starting backend dev server on port $PORT..."
exec npm run dev