import csv
import io
import json
import threading
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory

import pandas as pd

from build import read_dataset
from server import Handler, ThreadingHTTPServer


def transaction_csv() -> bytes:
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["Invoice", "StockCode", "Description", "Quantity", "InvoiceDate", "Price", "Country"])
    for index in range(40):
        day = date(2025, 1, 8) + timedelta(weeks=index)
        for product, code in enumerate(("BIS-250", "RIC-1KG")):
            writer.writerow([f"{index}-{product}", code, f"Item {product}", 10 + product + index % 5,
                             day.isoformat(), 20 + product, "United Kingdom"])
    return stream.getvalue().encode("utf-8")


class RuntimeTests(unittest.TestCase):
    def test_accepts_a_single_sheet_workbook_and_reports_missing_columns(self):
        with TemporaryDirectory() as folder:
            workbook = Path(folder) / "sales.xlsx"
            pd.read_csv(io.BytesIO(transaction_csv())).to_excel(workbook, index=False)
            self.assertEqual(len(read_dataset(workbook)), 80)
            missing = Path(folder) / "missing.csv"
            missing.write_text("Invoice,StockCode\n1,ABC\n")
            with self.assertRaisesRegex(ValueError, "Missing columns in CSV"):
                read_dataset(missing)

    def test_upload_runs_pipeline_then_returns_results_without_serving_raw_data(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            request = urllib.request.Request(
                base + "/api/analyze?" + urllib.parse.urlencode({"name": "sales.csv", "country": "United Kingdom"}),
                data=transaction_csv(), method="POST",
                headers={"Content-Type": "application/octet-stream", "Origin": base},
            )
            with urllib.request.urlopen(request) as response:
                self.assertEqual(response.status, 202)
                job_id = json.load(response)["id"]
            deadline = time.monotonic() + 15
            while True:
                with urllib.request.urlopen(base + f"/api/jobs/{job_id}") as response:
                    job = json.load(response)
                if job["status"] != "running":
                    break
                if time.monotonic() >= deadline:
                    self.fail("Analysis did not finish")
                time.sleep(0.05)
            self.assertEqual(job["status"], "complete", job["error"])
            self.assertTrue(all(step["status"] == "done" for step in job["steps"]))
            self.assertEqual(job["result"]["model"]["productCount"], 2)
            self.assertEqual(job["result"]["model"]["testRows"], 24)
            self.assertEqual(job["result"]["source"]["name"], "sales.csv")
            for path in ("/analytics/data/online_retail_II.xlsx", "/output/results/uci-reference.json"):
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(base + path)
                self.assertEqual(error.exception.code, 404)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
