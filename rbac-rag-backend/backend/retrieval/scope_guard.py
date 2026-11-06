import re
from typing import Optional, Tuple

OUT_OF_SCOPE_PATTERNS = [
    # Creative writing & entertainment
    r"write\s+(me\s+)?(a\s+|an\s+)?(poem|song|rap|haiku|story|essay|novel|screenplay|joke)",
    r"tell\s+me\s+a\s+(joke|story|riddle)",
    # Coding homework, games & unrelated scripts
    r"\bleetcode\b",
    r"\bflappy\s+bird\b",
    r"\btic\s+tac\s+toe\b",
    r"\bsnake\s+game\b",
    r"scrape\s+(instagram|tiktok|twitter|youtube|linkedin)",
    # Cooking, sports, trivia & crypto
    r"\brecipe\s+for\b",
    r"how\s+to\s+(cook|bake)\s+",
    r"who\s+won\s+the\s+(world\s+cup|super\s+bowl|ipl|oscars|election)",
    r"(bitcoin|ethereum|dogecoin|crypto)\s+price\s+prediction",
    r"horoscope",
    r"celebrity\s+gossip",
]

COMPILED_SCOPE_REGEXES = [
    re.compile(pattern, re.IGNORECASE) for pattern in OUT_OF_SCOPE_PATTERNS
]


def check_query_scope(query: str) -> Tuple[bool, Optional[str]]:
    """
    Checks whether a user query is within the scope of enterprise internal documentation.
    Returns (is_in_scope, rejection_reason).
    """
    if not query or not query.strip():
        return (False, "Blocked: Query cannot be empty.")

    normalized = " ".join(query.strip().split())

    for regex in COMPILED_SCOPE_REGEXES:
        if regex.search(normalized):
            return (
                False,
                "Blocked: Query is outside the scope of enterprise internal documentation.",
            )

    return (True, None)