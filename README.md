## Job Filter & Ranker

This small app:
- **parses** an exported HTML table of jobs
- **filters** to keep only recent, reasonable matches
- **ranks** them with OpenAI based on sponsorship likelihood and role fit

### Files

- **`app/config.py`**: loads `OPENAI_API_KEY` from the environment and defines a simple `CandidateProfile` with default preferences you can tweak.
- **`app/parser.py`**: uses BeautifulSoup to convert an HTML `<table>` of jobs into a list of `Job` objects (dict‑serializable).
- **`app/filter_jobs.py`**: keeps only jobs posted within ~1 day and drops obvious bad fits (unpaid, high‑school only, US‑citizens‑only, etc.).
- **`app/ranker.py`**: calls the OpenAI API with the candidate profile + filtered jobs, and asks for the top 10 jobs as JSON.
- **`app/main.py`**: CLI entry point that wires everything together.

### Setup

```bash
python -m venv .venv
source .venv/bin/activate  # on Windows use: .venv\Scripts\activate
pip install -r requirements.txt
```

Set your OpenAI API key:

```bash
export OPENAI_API_KEY="sk-..."  # or use your shell's equivalent
```

### Usage

```bash
python -m app.main path/to/jobs.html -o job_results.json
```

The output JSON includes:
- **`filtered_jobs`**: the jobs that passed basic filters
- **`ranking`**: up to the top 10 jobs with scores and reasons

