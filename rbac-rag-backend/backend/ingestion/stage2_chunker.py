import re
from typing import List, Dict, Any
from backend.models.ingestion_schemas import ChunkRecord


def _split_oversized_sentence(
    sentence: str, target_words: int, overlap_words: int
) -> List[str]:
    """Fallback word-window splitter if a single sentence has no punctuation and exceeds target_words."""
    words = sentence.split()
    if len(words) <= target_words:
        return [sentence]

    chunks: List[str] = []
    step = max(1, target_words - overlap_words)
    for i in range(0, len(words), step):
        slice_words = words[i : i + target_words]
        if not slice_words:
            break
        chunks.append(" ".join(slice_words))
        if i + target_words >= len(words):
            break
    return chunks


def split_text_into_word_chunks(
    text: str,
    target_words: int = 300,
    overlap_words: int = 50,
) -> List[str]:
    """
    Splits text on sentence/line boundaries into chunks of ~target_words with overlap_words overlap.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return []

    raw_sentences = [
        s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", cleaned) if s.strip()
    ]
    sentences: List[str] = []
    for s in raw_sentences:
        if len(s.split()) > target_words:
            sentences.extend(_split_oversized_sentence(s, target_words, overlap_words))
        else:
            sentences.append(s)

    chunks: List[str] = []  # Stores the final chunks
    current_sentences: List[str] = []  # Stores sentences currently being collected
    current_word_count = 0  # Tracks how many words are in the current chunk

    for sentence in sentences:
        s_words = len(sentence.split())

        if current_sentences and (current_word_count + s_words > target_words):
            chunks.append(" ".join(current_sentences))

            # Carry over trailing sentences up to overlap_words for smooth context continuity
            overlap_buffer: List[str] = []
            overlap_count = 0
            for prev_s in reversed(current_sentences):
                pw = len(prev_s.split())
                if overlap_count + pw <= overlap_words or len(overlap_buffer) == 0:
                    # The second condition ensures at least one sentence is carried over even if it exceeds overlap_words
                    # append at the start of the buffer list to maintain order
                    overlap_buffer.insert(0, prev_s)
                    overlap_count += pw
                else:
                    break

            # Avoid infinite loop if overlap_buffer alone prevents adding the next sentence
            if overlap_count + s_words > target_words:
                overlap_buffer = []
                overlap_count = 0

            current_sentences = overlap_buffer
            current_word_count = overlap_count

        current_sentences.append(sentence)
        current_word_count += s_words

    if current_sentences:
        chunks.append(" ".join(current_sentences))

    return chunks


def create_chunks_from_approved_blocks(
    doc_id: str,
    blocks: List[Dict[str, Any]],
    target_words: int = 300,
    overlap_words: int = 50,
) -> List[ChunkRecord]:
    """
    Slices each approved Logical Block into ~300-word ChunkRecord items with 50-word overlap,
    prefixing each chunk with '[Section: {section_heading}] ' and inheriting all RBAC & bbox metadata.
    """
    chunk_records: List[ChunkRecord] = []
    chunk_index = 0

    for block in blocks:
        raw_text = block.get("raw_text", "")
        section_heading = block.get("section_heading") or "General Section"
        approved_roles = block.get("approved_roles") or ["all_employees"]
        page_number = block.get("page_number")
        bbox = block.get("bbox")
        block_id = block.get("block_id")

        sub_texts = split_text_into_word_chunks(
            raw_text,
            target_words=target_words,
            overlap_words=overlap_words,
        )

        for sub_text in sub_texts:
            prefixed_content = f"[Section: {section_heading}] {sub_text}"
            chunk_records.append(
                ChunkRecord(
                    doc_id=str(doc_id),
                    parent_block_id=str(block_id) if block_id else None,
                    chunk_index=chunk_index,
                    content=prefixed_content,
                    allowed_roles=approved_roles,
                    page_number=int(page_number) if page_number is not None else None,
                    bbox=[float(x) for x in bbox] if bbox is not None else None,
                    section_heading=section_heading,
                )
            )
            chunk_index += 1

    return chunk_records
