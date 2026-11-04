import json
from typing import Tuple, List
from openai import OpenAI
from backend.config import get_settings
from backend.models.auth_schemas import AllowedRole

VALID_ROLES: set[str] = {"hr", "finance", "engineering", "all_employees", "admin", "intern"}

SYSTEM_PROMPT = (
    "You are an Enterprise Data Security Classifier. Read the document section heading "
    "AND the full text underneath it. Remember: a benign heading like 'Team Updates' "
    "might hide confidential salary or budget numbers in the third sentence. "
    "Classify which roles are allowed to read this block based on the MOST sensitive "
    "sentence inside it. Valid roles: ['hr', 'finance', 'engineering', 'all_employees']. "
    'Return strict JSON: {"roles": [...], "confidence": 0.95, "reasoning": "..."}.'
)


def _offline_fallback_classifier(heading: str, text: str) -> Tuple[List[AllowedRole], float, str]:
    """
    Deterministic context-aware fallback scorer used when LLM_API_KEY is not configured
    (e.g., set to 'sk-your-key-here') so unit tests and CI run 100% offline.
    """
    combined = f"{heading}\n{text}".lower()

    hr_terms = [
        "salary", "ctc", "base pay", "compensation", "severance", "bonus",
        "stock grant", "pip", "performance improvement", "disciplinary",
        "termination", "medical leave", "aadhaar", "pan card", "ssn", "payroll"
    ]
    finance_terms = [
        "finance budget", "budget", "aws cloud hosting bill", "cloud spend",
        "quarterly burn", "ebitda", "runway", "vendor invoice", "profit margin",
        "revenue", "m&a", "acquisition", "exceeded", "financial", "audit", "expense"
    ]
    eng_terms = [
        "kubernetes", "kubectl", "docker", "microservice", "production database",
        "architecture", "runbook", "api key", "deployment", "failover", "kafka",
        "redis", "postgres", "0x", "cluster", "latency", "server"
    ]

    hr_hits = sum(1 for t in hr_terms if t in combined)
    fin_hits = sum(1 for t in finance_terms if t in combined)
    eng_hits = sum(1 for t in eng_terms if t in combined)

    # 1. HR has highest sensitivity priority
    if hr_hits > 0:
        confidence = min(0.96, 0.85 + 0.04 * hr_hits)
        return (["hr"], round(confidence, 2), "Offline classifier detected HR/compensation context.")

    # 2. Finance sensitivity check
    if fin_hits > 0:
        confidence = min(0.95, 0.84 + 0.04 * fin_hits)
        return (["finance"], round(confidence, 2), "Offline classifier detected financial/budget context.")

    # 3. Engineering internal documentation check
    if eng_hits > 0:
        confidence = min(0.94, 0.84 + 0.03 * eng_hits)
        return (["engineering"], round(confidence, 2), "Offline classifier detected technical engineering context.")

    # 4. Default general employee information
    return (["all_employees"], 0.92, "Offline classifier detected general company-wide information.")


def _resolve_client_and_model(api_key: str, configured_model: str) -> Tuple[OpenAI, str]:
    """
    Supports standard OpenAI, plus free-tier Groq (gsk_...) and Google Gemini (AIza...) keys
    automatically via their OpenAI-compatible endpoints.
    """
    if api_key.startswith("gsk_"):
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        model = "llama-3.3-70b-versatile" if configured_model == "gpt-4o-mini" else configured_model
        return client, model

    if api_key.startswith("AIza"):
        client = OpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        model = "gemini-2.0-flash" if configured_model == "gpt-4o-mini" else configured_model
        return client, model

    return OpenAI(api_key=api_key), configured_model


def classify_block_with_llm(heading: str, text: str) -> Tuple[List[AllowedRole], float, str]:
    """
    Classifies a Logical Block's allowed_roles and confidence_score (0.0 to 1.0)
    by inspecting both its section_heading and full raw_text.
    """
    settings = get_settings()
    api_key = (settings.LLM_API_KEY or "").strip()

    # Use deterministic fallback when running offline or with placeholder key
    if not api_key or api_key == "sk-your-key-here" or api_key.startswith("your-"):
        return _offline_fallback_classifier(heading, text)

    try:
        client, model_name = _resolve_client_and_model(api_key, settings.LLM_MODEL_TAGGER)
        user_prompt = f"SECTION HEADING: {heading}\n\nBLOCK TEXT:\n{text}"

        response = client.chat.completions.create(
            model=model_name,
            temperature=0.0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            timeout=10.0,
        )

        raw_content = response.choices[0].message.content or "{}"
        parsed = json.loads(raw_content)

        raw_roles = parsed.get("roles", ["all_employees"])
        valid_roles: List[AllowedRole] = [
            r for r in raw_roles if isinstance(r, str) and r in VALID_ROLES
        ]  # type: ignore
        if not valid_roles:
            valid_roles = ["all_employees"]

        confidence = float(parsed.get("confidence", 0.85))
        confidence = max(0.0, min(1.0, round(confidence, 2)))
        reasoning = str(parsed.get("reasoning", "Classified by LLM."))

        return (valid_roles, confidence, reasoning)

    except Exception:
        # Graceful fallback if network or rate-limit error occurs
        return _offline_fallback_classifier(heading, text)