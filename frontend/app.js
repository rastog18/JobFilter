const DATA_URL = "/data/ranked_jobs.json";
const TRIGGER_URL = "/api/trigger-workflow";
const PAGE_SIZE = 10;
const TRIGGER_SECRET_STORAGE_KEY = "jobfilterTriggerSecret";
const APPLIED_JOBS_STORAGE_KEY = "jobfilterAppliedIds";

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
  viewJson: document.getElementById("viewJsonLink"),
  pager: document.getElementById("pager"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageInfo: document.getElementById("pageInfo"),
};

/** @type {Array<any>} */
let jobs = [];
let pageIndex = 0;

/** @returns {Set<string>} */
function getAppliedIds() {
  try {
    const raw = localStorage.getItem(APPLIED_JOBS_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function setAppliedIds(set) {
  localStorage.setItem(APPLIED_JOBS_STORAGE_KEY, JSON.stringify([...set]));
}

function jobStableId(job) {
  const href = safeText(job.apply).trim();
  if (href) return `url:${href}`;
  return `rk:${safeText(job.rank)}|${safeText(job.company)}|${safeText(job.title)}`;
}

function syncViewJsonVisibility() {
  if (!el.viewJson) return;
  el.viewJson.hidden = getAppliedIds().size > 0;
}

function markJobApplied(id) {
  const s = getAppliedIds();
  s.add(id);
  setAppliedIds(s);
  syncViewJsonVisibility();
}

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

function getVisibleSorted() {
  const q = el.search.value.trim();
  const sortMode = el.sort.value;
  return jobs.filter((j) => matchesQuery(j, q)).slice().sort((a, b) => compare(a, b, sortMode));
}

function renderStats(visibleCount, totalCount, pageSliceCount, totalPages, currentPage) {
  const top = jobs[0];
  const topScore = top?.final_score;
  const pagePart =
    totalPages > 1 ? `<span class="pill">Page <b>${currentPage}</b> / ${totalPages}</span>` : "";
  const pills = [
    `<span class="pill"><b>${pageSliceCount}</b> on this page</span>`,
    `<span class="pill"><b>${visibleCount}</b> match</span>`,
    `<span class="pill"><b>${totalCount}</b> total</span>`,
    pagePart,
    typeof topScore === "number"
      ? `<span class="pill"><b>${topScore.toFixed(0)}/10</b> top score</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");
  el.stats.innerHTML = pills;
}

function card(job, appliedIds) {
  const applyHref = safeText(job.apply);
  const finalScore = job.final_score;
  const sponsorship = job.sponsorship_likelihood;
  const roleFit = job.role_fit;
  const stableId = jobStableId(job);
  const isApplied = appliedIds.has(stableId);

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

  const applyClasses = ["apply", isApplied ? "apply--applied" : ""].filter(Boolean).join(" ");
  const applyLabel = isApplied ? "Applied" : "Apply";
  const applyBtn = applyHref
    ? `<a class="${applyClasses}" href="${applyHref}" target="_blank" rel="noreferrer" data-job-id="${encodeURIComponent(
        stableId
      )}">${applyLabel}</a>`
    : `<span class="badge badge--warn">No apply link</span>`;

  const cardClass = ["card", isApplied ? "card--applied" : ""].filter(Boolean).join(" ");

  return `
    <article class="${cardClass}" data-job-id="${encodeURIComponent(stableId)}">
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
  const visible = getVisibleSorted();
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  if (pageIndex >= totalPages) pageIndex = 0;

  const slice = visible.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
  const appliedIds = getAppliedIds();

  el.grid.innerHTML = slice.map((j) => card(j, appliedIds)).join("");
  syncViewJsonVisibility();
  el.empty.hidden = visible.length !== 0;
  renderStats(visible.length, jobs.length, slice.length, totalPages, pageIndex + 1);

  const showPager = visible.length > PAGE_SIZE;
  el.pager.hidden = !showPager;
  if (showPager) {
    el.pageInfo.textContent = `Page ${pageIndex + 1} of ${totalPages}`;
    el.prevPage.disabled = pageIndex <= 0;
    el.nextPage.disabled = pageIndex >= totalPages - 1;
  }
}

async function load() {
  el.error.hidden = true;
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Expected a JSON array.");
    jobs = data;
    pageIndex = 0;
    el.hint.style.display = jobs.length ? "none" : "block";
    render();
  } catch (e) {
    el.error.hidden = false;
    el.grid.innerHTML = "";
    el.stats.innerHTML = "";
    el.pager.hidden = true;
    setUpdatedText("");
    el.empty.hidden = true;
    el.hint.style.display = "none";
  }
}

async function triggerWorkflow() {
  const headers = { "Content-Type": "application/json" };
  const secret = localStorage.getItem(TRIGGER_SECRET_STORAGE_KEY);
  if (secret) headers["x-trigger-secret"] = secret;

  const res = await fetch(TRIGGER_URL, { method: "POST", headers, body: "{}" });
  const text = await res.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }
  if (!res.ok) {
    const detail = payload?.error || payload?.raw || text;
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  return payload;
}

el.search.addEventListener("input", () => {
  pageIndex = 0;
  render();
});
el.sort.addEventListener("change", () => {
  pageIndex = 0;
  render();
});

el.prevPage.addEventListener("click", () => {
  if (pageIndex > 0) {
    pageIndex -= 1;
    render();
    window.scrollTo({ top: el.grid.offsetTop - 80, behavior: "smooth" });
  }
});
el.nextPage.addEventListener("click", () => {
  const visible = getVisibleSorted();
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  if (pageIndex < totalPages - 1) {
    pageIndex += 1;
    render();
    window.scrollTo({ top: el.grid.offsetTop - 80, behavior: "smooth" });
  }
});

el.refresh.addEventListener("click", async () => {
  const clickedAt = new Date();
  const ts = clickedAt.toLocaleString();
  setUpdatedText(`${ts} — Starting refresh…`);

  el.refresh.disabled = true;
  el.refresh.textContent = "Refreshing…";
  try {
    const lines = [`Clicked: ${ts}`];
    let dispatchOk = false;
    try {
      await triggerWorkflow();
      dispatchOk = true;
      lines.push(
        "Dispatch: OK — open GitHub → Actions → “Refresh ranked jobs” to watch the run (new commit may take a few minutes)."
      );
    } catch (e) {
      const msg = safeText(e?.message || e);
      lines.push(`Dispatch: FAILED — ${msg}`);
      if (msg.includes("HTTP 404")) {
        lines.push(
          "Hint: GET /api/trigger-workflow in the browser. If that 404s too, the serverless function is not deployed (redeploy Vercel; Root Directory = frontend)."
        );
      }
      if (msg.includes("HTTP 401") || msg.includes("Unauthorized")) {
        lines.push(
          "Hint: If TRIGGER_SECRET is set in Vercel, run in console: localStorage.setItem('jobfilterTriggerSecret','YOUR_SECRET')"
        );
      }
      if (msg.includes("HTTP 503") || msg.includes("GITHUB_TOKEN")) {
        lines.push("Hint: Add GITHUB_TOKEN in Vercel → Environment Variables, then Redeploy (Production).");
      }
    }

    await load();

    lines.push(
      dispatchOk
        ? "JSON reloaded (may still look old until the workflow commits new frontend/data/ranked_jobs.json)."
        : "JSON reloaded."
    );
    setUpdatedText(lines.join(" "));
  } finally {
    el.refresh.disabled = false;
    el.refresh.textContent = "Refresh";
  }
});

el.grid.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const a = t.closest("a.apply[data-job-id]");
  if (!a) return;
  const id = decodeURIComponent(a.getAttribute("data-job-id") || "");
  if (!id) return;
  markJobApplied(id);
  a.classList.add("apply--applied");
  a.textContent = "Applied";
  const article = a.closest("article.card");
  if (article) article.classList.add("card--applied");
});

syncViewJsonVisibility();
load();
