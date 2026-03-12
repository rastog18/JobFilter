import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY") or os.getenv("ANTHROPIC_API_KEY")

CANDIDATE_PROFILE = """
Candidate profile:
- International student on F-1 visa
- Looking for Summer 2026 software engineering internships
- Strongest fit: software engineering, backend, full-stack, platform, developer tools, ML engineering adjacent roles
- Skills: Python, Java, SQL, Kotlin, Android, basic cloud/dev tools
- Prefer roles more likely to sponsor international students
- Avoid roles requiring U.S. citizenship, security clearance, unpaid internships, and clearly non-software roles
"""

