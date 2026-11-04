# Stock Demand Prediction

A standalone Statistics and Data Analytics mini project. Upload historical retail transactions in the browser, watch the Python pipeline run, then inspect product-level predictions and held-out evaluation. The documented study uses the real [UCI Online Retail II dataset](https://archive.ics.uci.edu/dataset/502/online+retail+ii). This project is separate from the [StockSync inventory app](https://github.com/DhanushSantosh/StockSync).

## Run locally

Use Python 3.12 from this project folder:

```bash
uv venv --python 3.12 analytics/.venv
source analytics/.venv/bin/activate
uv pip install -r analytics/requirements.txt
python server.py
```

Open `http://127.0.0.1:8000/`, choose a file, and click **Run analysis**. The interface shows reading, cleaning, weekly aggregation, feature creation, model training, evaluation, and result preparation. It displays metrics and product charts only after the run completes. You can download the result JSON or upload another file.

The server binds to `127.0.0.1`. Each raw upload is stored in a temporary file while it is processed, then deleted. Results remain in server memory until the next run or shutdown; the browser can download them. No Firebase project or cloud upload is involved.

## Input format

Upload an `.xlsx` workbook with one or more sheets, or one `.csv` file. Every sheet/file needs these exact columns:

`Invoice`, `StockCode`, `Description`, `Quantity`, `InvoiceDate`, `Price`, `Country`

The default filter keeps `United Kingdom`; clear the country field to include all countries. The pipeline removes cancelled invoices, nonpositive quantities and prices, incomplete rows, and partial boundary weeks. For the exact UCI workbook it applies the documented UCI merchandise code filter; other compatible files can use alphanumeric product codes with `.`, `_`, or `-`. A run needs at least 32 complete weeks and at least one product with sales in 20 training weeks. It selects up to 50 eligible products using training data only, then holds out the last 12 complete weeks. Files must be under 64 MB.

The UCI download is a ZIP archive; extract `online_retail_II.xlsx` before uploading it. The workbook already exists locally at ignored `analytics/data/online_retail_II.xlsx` in this workspace. In a fresh checkout, download it from the dataset page linked above. Raw files and the Python environment are ignored by Git.

## Reproduce the submitted UCI study

The included [SDA report](docs/sda/report.md) and [PDF](output/pdf/StockDemandPrediction-SDA-Report.pdf) document the UCI source, cleaning counts, chronological split, model, baseline, measured metrics, figures, and limits. Its reference result is [uci-reference.json](output/results/uci-reference.json). These fixed artifacts document the UCI experiment; the browser does not load them as an upload result.

```bash
python analytics/build.py
python -m unittest discover -s analytics -p 'test_*.py'
python analytics/render_report.py
node --check viewer.js
```

`build.py` defaults to the local UCI workbook and writes `output/results/uci-reference.json`. It records the workbook SHA-256. For a compatible CSV, use `python analytics/build.py --input path/to/file.csv --output path/to/result.json --country ''`. The model's estimates are historical examples, not live stock recommendations. Only the exact UCI workbook reproduces the report's published figures.

See [AGENTS.md](AGENTS.md) for project context and maintenance guidance.
