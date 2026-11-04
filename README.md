# Stock Demand Prediction

A standalone Statistics and Data Analytics mini project for weekly product sales prediction. The primary experiment uses the real [UCI Online Retail II dataset](https://archive.ics.uci.edu/dataset/502/online+retail+ii). A second, clearly synthetic grocery dataset demonstrates the same product and weekly sales structure and can supply sample products to the separate StockSync inventory app.

## What is here

- `analytics/build.py` cleans the two-sheet UCI Excel workbook, builds weekly product series, and evaluates Random Forest Regression against a previous-week baseline on the final 12 complete weeks.
- `analytics/generate_demo.py` creates 52 weeks of synthetic sales for ten grocery products. `analytics/build_demo.py` evaluates an eight-week holdout and writes a separate result.
- `analytics/demo/products.csv` is a product catalog compatible with StockSync's CSV importer. `analytics/demo/sales.csv` contains generated weekly sales and stock balances. Importing the catalog does not create historical sales in StockSync.
- `src/data/` contains small, versioned result JSON files. `docs/sda/` and `output/pdf/` contain the SDA write-up, figures, and PDF.
- `reference/` preserves the old StockSync Insights component and Hindi strings as source material. They depend on StockSync's UI and are not a runnable standalone app.
- `docs/combined-report.md` and its DOCX/PDF are **historical snapshots** from when the SDA page was embedded in StockSync. Their architecture description is superseded by this split and should be revised before submission as a current combined report.

## Reproduce

From this folder, use Python 3.12:

```bash
uv venv --python 3.12 analytics/.venv
source analytics/.venv/bin/activate
uv pip install -r analytics/requirements.txt
python -m unittest discover -s analytics -p 'test_*.py'
python analytics/build_demo.py
python analytics/render_report.py
```

The UCI workbook belongs at `analytics/data/online_retail_II.xlsx`. This local copy is already present in this workspace but ignored by Git. To download it in a fresh checkout:

```bash
mkdir -p analytics/data
curl -fL 'https://archive.ics.uci.edu/static/public/502/online+retail+ii.zip' -o analytics/data/online-retail-ii.zip
unzip -o analytics/data/online-retail-ii.zip -d analytics/data
python analytics/build.py
```

`build.py` verifies the workbook SHA-256 against the expected source. It writes `src/data/retail-insights.json`. The raw Excel workbook and local virtual environment are never committed. The source report states the cleaning counts, split, settings, measured results, limitations, and citation.

## Results and boundaries

The UCI holdout has 600 product-weeks across 50 products. Random Forest achieved MAE 251.286 units; the previous-week baseline achieved 258.475. The synthetic grocery holdout has 80 product-weeks across ten products. Its results demonstrate the pipeline only; they are not evidence of real shop performance. Neither result is a forecast for a StockSync user.

CI runs the Python tests and checks that the synthetic CSV and JSON regenerate identically. It does not download the 45 MB UCI workbook; rerun `analytics/build.py` locally when changing the real-data pipeline.

## Standalone results viewer

Run `python -m http.server 8000` from this folder, then open `http://127.0.0.1:8000/`. The viewer reads the committed result JSON locally. It does not connect to StockSync or Firebase.

This folder is its own Git repository, separate from the StockSync Cloud Computing app. [AGENTS.md](AGENTS.md) records the data boundaries and maintenance notes.
