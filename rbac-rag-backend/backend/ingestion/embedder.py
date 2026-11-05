from functools import lru_cache
from typing import List
from sentence_transformers import SentenceTransformer
from backend.config import get_settings


@lru_cache(maxsize=1)
def get_embedder() -> SentenceTransformer:
    """
    Loads and caches the SentenceTransformer Bi-Encoder model (BAAI/bge-base-en-v1.5, 768-dim)
    as a singleton in memory.
    """
    settings = get_settings()
    return SentenceTransformer(settings.EMBEDDING_MODEL_NAME)


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embeds a list of document chunk strings in batches, returning L2-normalized 768-dim vectors.
    """
    if not texts:
        return []
    model = get_embedder()
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=32,
        show_progress_bar=False,
    )
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    """
    Embeds a single user search query into a normalized 768-dim vector.
    """
    model = get_embedder()
    vec = model.encode(
        [query],
        normalize_embeddings=True,
        show_progress_bar=False,
    )[0]
    return vec.tolist()