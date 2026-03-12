import json
import os

from scrape import scrape_intern_list
from ranker import rank_jobs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")


def main():
    os.makedirs(DATA, exist_ok=True)

    print("Scraping jobs...")
    jobs = scrape_intern_list(n=250)
    print(f"Scraped {len(jobs)} jobs.")

    if not jobs:
        print("No jobs scraped. Exiting.")
        return

    ranked = rank_jobs(jobs)

    with open(os.path.join(DATA, "ranked_jobs.json"), "w", encoding="utf-8") as f:
        f.write(ranked)

    print(f"Done. Check {DATA}/ranked_jobs.json")


if __name__ == "__main__":
    main()