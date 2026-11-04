const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
let result = null;
let startedAt = 0;
let serverReady = false;

const serverHelp = "Analysis server unavailable. From the project folder, run `source analytics/.venv/bin/activate && python server.py`, then open http://127.0.0.1:8000/ and reload.";

function setText(id, value) {
  $(id).textContent = value;
}

async function checkServer() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    if (!response.ok || (await response.json()).service !== "stock-demand-prediction") {
      throw new Error("Analysis server unavailable");
    }
    serverReady = true;
    $("server-status").hidden = true;
    $("analyze-button").disabled = false;
  } catch {
    serverReady = false;
    setText("server-status", serverHelp);
    $("server-status").hidden = false;
    $("analyze-button").disabled = true;
  }
}

function drawChart(weeks) {
  const chart = $("chart");
  chart.replaceChildren();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 800 260");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const max = Math.max(1, ...weeks.flatMap((week) => [week.actual, week.predicted, week.baseline]));
  for (let index = 0; index <= 4; index += 1) {
    const y = 220 - index * 50;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", "34");
    line.setAttribute("x2", "784");
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", "grid-line");
    svg.append(line);
  }
  for (const key of ["actual", "predicted", "baseline"]) {
    const line = document.createElementNS(svg.namespaceURI, "polyline");
    const points = weeks.map((week, index) => {
      const x = 34 + (750 * index) / Math.max(1, weeks.length - 1);
      const y = 220 - (200 * week[key]) / max;
      return `${x},${y}`;
    });
    line.setAttribute("points", points.join(" "));
    line.setAttribute("class", `series ${key}`);
    svg.append(line);
  }
  chart.append(svg);
}

function showProduct() {
  const product = result.products.find((item) => item.code === $("product-select").value);
  if (!product) return;
  drawChart(product.weeks);
  const body = $("weekly-rows");
  body.replaceChildren();
  for (const week of product.weeks) {
    const row = document.createElement("tr");
    for (const value of [week.week, number.format(week.actual), number.format(week.predicted), number.format(week.baseline)]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  }
  setText("next-week", `Illustrative estimate for week of ${result.period.illustrativeNextWeek}: ${number.format(product.nextWeekEstimate)} units. This dated example was not included in the held-out evaluation.`);
}

function showResult(data) {
  result = data;
  setText("study-type", data.source.url ? "UCI Online Retail II" : "Uploaded retail dataset");
  setText("study-title", data.source.name);
  setText("study-note", `${data.model.productCount} eligible products. Sales included: ${data.source.country}. These results describe the uploaded history, not live shop inventory.`);
  setText("source-name", data.source.name);
  $("source-link").hidden = !data.source.url;
  $("report-link").hidden = !data.source.url;
  if (data.source.url) $("source-link").href = data.source.url;
  setText("period", `${data.period.firstWeek} to ${data.period.lastObservedDate}`);
  setText("model-mae", number.format(data.metrics.model.mae));
  setText("baseline-mae", number.format(data.metrics.baseline.mae));
  setText("model-rmse", number.format(data.metrics.model.rmse));
  setText("test-rows", number.format(data.model.testRows));
  setText("test-weeks", `${data.period.holdoutWeeks} complete held-out weeks`);
  setText("method-summary", `A Random Forest model uses the previous four weeks of sales, their average, last known price, calendar week, and product identity. Training ends ${data.period.trainingEnd}; testing starts ${data.period.holdoutStart}. No target-week sales enter the inputs.`);
  setText("model-comparison", `Model MAE ${data.metrics.model.mae} versus previous-week baseline ${data.metrics.baseline.mae}; model R² ${data.metrics.model.r2}. Lower MAE and RMSE are better; higher R² is better.`);
  setText("limitation", "Transactions show observed sales, not unmet demand or stock on hand. A single 12-week test period does not prove accuracy for other periods or shops.");
  const select = $("product-select");
  select.replaceChildren();
  for (const product of data.products) {
    const option = document.createElement("option");
    option.value = product.code;
    option.textContent = `${product.name} (${product.code})`;
    select.append(option);
  }
  showProduct();
  $("content").hidden = false;
}

function showSteps(steps) {
  const list = $("steps");
  list.replaceChildren();
  for (const step of steps) {
    const item = document.createElement("li");
    item.className = `step ${step.status}`;
    const label = document.createElement("strong");
    label.textContent = step.label;
    const detail = document.createElement("span");
    detail.textContent = step.detail || (step.status === "pending" ? "Waiting" : "");
    item.append(label, detail);
    list.append(item);
  }
  setText("elapsed", `${Math.floor((Date.now() - startedAt) / 1000)}s elapsed`);
}

async function poll(jobId) {
  try {
    const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Analysis status could not be loaded");
    const job = await response.json();
    showSteps(job.steps);
    if (job.status === "complete") {
      setText("progress-summary", "Analysis complete. Explore the measured results below.");
      $("analyze-button").disabled = false;
      showResult(job.result);
    } else if (job.status === "error") {
      setText("progress-summary", "Analysis stopped.");
      setText("error", job.error);
      $("error").hidden = false;
      $("analyze-button").disabled = false;
    } else {
      setText("progress-summary", `Processing ${job.name}…`);
      window.setTimeout(() => poll(jobId), 700);
    }
  } catch (error) {
    setText("error", serverHelp);
    $("error").hidden = false;
    $("analyze-button").disabled = false;
    checkServer();
  }
}

$("upload-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = $("dataset-file").files[0];
  if (!file || !serverReady) return;
  $("content").hidden = true;
  $("progress").hidden = false;
  $("error").hidden = true;
  $("steps").replaceChildren();
  $("analyze-button").disabled = true;
  startedAt = Date.now();
  setText("elapsed", "0s elapsed");
  setText("progress-summary", `Uploading ${file.name}…`);
  try {
    const query = new URLSearchParams({ name: file.name });
    const response = await fetch(`/api/analyze?${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: file,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Upload failed");
    poll(payload.id);
  } catch (error) {
    setText("progress-summary", "Upload stopped.");
    setText("error", error instanceof TypeError ? serverHelp : error.message);
    $("error").hidden = false;
    $("analyze-button").disabled = false;
    if (error instanceof TypeError) checkServer();
  }
});

checkServer();

$("product-select").addEventListener("change", showProduct);
$("download-button").addEventListener("click", () => {
  if (!result) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "stock-demand-results.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
});
