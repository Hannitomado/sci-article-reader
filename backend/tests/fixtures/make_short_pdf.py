"""
Generate a tiny sample PDF (short.pdf) from the text fixtures
in this folder using PyMuPDF (fitz). This avoids committing
binary PDFs and keeps the sample reproducible.

Usage (from repo root):
  python backend/tests/fixtures/make_short_pdf.py

The script reads:
- paragraphs.txt
- bullets.txt

and writes:
- short.pdf (next to these files)
"""

from __future__ import annotations

import textwrap
from pathlib import Path

import fitz  # PyMuPDF


THIS_DIR = Path(__file__).resolve().parent
PARA_FILE = THIS_DIR / "paragraphs.txt"
BULLET_FILE = THIS_DIR / "bullets.txt"
OUT_PDF = THIS_DIR / "short.pdf"


def load_texts() -> tuple[str, str]:
    paragraphs = PARA_FILE.read_text(encoding="utf-8") if PARA_FILE.exists() else (
        "Introduction\nThis is a small example paragraph for PDF generation.\n\n"
        "Methods\nWe keep the content short and simple.\n"
    )
    bullets = BULLET_FILE.read_text(encoding="utf-8") if BULLET_FILE.exists() else (
        "List\n\n- First point\n- Second point\n\n"
    )
    return paragraphs, bullets


def wrap_paragraphs(text: str, width: int = 90) -> list[str]:
    """Wrap regular paragraphs to a given width. Keep blank lines and bullets as-is."""
    lines: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.rstrip("\n")
        if not line.strip():
            lines.append("")
            continue
        if line.lstrip().startswith(("- ", "* ", "• ")) or line.strip().endswith(":"):
            # Keep bullets or section headers as-is
            lines.append(line)
            continue
        # Wrap normal text
        wrapped = textwrap.wrap(line, width=width, break_long_words=False, replace_whitespace=False)
        if not wrapped:
            lines.append("")
        else:
            lines.extend(wrapped)
    return lines


def write_pdf(paragraphs_text: str, bullets_text: str) -> None:
    doc = fitz.open()
    # A4 size in points (approx): 595 x 842
    page = doc.new_page(width=595, height=842)

    margin = 54  # points
    x = margin
    y = margin
    fontsize = 12
    line_height = int(fontsize * 1.5)

    def add_page():
        nonlocal page, y
        page = doc.new_page(width=595, height=842)
        y = margin

    def write_lines(lines: list[str]):
        nonlocal y
        for line in lines:
            if y > (842 - margin):
                add_page()
            if not line:
                y += line_height  # blank line
                continue
            # Draw text line. Use a textbox to clip at right margin but avoid complex flow.
            rect = fitz.Rect(x, y - fontsize, 595 - margin, y + line_height)
            page.insert_textbox(rect, line, fontsize=fontsize, fontname="helv", align=0)
            y += line_height

    # Title
    title = "Sample PDF for Extraction"
    page.insert_text((x, y), title, fontsize=14, fontname="helv-B")
    y += int(2 * line_height)

    # Body from paragraphs
    para_lines = wrap_paragraphs(paragraphs_text, width=90)
    write_lines(para_lines)

    # Spacer and bullets section
    y += line_height
    bullet_lines = bullets_text.splitlines()
    write_lines(bullet_lines)

    doc.save(OUT_PDF)
    doc.close()


def main() -> None:
    paragraphs, bullets = load_texts()
    write_pdf(paragraphs, bullets)
    print(f"Wrote {OUT_PDF}")


if __name__ == "__main__":
    main()

