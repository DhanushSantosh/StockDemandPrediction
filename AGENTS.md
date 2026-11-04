# Stock Demand Prediction handoff

This is the user's standalone SDA mini project, split from the sibling `../StockSync` Cloud Computing inventory app on 4 November 2026. Read `README.md` and check Git status before changing files. Keep the implementation clean and small.

## Current state

- The primary analysis is UCI Online Retail II, a real two-sheet Excel transaction dataset. `analytics/build.py` filters invalid/cancelled/returned rows, includes zero-sale weeks, selects 50 products using training-period data, and evaluates a chronological 12-week holdout against a previous-week baseline. The committed `src/data/retail-insights.json` records source hash, counts, settings, metrics, and per-product series.
- The secondary `analytics/demo/*.csv` data is generated synthetic grocery history: ten products, 52 weeks, 520 product-week rows. `analytics/build_demo.py` evaluates an eight-week holdout and writes `src/data/demo-insights.json`. The product CSV can be imported into a StockSync demo account, but the weekly sale history is not imported into Firestore. Never call the synthetic results observed shop performance.
- The UCI workbook and zip are local under ignored `analytics/data/`; the Python environment is ignored under `analytics/.venv/`. Do not commit raw transactions, credentials, or private shop exports. The UCI workbook checksum is documented in `docs/sda/report.md`.
- `docs/sda/report.md`, figures, and `output/pdf/StockDemandPrediction-SDA-Report.pdf` are the standalone submission materials. `docs/combined-report.md` and matching DOCX/PDF are archived historical snapshots that describe the former integrated app; do not present them as the current architecture without revision.
- `reference/InsightsPage.tsx` and `reference/insights-hi.ts` preserve the former StockSync UI. They depend on the old app's components and styles. The standalone results viewer at the repository root is the active presentation.

## Development notes

Follow the user's next requested deliverable. Keep the real UCI experiment as the primary study and synthetic grocery history as a labeled demo. Keep technical evaluation accessible without implying that historical UK giftware estimates apply to current shop inventory. Do not introduce Firebase services without a concrete need.

For code changes, run `analytics/.venv/bin/python -m unittest discover -s analytics -p 'test_*.py'`, regenerate affected JSON/PDF artifacts, and verify their figures and metrics. `analytics/build.py` needs the local UCI workbook and takes longer than the synthetic pipeline. The sibling StockSync repo has independent CI and deployment.
