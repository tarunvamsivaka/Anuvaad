#!/bin/sh
# ---------------------------------------------------------------------------
# Anuvaad Monolithic Container Process Supervisor (DEP-01)
# Ensures both Next.js frontend and FastAPI/Gunicorn backend run under active
# supervision. If either child process terminates or crashes, the supervisor
# immediately shuts down the entire container with exit code 1 to prevent
# silent partial failure states.
# ---------------------------------------------------------------------------
set -e

echo "[supervisor] Starting Next.js frontend on port 3000..."
cd /app/frontend && node server.js &
FRONTEND_PID=$!

echo "[supervisor] Starting FastAPI / Gunicorn backend on port 8000..."
cd /app && gunicorn main:app \
    --workers ${WEB_CONCURRENCY:-1} \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - &
BACKEND_PID=$!

# Forward SIGTERM and SIGINT to both child processes
trap 'kill -TERM "$FRONTEND_PID" "$BACKEND_PID" 2>/dev/null || true' TERM INT

echo "[supervisor] Both services started. Monitoring child processes ($FRONTEND_PID, $BACKEND_PID)..."

# Active supervision loop: if either process stops, exit container immediately
while kill -0 $FRONTEND_PID 2>/dev/null && kill -0 $BACKEND_PID 2>/dev/null; do
    sleep 2
done

echo "FATAL [supervisor]: A child service process terminated unexpectedly. Halting container." >&2
kill -TERM $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
exit 1
