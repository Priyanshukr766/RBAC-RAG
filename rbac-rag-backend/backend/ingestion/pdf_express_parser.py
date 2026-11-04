# for single role pdfs where the whole document is for a single role, we can use the pdf express parser to
# extract the text from the pdf and return it as a list of dictionaries with page number and text. This is
# a simpler and faster approach than using the structural parser which is more complex and slower. The pdf
# express parser uses docling to extract layout-aware markdown text (preserving tables) per page, with a 
# fast PyMuPDF fallback for simple text PDFs.

from collections import defaultdict
import fitz


def _fallback_parse_with_fitz(pdf_path: str) -> list[dict]:
    pages_output: list[dict] = []
    with fitz.open(pdf_path) as doc:
        for idx, page in enumerate(doc):
            text = page.get_text("text").strip()
            if text:
                pages_output.append({"page_number": idx + 1, "text": text})
    return pages_output


def parse_pdf_express(pdf_path: str) -> list[dict]:
    """
    Extracts layout-aware Markdown text (preserving tables) per page using Docling,
    with a fast PyMuPDF fallback for simple text PDFs.
    """
    try:
        from docling.document_converter import DocumentConverter

        converter = DocumentConverter()
        result = converter.convert(pdf_path)
        doc = result.document
        page_buckets: dict[int, list[str]] = defaultdict(list)

        #   Something like this    PDF
        #                          ├── Page 1 → [Text block 1, Text block 2]
        #                          ├── Page 2 → [Text block 1, Text block 2]
        #                          └── Page 3 → [Text block 1]

        for item, _level in doc.iterate_items():
            page_no = 1
            if getattr(item, "prov", None) and len(item.prov) > 0:
                page_no = int(item.prov[0].page_no)

            if hasattr(item, "export_to_markdown"):
                try:
                    md_text = item.export_to_markdown(doc=doc).strip()
                except TypeError:
                    md_text = item.export_to_markdown().strip()
                if md_text:
                    page_buckets[page_no].append(md_text)
            elif hasattr(item, "text") and item.text:
                txt = item.text.strip()
                if txt:
                    page_buckets[page_no].append(txt)

        if page_buckets:
            return [
                {
                    "page_number": pno,
                    "text": "\n\n".join(page_buckets[pno]),
                }
                for pno in sorted(page_buckets.keys())
            ]
    except Exception:
        pass

    return _fallback_parse_with_fitz(pdf_path)
