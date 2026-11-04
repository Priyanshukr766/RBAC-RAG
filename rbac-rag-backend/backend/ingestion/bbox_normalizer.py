from backend.models.ingestion_schemas import BoundingBox


def normalize_to_top_left_bbox(
    l: float,
    t: float,
    r: float,
    b: float,
    page_height: float,
    coord_origin: str = "BOTTOMLEFT",
) -> BoundingBox:
    """
    Normalizes bounding box coordinates from BOTTOMLEFT or TOPLEFT origin
    into PyMuPDF's standard top-left [x0, y0, x1, y1] coordinate space.
    """
    if coord_origin.upper() == "BOTTOMLEFT" or "BOTTOMLEFT" in coord_origin.upper():
        y0 = page_height - max(t, b)
        y1 = page_height - min(t, b)
    else:
        y0 = min(t, b)
        y1 = max(t, b)

    x0 = min(l, r)
    x1 = max(l, r)

    x0 = max(0.0, x0)
    y0 = max(0.0, y0)
    x1 = max(x0, x1)
    y1 = max(y0, y1)

    return BoundingBox(
        x0=round(x0, 2),
        y0=round(y0, 2),
        x1=round(x1, 2),
        y1=round(y1, 2),
    )
