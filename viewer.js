const sources = {
  real: "src/data/retail-insights.json",
  demo: "src/data/demo-insights.json",
};
const results = {};
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
const $ = (id) => document.getElementById(id);
let active = "real";

function setText(id, value) {
  $(id).textContent = value;
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
  const data = results[active];
  const product = data.products.find((item) => item.code === $("product-select").value);
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
  setText("next-week", `Illustrative estimate for week of ${data.period.illustrativeNextWeek}: ${number.format(product.nextWeekEstimate)} units. This dated example was not included in the held-out evaluation.`);
}

function showDataset(kind) {
  if (!results[kind]) return;
  active = kind;
  const data = results[kind];
  const synthetic = kind === "demo";
  for (const tab of document.querySelectorAll("[data-dataset]")) {
    tab.setAttribute("aria-pressed", String(tab.dataset.dataset === kind));
  }
  setText("study-type", synthetic ? "Synthetic practice data" : "Independent real-world dataset");
  setText("study-title", synthetic ? "Grocery shop example" : "UCI Online Retail II");
  setText("study-note", synthetic
    ? "Ten generated grocery products across 52 weeks. These sales were simulated; they are not records from your shop."
    : "Historical UK giftware transactions from 2009–2011. These products are unrelated to a current StockSync shop.");
  setText("source-name", data.source.name);
  $("source-link").hidden = synthetic;
  setText("period", `${data.period.firstWeek} to ${data.period.lastObservedDate}`);
  setText("model-mae", number.format(data.metrics.model.mae));
  setText("baseline-mae", number.format(data.metrics.baseline.mae));
  setText("model-rmse", number.format(data.metrics.model.rmse));
  setText("test-rows", number.format(data.model.testRows));
  setText("test-weeks", `${data.period.holdoutWeeks} complete held-out weeks`);
  setText("method-summary", `A Random Forest model uses the previous four weeks of sales, their average, last known price, calendar week, and product identity. Training ends ${data.period.trainingEnd}; testing starts ${data.period.holdoutStart}. No target-week sales enter the inputs.`);
  setText("model-comparison", `Model MAE ${data.metrics.model.mae} versus previous-week baseline ${data.metrics.baseline.mae}; model R² ${data.metrics.model.r2}. Lower MAE and RMSE are better; higher R² is better.`);
  setText("limitation", synthetic
    ? "The grocery history is generated. Its measured errors show that the code runs, not that it predicts real shop demand."
    : "These UK transaction records contain observed sales, not inventory or unmet demand. One 12-week holdout cannot establish reliable purchasing advice for other shops.");
  const select = $("product-select");
  select.replaceChildren();
  for (const product of data.products) {
    const option = document.createElement("option");
    option.value = product.code;
    option.textContent = `${product.name} (${product.code})`;
    select.append(option);
  }
  showProduct();
}

async function load() {
  try {
    const response = await Promise.all(Object.values(sources).map((path) => fetch(path)));
    if (response.some((item) => !item.ok)) throw new Error("A result file could not be loaded.");
    [results.real, results.demo] = await Promise.all(response.map((item) => item.json()));
    $("loading").hidden = true;
    $("content").hidden = false;
    showDataset("real");
  } catch {
    setText("loading", "Results could not be loaded. Start a local web server from this folder and reload the page.");
  }
}

for (const tab of document.querySelectorAll("[data-dataset]")) {
  tab.addEventListener("click", () => showDataset(tab.dataset.dataset));
}
$("product-select").addEventListener("change", showProduct);
load();
