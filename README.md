# JobFilter

Automatically scrapes, and AI-ranks software engineering internships from [intern-list.com](https://www.intern-list.com).

## How it works

1. **Scrape** — Selenium collects up to **200** internship listings from intern-list.com (deeper scroll than a single shallow pass)
2. **Rank** — Claude (with OpenAI fallback) ranks the top **20** best fits based on your candidate profile, prioritizing F-1 visa sponsorship likelihood and role fit

## Setup

```bash
# Clone the repo
git clone https://github.com/rastog18/JobFilter.git
cd JobFilter

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the project root:
```
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key
```

Update `app/config.py` with your candidate profile.

## Usage

```bash
python app/main.py
```

Results are saved to:
- `data/ranked_jobs.json` — top 20 ranked internships (local; folder is gitignored)
- `frontend/data/ranked_jobs.json` — same JSON for the static site / Vercel

## Frontend (static)

The UI is a static site in `frontend/`. It reads `frontend/data/ranked_jobs.json`.

### Run locally

Use the same URL layout as Vercel (site root = `frontend/`):

```bash
cd frontend
python -m http.server 8000
```

Open:

- `http://127.0.0.1:8000/`

(If you serve from the **repo root**, `/styles.css` would 404 — run the server **inside** `frontend/` as above.)

### Deploy (Vercel)

- Set **Root Directory** to `frontend`
- No build command needed

**Refresh button → GitHub Actions:** the UI calls `POST /api/trigger-workflow` (see `frontend/api/trigger-workflow.js`). In Vercel → **Settings → Environment Variables**, add:

- **`GITHUB_TOKEN`** — fine-grained PAT for this repo with **Actions: Read and write** (and **Contents: Read** at minimum). Classic PAT needs **`repo`** + **`workflow`**.  
- **`GITHUB_REPO`** (optional) — default `rastog18/JobFilter`  
- **`GITHUB_WORKFLOW_FILE`** (optional) — default `refresh-ranked-jobs.yml`  
- **`TRIGGER_SECRET`** (optional) — if set, the browser must send the same value in header `x-trigger-secret`. Easiest: in the browser console once:  
  `localStorage.setItem('jobfilterTriggerSecret', 'YOUR_SECRET')`  
  (must match `TRIGGER_SECRET` in Vercel)

After changing env vars, click **Redeploy** on the latest Production deployment (env changes are not always picked up by old deploys).

**Sanity check:** open `https://YOUR_DEPLOYMENT.vercel.app/api/trigger-workflow` in a browser — you should see JSON with `"hasGithubToken": true` once `GITHUB_TOKEN` is configured.

### Auto-refresh (GitHub Actions)

This repo includes a scheduled workflow that runs `python app/main.py` and commits updated JSON to `frontend/data/ranked_jobs.json`.

You must set at least one repo secret:

- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`

## Requirements

- Python 3.10+
- Google Chrome + ChromeDriver
- Anthropic or OpenAI API key