import os

from scrape import scrape_intern_list
from ranker import rank_jobs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "frontend", "data")


def main():
    os.makedirs(DATA, exist_ok=True)
    os.makedirs(FRONTEND_DATA, exist_ok=True)

    print("Scraping jobs...")
    # ~two “pages” of scroll collection vs a single shallow pass
    jobs = scrape_intern_list(n=200)
    print(f"Scraped {len(jobs)} jobs.")

    if not jobs:
        msg = "No jobs scraped."
        # In CI, don't silently succeed with stale JSON.
        if os.getenv("CI"):
            raise RuntimeError(f"{msg} Failing CI run to avoid stale output.")
        print(f"{msg} Exiting.")
        return

    ranked = rank_jobs(jobs)

    # Write to data/ for local use and frontend/data/ for static hosting.
    for out_dir in (DATA, FRONTEND_DATA):
        with open(os.path.join(out_dir, "ranked_jobs.json"), "w", encoding="utf-8") as f:
            f.write(ranked)

    print(f"Done. Check {DATA}/ranked_jobs.json")


if __name__ == "__main__":
    main()