# Stock Demand Prediction

A standalone Statistics and Data Analytics mini project. Upload historical retail transactions in the browser, watch the Python pipeline run, then inspect product-level predictions and held-out evaluation. The documented study uses the real [UCI Online Retail II dataset](https://archive.ics.uci.edu/dataset/502/online+retail+ii). This project is separate from the [StockSync inventory app](https://github.com/DhanushSantosh/StockSync).

## Run from a fresh checkout

These commands use a Linux/macOS shell. You need [Git](https://git-scm.com/) and [uv](https://docs.astral.sh/uv/getting-started/installation/); the commands below install Python 3.12 and the project's pinned Python packages. Node.js is needed only for the optional JavaScript syntax check.

### 1. Clone and install dependencies

```bash
git clone https://github.com/DhanushSantosh/StockDemandPrediction.git
cd StockDemandPrediction
uv python install 3.12
uv venv --python 3.12 analytics/.venv
uv pip install --python analytics/.venv/bin/python -r analytics/requirements.txt
```

If you already have this repository, skip `git clone` and run the remaining commands from its root. Activation is optional: `analytics/.venv/bin/python` always uses the environment just created. If you prefer activation, run `source analytics/.venv/bin/activate` and replace that path with `python` in the commands below.

### 2. Get a dataset

For the documented study, download **Online Retail II** from [UCI](https://archive.ics.uci.edu/dataset/502/online+retail+ii), unzip it, and locate `online_retail_II.xlsx`. Create `analytics/data/` with `mkdir -p analytics/data`, then copy the extracted workbook to `analytics/data/online_retail_II.xlsx`. The raw workbook is ignored by Git and is not included in a fresh clone. You can also upload another compatible `.xlsx` or `.csv` file using the format below.

To verify that you have the exact workbook used in the report:

```bash
sha256sum analytics/data/online_retail_II.xlsx
```

The expected SHA-256 is `bcbe73b35f5b7babf197fb0cb983a11f5d9ff929078d4aa53d171b1f2df2e980`.

### 3. Start the app and run the analysis

```bash
analytics/.venv/bin/python server.py
```

Leave that terminal open. Open **http://127.0.0.1:8000/** in a browser, choose `analytics/data/online_retail_II.xlsx`, and click **Run analysis**. The page shows reading, cleaning, weekly aggregation, feature creation, model training, evaluation, and result preparation. The full UCI workbook can take a few minutes to process; wait for **Analysis complete**. If port 8000 is already occupied by this app, open the URL directly. Otherwise, start it with `analytics/.venv/bin/python server.py --port 8001` and open `http://127.0.0.1:8001/`.

Opening `index.html` directly or using a static file server will not run the Python pipeline. If the page says the analysis server is unavailable, start `server.py` and reload the local URL above.

### 4. Inspect the final result

The result area appears after all seven stages finish. It shows held-out model and previous-week baseline errors, a product selector, a weekly actual-versus-predicted chart, a table, and a dated illustrative next-week estimate. Select different products to inspect their 12 held-out weeks; use **Download result JSON** to save the generated result. The raw upload is deleted after processing, and the result stays in server memory only until another run or shutdown.

For the exact UCI workbook, expect **50 products**, **600 test product-weeks**, model **MAE 251.286** and **RMSE 426.056**, compared with baseline **MAE 258.475** and **RMSE 507.413**. The page rounds the large metric cards to one decimal place. Other datasets will produce different results. These are historical sales estimates, not live stock recommendations.

The server binds to `127.0.0.1`; no Firebase project or cloud upload is involved.

## Input format

Upload an `.xlsx` workbook with one or more sheets, or one `.csv` file. Every sheet/file needs these exact columns:

`Invoice`, `StockCode`, `Description`, `Quantity`, `InvoiceDate`, `Price`, `Country`

The pipeline removes cancelled invoices, nonpositive quantities and prices, incomplete rows, and partial boundary weeks. For the exact UCI workbook it keeps United Kingdom sales and applies the documented UCI merchandise code filter. Other compatible files include all countries and can use alphanumeric product codes with `.`, `_`, or `-`. A run needs at least 32 complete weeks and at least one product with sales in 20 training weeks. It selects up to 50 eligible products using training data only, then holds out the last 12 complete weeks. Files must be under 64 MB.

Raw files and the Python environment are ignored by Git.

## Reproduce the submitted UCI study

The included [SDA report](docs/sda/report.md) and [PDF](output/pdf/StockDemandPrediction-SDA-Report.pdf) document the UCI source, cleaning counts, chronological split, model, baseline, measured metrics, figures, and limits. Its reference result is [uci-reference.json](output/results/uci-reference.json). These fixed artifacts document the UCI experiment; the browser does not load them as an upload result.

```bash
analytics/.venv/bin/python analytics/build.py
analytics/.venv/bin/python -m unittest discover -s analytics -p 'test_*.py'
analytics/.venv/bin/python analytics/render_report.py
node --check viewer.js
```

`build.py` defaults to the local UCI workbook and writes `output/results/uci-reference.json`. It records the workbook SHA-256. For a compatible CSV, use `analytics/.venv/bin/python analytics/build.py --input path/to/file.csv --output path/to/result.json`. An optional `--country` filter is available on the command line. The model's estimates are historical examples, not live stock recommendations. Only the exact UCI workbook reproduces the report's published figures.

See [AGENTS.md](AGENTS.md) for project context and maintenance guidance.
