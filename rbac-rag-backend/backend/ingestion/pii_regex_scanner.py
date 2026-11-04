import re
from backend.models.auth_schemas import AllowedRole

CURRENCY_PATTERN = re.compile(r"(\$|₹|\binr\b|\busd\b|\brs\.?)\s?\d[\d,\.]*", re.IGNORECASE)

HR_COMP_KEYWORDS = [
    "salary",
    "ctc",
    "base pay",
    "severance",
    "retention bonus",
    "stock grant",
    "compensation",
]

HR_STATUS_PATTERNS = [
    r"performance improvement plan",
    r"\bpip\b",
    r"disciplinary action",
    r"medical leave",
    r"termination",
    r"\bssn\b",
    r"\baadhaar\b",
    r"\bpan card\b",
]

FINANCE_KEYWORDS = [
    "quarterly burn",
    "ebitda",
    "runway",
    "vendor invoice",
    "budget variance",
    "profit margin",
    "cloud spend",
    "over budget",
]

ENGINEERING_KEYWORDS = [
    "kubectl",
    "api key",
    "production database",
    "architecture runbook",
    "microservice",
    "deployment pipeline",
]


def scan_block_for_sensitive_patterns(heading: str, text: str) -> dict:
    """
    Deterministic regex and keyword scanner for HR, Finance, and Engineering patterns.
    Returns {"pii_triggered": bool, "forced_roles": list[AllowedRole], "reason": str}.
    """
    combined = f"{heading}\n{text}".lower()
    forced_roles: list[AllowedRole] = []
    reasons: list[str] = []
    pii_triggered = False

    # 1. Check HR Confidential Triggers (Currency + Compensation OR HR Status/PII)
    has_currency = bool(CURRENCY_PATTERN.search(combined))
    has_comp_kw = any(kw in combined for kw in HR_COMP_KEYWORDS)
    has_hr_status = any(re.search(pat, combined) for pat in HR_STATUS_PATTERNS)

    if (has_currency and has_comp_kw) or has_hr_status:
        forced_roles.append("hr")
        pii_triggered = True
        reasons.append("Matched HR compensation or sensitive personnel record pattern")

    # 2. Check Finance Triggers
    has_finance = any(kw in combined for kw in FINANCE_KEYWORDS)
    if has_finance and "hr" not in forced_roles:
        forced_roles.append("finance")
        pii_triggered = True
        reasons.append("Matched confidential corporate finance metric")

    # 3. Check Engineering Triggers (only if no HR/Finance PII trigger fired)
    has_eng = any(kw in combined for kw in ENGINEERING_KEYWORDS)
    if has_eng and not forced_roles:
        forced_roles.append("engineering")
        reasons.append("Matched internal engineering infrastructure keyword")

    return {
        "pii_triggered": pii_triggered,
        "forced_roles": forced_roles,
        "reason": "; ".join(reasons) if reasons else "No deterministic sensitive pattern matched",
    }