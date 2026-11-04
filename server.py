"""Serve the local upload UI and run one demand analysis at a time."""

from __future__ import annotations

import argparse
import json
import tempfile
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from analytics.build import build

ROOT = Path(__file__).resolve().parent
MAX_UPLOAD = 64 * 1024 * 1024
STAGES = [
    ("read", "Read transactions"),
    ("clean", "Clean sales"),
    ("weekly", "Build weekly series"),
    ("features", "Create earlier-week features"),
    ("train", "Train model"),
    ("evaluate", "Evaluate held-out weeks"),
    ("results", "Prepare insights"),
]
STATIC = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/viewer.js": ("viewer.js", "text/javascript; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/output/pdf/StockDemandPrediction-SDA-Report.pdf": (
        "output/pdf/StockDemandPrediction-SDA-Report.pdf",
        "application/pdf",
    ),
}
job_lock = threading.Lock()
current_job: dict | None = None


def update_job(job: dict, stage: str, status: str, detail: str) -> None:
    with job_lock:
        step = next(item for item in job["steps"] if item["id"] == stage)
        step.update(status=status, detail=detail)


def process(job: dict, path: Path, name: str) -> None:
    try:
        result = build(path, source_name=name,
                       progress=lambda stage, status, detail: update_job(job, stage, status, detail))
        with job_lock:
            job["result"] = result
            job["status"] = "complete"
    except Exception as error:
        with job_lock:
            active_step = next((step for step in job["steps"] if step["status"] == "running"), None)
            if active_step:
                active_step.update(status="error", detail="Stopped at this stage")
            job["status"] = "error"
            job["error"] = str(error)
    finally:
        path.unlink(missing_ok=True)


class Handler(BaseHTTPRequestHandler):
    def respond(self, code: int, content: bytes, content_type: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'")
        self.end_headers()
        self.wfile.write(content)

    def json_response(self, code: int, value: dict) -> None:
        self.respond(code, json.dumps(value).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/api/health":
            self.json_response(200, {"service": "stock-demand-prediction"})
            return
        if path.startswith("/api/jobs/"):
            job_id = path.removeprefix("/api/jobs/")
            with job_lock:
                if current_job is None or current_job["id"] != job_id:
                    self.json_response(404, {"error": "Analysis not found"})
                    return
                snapshot = json.dumps(current_job).encode("utf-8")
            self.respond(200, snapshot, "application/json; charset=utf-8")
            return
        item = STATIC.get(path)
        if not item:
            self.respond(404, b"Not found", "text/plain; charset=utf-8")
            return
        filename, content_type = item
        self.respond(200, (ROOT / filename).read_bytes(), content_type)

    def do_POST(self) -> None:
        global current_job
        if urlsplit(self.path).path != "/api/analyze":
            self.json_response(404, {"error": "Not found"})
            return
        origin = self.headers.get("Origin")
        allowed = {f"http://127.0.0.1:{self.server.server_port}", f"http://localhost:{self.server.server_port}"}
        if self.headers.get("Host") not in {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"} or (origin and origin not in allowed):
            self.json_response(403, {"error": "Open this app from its local address"})
            return
        params = parse_qs(urlsplit(self.path).query, keep_blank_values=True)
        name = Path(params.get("name", [""])[0]).name[:120]
        if Path(name).suffix.lower() not in (".xlsx", ".csv"):
            self.json_response(400, {"error": "Choose an .xlsx workbook or .csv file"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= MAX_UPLOAD:
            self.json_response(413, {"error": "File must be smaller than 64 MB"})
            return
        job = {
            "id": uuid.uuid4().hex,
            "status": "uploading",
            "name": name,
            "steps": [{"id": stage, "label": label, "status": "pending", "detail": ""} for stage, label in STAGES],
            "result": None,
            "error": None,
        }
        with job_lock:
            if current_job and current_job["status"] in ("uploading", "running"):
                self.json_response(409, {"error": "An analysis is already running"})
                return
            current_job = job
        path = None
        try:
            with tempfile.NamedTemporaryFile(prefix="stock-demand-", suffix=Path(name).suffix.lower(), delete=False) as upload:
                path = Path(upload.name)
                remaining = length
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        raise ValueError("Upload ended before the complete file arrived")
                    upload.write(chunk)
                    remaining -= len(chunk)
        except (OSError, ValueError) as error:
            if path:
                path.unlink(missing_ok=True)
            with job_lock:
                job["status"] = "error"
                job["error"] = str(error)
            self.json_response(400, {"error": str(error)})
            return
        with job_lock:
            job["status"] = "running"
        threading.Thread(target=process, args=(job, path, name), daemon=True).start()
        self.json_response(202, {"id": job["id"]})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Open http://127.0.0.1:{args.port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
