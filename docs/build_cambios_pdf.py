"""
Genera docs/Cambios_2026-10-15.pdf a partir de docs/cambios_2026-10-15.md.

Requisitos: Python 3, `pip install markdown` y Microsoft Edge (o Chrome).
Uso:        python docs/build_cambios_pdf.py
"""
import subprocess
import sys
from pathlib import Path

import markdown

DOCS = Path(__file__).resolve().parent
SRC = DOCS / "cambios_2026-10-15.md"
OUT_PDF = DOCS / "Cambios_2026-10-15.pdf"
TMP_HTML = DOCS / "_cambios_build.html"

BROWSERS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
]

CSS = """
@page { size: Letter; margin: 2cm 2cm 2.2cm 2cm; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #0f172a; line-height: 1.5; }
h1 { color: #be123c; border-bottom: 3px solid #e11d48; padding-bottom: 6px; font-size: 20pt; }
h2 { color: #9f1239; margin-top: 22px; border-bottom: 1px solid #fecdd3; padding-bottom: 3px; font-size: 13.5pt; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9.5pt; page-break-inside: avoid; }
th { background: #e11d48; color: #fff; text-align: left; padding: 5px 7px; }
td { border: 1px solid #e2e8f0; padding: 5px 7px; vertical-align: top; }
tr:nth-child(even) td { background: #fff1f2; }
code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }
ul { margin-top: 4px; }
"""


def main():
    body = markdown.markdown(SRC.read_text(encoding="utf-8"), extensions=["tables"])
    TMP_HTML.write_text(
        f"<!doctype html><html lang='es'><head><meta charset='utf-8'>"
        f"<title>Bitácora de cambios 15-oct-2026</title><style>{CSS}</style></head>"
        f"<body>{body}</body></html>",
        encoding="utf-8",
    )
    browser = next((b for b in BROWSERS if Path(b).exists()), None)
    if not browser:
        sys.exit("No se encontró Edge ni Chrome.")
    subprocess.run(
        [browser, "--headless", "--disable-gpu", "--no-pdf-header-footer",
         f"--print-to-pdf={OUT_PDF}", TMP_HTML.as_uri()],
        check=True, capture_output=True,
    )
    TMP_HTML.unlink(missing_ok=True)
    print(f"PDF generado: {OUT_PDF}")


if __name__ == "__main__":
    main()
