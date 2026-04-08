# JobFilter

Automatically scrapes, and AI-ranks software engineering internships from [intern-list.com](https://www.intern-list.com).

## How it works

1. **Scrape** — Selenium scrapes up to 250 internship listings from intern-list.com
2. **Rank** — Claude (with OpenAI fallback) ranks the top 10 best fits based on your candidate profile, prioritizing F-1 visa sponsorship likelihood and role fit

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
- `data/ranked_jobs.json` — top 10 ranked internships with fit scores

## Frontend (static)

The UI is a static site in `frontend/`. It reads `frontend/data/ranked_jobs.json`.

### Run locally

```bash
python -m http.server 8000
```

Open:

- `http://127.0.0.1:8000/frontend/`

### Deploy (Vercel)

- Set **Root Directory** to `frontend`
- No build command needed

### Auto-refresh (GitHub Actions)

This repo includes a scheduled workflow that runs `python app/main.py` and commits updated JSON to `frontend/data/ranked_jobs.json`.

You must set at least one repo secret:

- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`

## Requirements

- Python 3.10+
- Google Chrome + ChromeDriver
- Anthropic or OpenAI API key