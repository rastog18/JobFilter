import json
import os
import subprocess
import threading
import time
from datetime import datetime, timezone

from flask import Flask, jsonify, send_from_directory

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DIR = os.path.join(ROOT, "frontend")
RANKED_PATH = os.path.join(DATA_DIR, "ranked_jobs.json")

app = Flask(__name__, static_folder=None)

_refresh_lock = threading.Lock()


@app.get("/")
def root():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/frontend/")
def frontend_root():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/frontend/<path:filename>")
def frontend_files(filename: str):
    return send_from_directory(FRONTEND_DIR, filename)


@app.get("/data/<path:filename>")
def data_files(filename: str):
    return send_from_directory(DATA_DIR, filename)


@app.get("/api/jobs")
def api_jobs():
    if not os.path.exists(RANKED_PATH):
        return jsonify({"ok": False, "error": "ranked_jobs.json not found. Run refresh."}), 404

    with open(RANKED_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify({"ok": True, "jobs": data})


@app.post("/api/refresh")
def api_refresh():
    clicked_at = datetime.now(timezone.utc).isoformat()

    if not _refresh_lock.acquire(blocking=False):
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "Refresh already running.",
                    "clickedAt": clicked_at,
                }
            ),
            409,
        )

    started = time.time()
    try:
        os.makedirs(DATA_DIR, exist_ok=True)

        # Run the existing pipeline exactly as documented.
        proc = subprocess.run(
            ["python", os.path.join("app", "main.py")],
            cwd=ROOT,
            capture_output=True,
            text=True,
            env=os.environ.copy(),
        )

        duration_ms = int((time.time() - started) * 1000)

        if proc.returncode != 0:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": "main.py failed",
                        "clickedAt": clicked_at,
                        "durationMs": duration_ms,
                        "stdout": proc.stdout[-4000:],
                        "stderr": proc.stderr[-4000:],
                    }
                ),
                500,
            )

        return jsonify(
            {
                "ok": True,
                "clickedAt": clicked_at,
                "durationMs": duration_ms,
                "message": "Refreshed by running app/main.py",
            }
        )
    finally:
        _refresh_lock.release()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "").strip() in {"1", "true", "True", "yes", "YES"}
    # Avoid spawning multiple processes that can confuse port usage.
    app.run(host="127.0.0.1", port=port, debug=debug, use_reloader=False)

