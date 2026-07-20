#!/usr/bin/env bash
# ===========================================================================
#  eReseta+ - Start the system (Linux / macOS)
#
#  Runs the API, queue worker and frontend together.
#  Press Ctrl+C once to stop all three.
# ===========================================================================
set -uo pipefail
cd "$(dirname "$0")"

if [ ! -d api/vendor ]; then
  echo "  [X] Backend dependencies are missing. Run: bash install.sh"
  exit 1
fi
if [ ! -d web/node_modules ]; then
  echo "  [X] Frontend dependencies are missing. Run: bash install.sh"
  exit 1
fi

echo
echo " =========================================================="
echo "   Starting eReseta+"
echo " =========================================================="
echo

pids=()
cleanup() {
  echo
  echo " Stopping services..."
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
  echo " Stopped."
  exit 0
}
trap cleanup INT TERM

( cd api && php artisan serve )      & pids+=($!)
( cd api && php artisan queue:work ) & pids+=($!)
( cd web && npm run dev )            & pids+=($!)

sleep 5
echo
echo " =========================================================="
echo "   eReseta+ is running"
echo " =========================================================="
echo
echo "   Frontend  http://localhost:5173"
echo "   API       http://localhost:8000"
echo
echo "   Press Ctrl+C to stop all services."
echo

wait
