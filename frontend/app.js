const DATA_URL = "/data/ranked_jobs.json";

const el = {
  grid: document.getElementById("grid"),
  stats: document.getElementById("stats"),
  updated: document.getElementById("updated"),
  search: document.getElementById("searchInput"),
  sort: document.getElementById("sortSelect"),
  empty: document.getElementById("emptyState"),
  error: document.getElementById("errorState"),
  hint: document.getElementById("hint"),
  refresh: document.getElementById("refreshBtn"),
};

/** @type {Array<any>} */
let jobs = [];

function setUpdatedText(text) {
  el.updated.textContent = text;
}

function scoreTone(score10) {
  if (typeof score10 !== "number") return "badge--warn";
  if (score10 >= 9) return "badge--good";
  if (score10 >= 7) return "badge--accent";
  if (score10 >= 5) return "badge--warn";
  return "badge--bad";
}

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function matchesQuery(job, q) {
  if (!q) return true;
  const hay = [
    job.title,
    job.company,
    job.location,
    job.salary,
    job.why_good_fit,
  ]
    .map(safeText)
    .join(" | ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function compare(a, b, mode) {
  switch (mode) {
    case "final_score_desc":
      return (b.final_score ?? -1) - (a.final_score ?? -1);
    case "sponsorship_desc":
      return (b.sponsorship_likelihood ?? -1) - (a.sponsorship_likelihood ?? -1);
    case "role_fit_desc":
      return (b.role_fit ?? -1) - (a.role_fit ?? -1);
    case "company_asc":
      return safeText(a.company).localeCompare(safeText(b.company));
    case "rank":
    default:
      return (a.rank ?? 9999) - (b.rank ?? 9999);
  }
}

function renderStats(visibleCount, totalCount) {
  const top = jobs[0];
  const topScore = top?.final_score;
  const pills = [
    `<span class="pill"><b>${visibleCount}</b> shown</span>`,
    `<span class="pill"><b>${totalCount}</b> total</span>`,
    typeof topScore === "number"
      ? `<span class="pill"><b>${topScore.toFixed(0)}/10</b> top score</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");
  el.stats.innerHTML = pills;
}

function card(job) {
  const applyHref = safeText(job.apply);
  const finalScore = job.final_score;
  const sponsorship = job.sponsorship_likelihood;
  const roleFit = job.role_fit;

  const finalClass = `badge ${scoreTone(finalScore)}`;
  const sponsorshipClass = `badge ${scoreTone(sponsorship)}`;
  const roleFitClass = `badge ${scoreTone(roleFit)}`;

  const salary = safeText(job.salary) || "N/A";
  const location = safeText(job.location) || "N/A";
  const company = safeText(job.company) || "Unknown";
  const title = safeText(job.title) || "Untitled role";
  const why = safeText(job.why_good_fit) || "";

  const badgeFinal =
    typeof finalScore === "number"
      ? `<span class="${finalClass}"><span>Final</span> <b>${finalScore.toFixed(0)}/10</b></span>`
      : "";
  const badgeS =
    typeof sponsorship === "number"
      ? `<span class="${sponsorshipClass}"><span>Sponsor</span> <b>${sponsorship.toFixed(0)}/10</b></span>`
      : "";
  const badgeR =
    typeof roleFit === "number"
      ? `<span class="${roleFitClass}"><span>Fit</span> <b>${roleFit.toFixed(0)}/10</b></span>`
      : "";

  const applyBtn = applyHref
    ? `<a class="apply" href="${applyHref}" target="_blank" rel="noreferrer">Apply</a>`
    : `<span class="badge badge--warn">No apply link</span>`;

  return `
    <article class="card">
      <div class="card__top">
        <div>
          <div class="rank">
            <span class="rank__badge">${safeText(job.rank ?? "")}</span>
            <span>${company}</span>
          </div>
          <div class="title">${title}</div>
        </div>
      </div>

      <div class="meta">
        <div class="row"><span class="row__label">Where</span><span>${location}</span></div>
        <div class="row"><span class="row__label">Pay</span><span>${salary}</span></div>
      </div>

      <div class="why">${why}</div>

      <div class="badges">
        ${badgeFinal}
        ${badgeS}
        ${badgeR}
      </div>

      <div class="card__footer">
        <span class="badge">Rank <b>${safeText(job.rank ?? "—")}</b></span>
        ${applyBtn}
      </div>
    </article>
  `;
}

function render() {
  const q = el.search.value.trim();
  const sortMode = el.sort.value;

  const visible = jobs
    .filter((j) => matchesQuery(j, q))
    .slice()
    .sort((a, b) => compare(a, b, sortMode));

  el.grid.innerHTML = visible.map(card).join("");
  el.empty.hidden = visible.length !== 0;
  renderStats(visible.length, jobs.length);
}

async function load() {
  el.error.hidden = true;
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Expected a JSON array.");
    jobs = data;
    el.hint.style.display = jobs.length ? "none" : "block";
    render();
  } catch (e) {
    // Most common cause: opening index.html directly (file://) or wrong server root.
    el.error.hidden = false;
    el.grid.innerHTML = "";
    el.stats.innerHTML = "";
    setUpdatedText("");
    el.empty.hidden = true;
    el.hint.style.display = "none";
  }
}

el.search.addEventListener("input", () => render());
el.sort.addEventListener("change", () => render());
el.refresh.addEventListener("click", async () => {
  const clickedAt = new Date();
  setUpdatedText(`Last refresh clicked: ${clickedAt.toLocaleString()}`);

  el.refresh.disabled = true;
  el.refresh.textContent = "Refreshing…";
  try {
    await load();
    setUpdatedText(`Last refresh clicked: ${clickedAt.toLocaleString()} — reloaded`);
  } finally {
    el.refresh.disabled = false;
    el.refresh.textContent = "Refresh";
  }
});

load();

