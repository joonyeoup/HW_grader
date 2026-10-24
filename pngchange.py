#!/usr/bin/env python3
"""
Convert a PDF into per-page PNG images with high visual fidelity.

Usage:
  python pdf_to_png.py input.pdf --out-dir ./output --dpi 300 --transparent
  python pdf_to_png.py input.pdf --pages 1,3-5 --dpi 450

Notes:
- PNG output is lossless; increase --dpi for sharper text/lines.
- This preserves the *appearance* of the PDF; vectors/text become pixels.
"""

import argparse
import os
import sys
import re
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError as e:
    print("PyMuPDF is required. Install with: pip install pymupdf", file=sys.stderr)
    raise

def parse_pages(pages_str, page_count):
    """
    Parse a pages string like '1,3-5,8' into a zero-based sorted list of page indices.
    Accepts 1-based user input; converts to 0-based indices used by PyMuPDF.
    """
    if not pages_str:
        return list(range(page_count))
    pages = set()
    for part in pages_str.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            a = int(a); b = int(b)
            if a <= 0 or b <= 0:
                raise ValueError("Page numbers must be positive (1-based).")
            if a > b:
                a, b = b, a
            for p in range(a, b + 1):
                if 1 <= p <= page_count:
                    pages.add(p - 1)
        else:
            p = int(part)
            if p <= 0:
                raise ValueError("Page numbers must be positive (1-based).")
            if 1 <= p <= page_count:
                pages.add(p - 1)
    return sorted(pages)

def sanitize_stub(stub: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", stub)

def main():
    ap = argparse.ArgumentParser(description="Convert PDF pages to PNG images.")
    ap.add_argument("pdf", type=str, help="Path to input PDF file")
    ap.add_argument("--out-dir", type=str, default=None,
                    help="Output directory (default: <pdf_basename>_png)")
    ap.add_argument("--dpi", type=int, default=300,
                    help="Render DPI (higher = sharper/larger PNG). Default: 300")
    ap.add_argument("--pages", type=str, default=None,
                    help="Pages to export (1-based), e.g. '1,3-5'. Default: all pages")
    ap.add_argument("--transparent", action="store_true",
                    help="Use transparent background (alpha channel).")
    ap.add_argument("--grayscale", action="store_true",
                    help="Render in grayscale (smaller files).")
    ap.add_argument("--password", type=str, default=None,
                    help="Password if the PDF is encrypted (optional).")
    args = ap.parse_args()

    in_path = Path(args.pdf)
    if not in_path.exists():
        print(f"Input not found: {in_path}", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out_dir) if args.out_dir else in_path.with_suffix("").parent / f"{in_path.stem}_png"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Open PDF
    try:
        doc = fitz.open(in_path)
    except Exception as e:
        print(f"Failed to open PDF: {e}", file=sys.stderr)
        sys.exit(1)

    # Handle encryption (if needed)
    if doc.is_encrypted:
        if args.password:
            if not doc.authenticate(args.password):
                print("Incorrect password for the encrypted PDF.", file=sys.stderr)
                sys.exit(1)
        else:
            print("PDF is encrypted. Provide --password.", file=sys.stderr)
            sys.exit(1)

    page_count = doc.page_count
    page_indices = parse_pages(args.pages, page_count)

    # DPI -> scale factor (PDF user space is 72 DPI)
    scale = args.dpi / 72.0
    matrix = fitz.Matrix(scale, scale)

    # Colorspace
    colorspace = fitz.csGRAY if args.grayscale else fitz.csRGB

    base_stub = sanitize_stub(in_path.stem)

    exported = 0
    for i in page_indices:
        page = doc.load_page(i)
        # Render to pixmap
        pix = page.get_pixmap(matrix=matrix, alpha=args.transparent, colorspace=colorspace)
        out_file = out_dir / f"{base_stub}_p{i+1:03d}.png"
        pix.save(out_file.as_posix())
        exported += 1

    print(f"Exported {exported} PNG file(s) to: {out_dir.resolve()}")

if __name__ == "__main__":
    main()
