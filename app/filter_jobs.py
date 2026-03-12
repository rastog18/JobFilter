from datetime import datetime, date


def is_recent(posted_text: str) -> bool:
    """
    Accept jobs posted today.
    Handles relative format: '3 hours ago', '30 minutes ago', 'just now'
    Handles absolute format: 'March 9, 2026'
    """
    text = posted_text.strip().lower()
    if not text:
        return False

    # Relative: posted within the last day
    if any(word in text for word in ["minute", "hour", "just now"]):
        return True

    # Relative: "1 day ago" is borderline — include it
    if "day" in text:
        try:
            return int(text.split()[0]) <= 1
        except ValueError:
            return False

    # Absolute date fallback
    try:
        posted_date = datetime.strptime(posted_text.strip(), "%B %d, %Y").date()
        return posted_date == datetime.utcnow().date()
    except ValueError:
        return False


def is_bad_fit(job: dict) -> bool:
    text  = f"{job.get('title', '')} {job.get('qualifications', '')}".lower()
    salary = job.get("salary", job.get("pay", "")).lower()

    bad_phrases = [
        "u.s. citizen",
        "security clearance",
        "high school",
        "non-paid",
        "unpaid",
    ]

    if any(phrase in text for phrase in bad_phrases):
        return True

    if "unpaid" in salary:
        return True

    return False


def filter_jobs(jobs: list[dict]) -> list[dict]:
    return [
        job for job in jobs
        if is_recent(job.get("posted", ""))
        and not is_bad_fit(job)
    ]