import json
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

from anthropic import Anthropic
from openai import OpenAI, OpenAIError, RateLimitError

from config import OPENAI_API_KEY, CLAUDE_API_KEY, CANDIDATE_PROFILE


def _build_prompt(jobs: list[dict]) -> str:
    return f"""
You are a job application assistant helping an F-1 international student find the best internship.

Your task:
1. Prioritize companies highly likely to sponsor F-1 international students (OPT/CPT).
2. Prioritize roles that best match a software engineering internship profile.
3. Filter out weak fits (unpaid, non-technical, poor sponsorship likelihood).
4. Return the top 10 in ranked order.
5. Do not include TikTok or ByteDance in the results.

{CANDIDATE_PROFILE}

For each of the top 10, return a JSON object with:
- rank (int)
- title (str)
- company (str)
- location (str)
- salary (str)
- why_good_fit (str)
- sponsorship_likelihood (int 1-10)
- role_fit (int 1-10)
- final_score (int 1-10)
- apply (str)

Return a JSON array only. No explanation, no markdown, no code fences.

Jobs:
{json.dumps(jobs, indent=2)}
"""


def _rank_with_claude(prompt: str) -> Optional[str]:
    if not CLAUDE_API_KEY:
        return None
    try:
        client = Anthropic(api_key=CLAUDE_API_KEY)
        resp = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        parts = [b.text for b in resp.content if getattr(b, "type", "") == "text"]
        return "".join(parts) or None
    except Exception as e:
        print(f"[ranker] Claude error: {repr(e)}")
        return None


def _rank_with_openai(prompt: str) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096,
        )
        return resp.choices[0].message.content
    except (RateLimitError, OpenAIError) as e:
        print(f"[ranker] OpenAI error: {repr(e)}")
        return None


def rank_jobs(jobs: list[dict]) -> str:
    if not jobs:
        raise ValueError("No jobs to rank.")

    prompt = _build_prompt(jobs)

    # Try Claude first (OpenAI quota is likely exhausted)
    result = _rank_with_claude(prompt)
    if result:
        print("[ranker] Used Claude successfully.")
        return result

    result = _rank_with_openai(prompt)
    if result:
        print("[ranker] Used OpenAI successfully.")
        return result

    raise RuntimeError(
        "Both Claude and OpenAI failed. "
        "Check CLAUDE_API_KEY / OPENAI_API_KEY, billing, and model names."
    )