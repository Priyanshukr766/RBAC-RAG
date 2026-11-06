from typing import Dict, Any
from backend.retrieval.injection_guard import detect_prompt_injection
from backend.retrieval.scope_guard import check_query_scope


def run_input_guardrails(query: str) -> Dict[str, Any]:
    """
    Runs both the Prompt Injection / Role-Spoofing detector and the Workplace Scope classifier.
    Returns a structured dict:
      {"passed": bool, "status": 'passed' | 'blocked_injection' | 'blocked_out_of_scope', "reason": Optional[str]}
    """
    is_malicious, inj_reason = detect_prompt_injection(query)
    if is_malicious:
        return {
            "passed": False,
            "status": "blocked_injection",
            "reason": inj_reason,
        }

    is_in_scope, scope_reason = check_query_scope(query)
    if not is_in_scope:
        return {
            "passed": False,
            "status": "blocked_out_of_scope",
            "reason": scope_reason,
        }

    return {
        "passed": True,
        "status": "passed",
        "reason": None,
    }