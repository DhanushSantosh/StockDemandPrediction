# Stock Demand Prediction context

This is the user's standalone SDA mini project in `/home/dhanush/Projects/mini-projects/StockDemandPrediction`. The sibling `../StockSync` repository owns the Cloud Computing inventory app. Keep this project clean and small; check Git status before edits.

## Data and model

- The documented real-world study uses UCI Online Retail II. The exact local workbook is ignored at `analytics/data/online_retail_II.xlsx`; its SHA-256 is in `docs/sda/report.md`. Do not commit raw transactions, private shop exports, or credentials.
- `analytics/build.py` accepts compatible `.xlsx` and `.csv` transaction files. It cleans sales, creates complete weekly series including zero-sale weeks, selects up to 50 products using training data only, builds earlier-week features, holds out the last 12 complete weeks, and compares Random Forest Regression with the previous-week baseline. The fixed UCI result is `output/results/uci-reference.json` for report reproduction.
- The local `server.py` accepts uploads, runs one analysis in a worker thread, reports stage updates at `/api/jobs/{id}`, and deletes the temporary raw file after the run. The root `index.html` and `viewer.js` show progress and reveal metrics/charts after completion. The server only binds to `127.0.0.1`; results stay in memory and can be downloaded in the browser. No Firebase service is used here.
- The generated grocery dataset and former embedded Insights component were removed. Do not reintroduce synthetic results or silently preload the reference JSON into the viewer.

## Verification

Run `analytics/.venv/bin/python -m unittest discover -s analytics -p 'test_*.py'` and `node --check viewer.js`. For model changes, rerun `analytics/.venv/bin/python analytics/build.py` against the local UCI workbook and verify the report's numbers, figures, and PDF. Check the upload UI with a real workbook and a smaller compatible CSV, including validation failures and progress visibility. `analytics/build.py` on the full workbook takes longer than the unit tests.

The UCI result supports a historical, measured experiment. It does not establish dependable demand estimates for an unrelated shop. Preserve that distinction in the UI and reports.
