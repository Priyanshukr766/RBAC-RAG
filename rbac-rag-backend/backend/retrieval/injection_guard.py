import re
from typing import Optional, Tuple

# Compiled regex patterns for adversarial prompt injection, jailbreak, and role-spoofing detection
INJECTION_PATTERNS = [
    # 1. Instruction Override & System Prompt Leak Patterns
    r"ignore\s+(all\s+|previous\s+|prior\s+|above\s+)?(instructions|rules|prompts|guardrails|constraints)",
    r"disregard\s+(all\s+|previous\s+|prior\s+)?(instructions|rules|prompts)",
    r"system\s+override",
    r"developer\s+mode",
    r"\bjailbreak\b",
    r"(print|reveal|show|output|repeat)\s+(your\s+|the\s+)?(system\s+prompt|initial\s+instructions|text\s+above)",
    # 2. Role-Spoofing & Privilege Escalation Patterns
    r"i\s+am\s+(in\s+|an?\s+|the\s+)?(hr|admin|administrator|ceo|finance|executive|cfo|cto)\b",
    r"my\s+(current\s+)?(role|permission|clearance|access)\s+is\s+(hr|admin|finance|executive)",
    r"jwt\s+role",
    r"\bsudo\b",
    r"bypass\s+(rls|security|rbac|access\s+control|restrictions|filters)",
    r"grant\s+me\s+(admin|hr|finance|full\s+)?access",
    r"act\s+as\s+(if\s+i\s+am\s+|an?\s+)?(hr|admin|finance|superuser)",
    # 3. Bulk Exfiltration & Encoding Trick Patterns
    r"translate\s+the\s+(entire\s+)?context\s+into",
    r"base64\s+(encode|decode)",
    r"dump\s+(all|every)\s+(chunks?|documents?|rows?|records?|tables?|database)",
    r"list\s+every\s+(single\s+)?(salary|compensation|bonus|employee\s+salary)",
    r"select\s+\*\s+from\s+(document_chunks|users|logical_blocks)",
]

COMPILED_INJECTION_REGEXES = [
    re.compile(pattern, re.IGNORECASE) for pattern in INJECTION_PATTERNS
]


def detect_prompt_injection(query: str) -> Tuple[bool, Optional[str]]:
    """
    Scans a user query for direct prompt injections, jailbreaks, role-spoofing,
    or bulk exfiltration patterns.
    Returns (is_malicious, reason).
    """
    if not query or not query.strip():
        return (False, None)

    normalized = " ".join(query.strip().split())

    for regex in COMPILED_INJECTION_REGEXES:
        if regex.search(normalized):
            return (
                True,
                "Blocked: Prompt injection or role-spoofing attempt detected.",
            )

    return (False, None)