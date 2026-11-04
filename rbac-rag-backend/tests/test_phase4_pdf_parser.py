import fitz

from backend.ingestion.pdf_structural_parser import extract_logical_blocks_from_pdf


def test_extract_logical_blocks_and_coordinates(tmp_path):
    pdf_file = tmp_path / "phase4_synthetic.pdf"

    doc = fitz.open()
    page = doc.new_page(width=612, height=792)

    # Block 1 near top of page (y ~ 100)
    page.insert_text(
        (72, 100),
        "Heading: Infrastructure Architecture\nKubernetes cluster runbook and pod autoscaling rules.",
        fontsize=11,
    )

    # Block 2 near middle of page (y ~ 400)
    page.insert_text(
        (72, 400),
        "Heading: Executive Compensation\nConfidential CEO salary and annual retention bonus schedule.",
        fontsize=11,
    )

    doc.save(str(pdf_file))
    doc.close()

    blocks = extract_logical_blocks_from_pdf(str(pdf_file))

    assert len(blocks) >= 2

    for b in blocks:
        assert 0.0 <= b.bbox.x0 < b.bbox.x1
        assert 0.0 <= b.bbox.y0 < b.bbox.y1

    first_block = blocks[0]
    second_block = blocks[-1]

    # Verify top-left coordinate normalization matches where text was drawn
    assert 70.0 <= first_block.bbox.y0 <= 125.0
    assert 370.0 <= second_block.bbox.y0 <= 425.0
    assert "Infrastructure Architecture" in first_block.section_heading
    assert "Executive Compensation" in second_block.section_heading