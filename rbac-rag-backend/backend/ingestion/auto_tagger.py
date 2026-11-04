from typing import List
from backend.config import get_settings
from backend.models.auth_schemas import AllowedRole
from backend.models.ingestion_schemas import LogicalBlockDraft
from backend.ingestion.pii_regex_scanner import scan_block_for_sensitive_patterns
from backend.ingestion.llm_block_classifier import classify_block_with_llm


def auto_tag_logical_blocks(blocks: List[LogicalBlockDraft]) -> List[LogicalBlockDraft]:
    """
    Combines the deterministic Regex/PII scanner and the LLM classifier for each
    LogicalBlockDraft, enforcing Least-Privilege Quarantine and the 0.90 confidence gate.
    """
    settings = get_settings()
    threshold = settings.AUTO_APPROVE_CONFIDENCE_THRESHOLD

    for block in blocks:
        regex_res = scan_block_for_sensitive_patterns(block.section_heading, block.raw_text)
        llm_roles, confidence, _ = classify_block_with_llm(block.section_heading, block.raw_text)

        pii_triggered: bool = bool(regex_res.get("pii_triggered", False))
        forced_roles: List[AllowedRole] = regex_res.get("forced_roles", [])

        conflict_occurred = False

        if pii_triggered:
            # Principle of Least Privilege: override with forced_roles and remove 'all_employees'
            final_roles: List[AllowedRole] = [
                r for r in forced_roles if r != "all_employees"
            ]
            if not final_roles:
                final_roles = ["hr"]

            # If LLM tried to expose a PII-triggered block to all_employees, flag conflict
            if "all_employees" in llm_roles or set(final_roles) != set(llm_roles):
                confidence = 0.50
                conflict_occurred = True
        else:
            # No hard PII regex trigger; use LLM prediction (or engineering suggestion from regex)
            if forced_roles and "all_employees" in llm_roles:
                final_roles = forced_roles
            else:
                final_roles = llm_roles

        if conflict_occurred or confidence < threshold:
            needs_human_review = True
        else:
            needs_human_review = False

        block.suggested_roles = final_roles
        block.approved_roles = list(final_roles)
        block.confidence_score = round(float(confidence), 2)
        block.pii_triggered = pii_triggered
        block.needs_human_review = needs_human_review

    return blocks