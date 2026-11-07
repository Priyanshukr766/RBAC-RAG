import json
import re
from typing import Any, Optional

from openai import OpenAI

from backend.config import get_settings
from backend.generation.prompt_builder import build_grounded_messages

_STOPWORDS = {
    "what", "is", "the", "are", "how", "many", "do", "we", "get", "for", "in",
    "of", "to", "a", "an", "and", "or", "on", "at", "by", "with", "from", "can",
    "you", "tell", "me", "about", "our", "who", "when", "where", "why", "which",
    "does", "show", "give", "list", "please", "find", "explain",
}

_INDIRECT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+|previous\s+|prior\s+)?(instructions|rules|prompts)",
    r"system\s+override",
    r"output\s+.*salary",
    r"reveal\s+.*secret",
]


def _resolve_generator_client_and_model(api_key: str, configured_model: str) -> tuple[OpenAI, str]:
    """
    Supports OpenAI, Groq (gsk_...), and Google Gemini (AIza...) OpenAI-compatible endpoints.
    """
    key = api_key.strip()
    if key.startswith("gsk_"):
        client = OpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")
        model = "llama-3.3-70b-versatile" if configured_model.startswith("gpt-") else configured_model
        return client, model

    if key.startswith("AIza"):
        client = OpenAI(
            api_key=key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )
        model = "gemini-2.0-flash" if configured_model.startswith("gpt-") else configured_model
        return client, model

    return OpenAI(api_key=key), configured_model


def _sanitize_chunk_text_against_indirect_injection(text: str) -> str:
    """
    Removes sentences inside a document chunk that attempt indirect prompt injection.
    """
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
    safe_sentences: list[str] = []
    for sent in sentences:
        if any(re.search(pat, sent, flags=re.IGNORECASE) for pat in _INDIRECT_INJECTION_PATTERNS):
            continue
        safe_sentences.append(sent)
    return " ".join(safe_sentences).strip()                  

# Not so important, overengineering kri h gemini ne avi ke liye ignore this function    
def _extractive_fallback_answer(
    query: str,
    chunks: list[dict[str, Any]],
    user_role: str,
) -> dict[str, Any]:
    """
    Deterministic extractive generator for offline testing and fallback.
    Only answers if query content tokens actually match the authorized chunks.
    """
    query_tokens = [
        t for t in re.findall(r"[a-z0-9_₹$]+", query.lower())
        if t not in _STOPWORDS and len(t) > 1
    ]

    scored_chunks: list[tuple[int, float, dict[str, Any], str]] = []
    for idx, chunk in enumerate(chunks):
        raw_content = str(chunk.get("content", ""))
        clean_content = _sanitize_chunk_text_against_indirect_injection(raw_content)
        if not clean_content:
            continue

        content_lower = clean_content.lower()
        content_tokens = set(re.findall(r"[a-z0-9_₹$]+", content_lower))

        overlap = sum(
            1 for qt in query_tokens
            if qt in content_tokens or qt in content_lower
        )
        
        rerank_bonus = float(chunk.get("rerank_score", 0.0))
        if overlap > 0:
            scored_chunks.append((overlap, rerank_bonus - (idx * 0.01), chunk, clean_content))

    if not scored_chunks:
        return {
            "answer": (
                f"I do not have access to that information in the documentation "
                f"available for your role ({user_role})."
            ),
            "cited_chunk_ids": [],
        }

    scored_chunks.sort(key=lambda item: (item[0], item[1]), reverse=True)
    top_matches = scored_chunks[:2]

    synthesized_parts: list[str] = []
    cited_ids: list[str] = []
    for _, _, chunk_dict, clean_text in top_matches:
        synthesized_parts.append(clean_text)
        cid = str(chunk_dict.get("chunk_id", ""))
        if cid and cid not in cited_ids:
            cited_ids.append(cid)

    return {
        "answer": " ".join(synthesized_parts),
        "cited_chunk_ids": cited_ids,
    }


def generate_grounded_answer(
    query: str,
    chunks: list[dict[str, Any]],
    user_role: str,
) -> dict[str, Any]:
    """
    Generates a grounded answer strictly from the provided RLS-authorized chunks.
    Returns: {"answer": str, "cited_chunk_ids": list[str]}
    """
    if not chunks:
        return {
            "answer": (
                f"I do not have access to relevant information in the documentation "
                f"available for your role ({user_role})."
            ),
            "cited_chunk_ids": [],
        }

    settings = get_settings()
    api_key: Optional[str] = getattr(settings, "LLM_API_KEY", None)

    if api_key and api_key.strip() and api_key.strip() != "sk-your-key-here":
        try:
            client, model_name = _resolve_generator_client_and_model(
                api_key=api_key,
                configured_model=settings.LLM_MODEL_GENERATOR,
            )
            messages = build_grounded_messages(query=query, chunks=chunks, user_role=user_role)
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0,
                timeout=15.0,
            )
            raw_json = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_json)
            answer_str = str(parsed.get("answer", "")).strip()
            raw_cites = parsed.get("cited_chunk_ids", [])
            if answer_str and isinstance(raw_cites, list):
                return {
                    "answer": answer_str,
                    "cited_chunk_ids": [str(cid) for cid in raw_cites],
                }
        except Exception:
            pass

    return _extractive_fallback_answer(query=query, chunks=chunks, user_role=user_role)