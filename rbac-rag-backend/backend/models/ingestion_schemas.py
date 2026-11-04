from typing import Optional
from pydantic import BaseModel, Field

from backend.models.auth_schemas import AllowedRole


class BoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float

    def to_list(self) -> list[float]:
        return [self.x0, self.y0, self.x1, self.y1]


class LogicalBlockDraft(BaseModel):
    block_order: int
    page_number: int
    bbox: BoundingBox
    section_heading: str
    raw_text: str
    suggested_roles: list[AllowedRole] = Field(default_factory=lambda: ["all_employees"])
    approved_roles: list[AllowedRole] = Field(default_factory=lambda: ["all_employees"])
    confidence_score: float = 1.0
    needs_human_review: bool = False
    pii_triggered: bool = False


class ChunkRecord(BaseModel):
    doc_id: str
    parent_block_id: Optional[str] = None
    chunk_index: int
    content: str
    allowed_roles: list[AllowedRole]
    page_number: Optional[int] = None
    bbox: Optional[list[float]] = None
    section_heading: Optional[str] = None