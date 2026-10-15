"""
Genera Planeacion_Proyecto_Equipo05.pdf a partir de Planeacion_Proyecto_Equipo05.md.

- Portada, índice general (con número de página), índice de tablas y figuras.
- Páginas numeradas, figuras y tablas identificadas.
- El diagrama de Gantt se dibuja (SVG) a partir de la Tabla 5 del cronograma,
  así el Gantt y la tabla siempre coinciden.

Requisitos: Python 3, `pip install markdown pymupdf` y Microsoft Edge (o Chrome).
Uso:        python docs/build_planeacion_pdf.py
"""
import html
import re
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

import markdown
import pymupdf

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Planeacion_Proyecto_Equipo05.md"
OUT_PDF = ROOT / "Planeacion_Proyecto_Equipo05.pdf"
TMP_HTML = ROOT / "docs" / "_planeacion_build.html"

# ----------------------------------------------------------------------------
# Datos de la portada (editar si es necesario y volver a ejecutar el script)
# ----------------------------------------------------------------------------
PORTADA = {
    "institucion": "[Nombre de la institución]",
    "materia": "[Nombre de la materia]",
    "docente": "[Nombre del docente]",
    "grupo": "[Grupo]",
    "titulo": "Planeación y organización del proyecto final de software",
    "proyecto": "AutoPro – Sistema de Gestión Automotriz (Taller Mecánico)",
    "equipo": "Equipo 5",
    "integrantes": [
        "Martinez Piñera Yael Isai",
        "Rosales Fernandez Juan Emmanuel",
        "Montalvo Garcia Juan Pablo",
        "Santos Guerrero Luis Fernando",
        "Valadez Zuñiga Angel Uriel",
    ],
    "repositorio": "https://github.com/excashh/gestion-automotriz-",
    "version": "Versión 1.1",
    "fecha": "12 de octubre de 2026",
}

EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
]

GANTT_SECTIONS = [
    ("Planeación y diseño", ["A1", "A2", "A3", "A4"], "#64748b"),
    ("Backend", ["A5", "A7", "A8", "A9", "A11"], "#4d7c0f"),
    ("Frontend", ["A6", "A10", "A12", "A13", "A14"], "#0369a1"),
    ("Integración y cierre", ["A15", "A16", "A17", "A18", "A19"], "#b45309"),
]


def parse_date(s: str) -> date:
    d, m, y = s.strip().split("/")
    return date(int(y), int(m), int(d))


def parse_schedule(md: str):
    """Lee las filas 'Axx ...' de la Tabla 5 (cronograma)."""
    rows = {}
    for line in md.splitlines():
        m = re.match(r"^\|\s*(A\d+)\s+([^|]+?)\s*\|\s*(\d\d/\d\d/\d{4})\s*\|\s*(\d\d/\d\d/\d{4})\s*\|"
                     r"\s*([^|]+?)\s*\|[^|]*\|[^|]*\|\s*([^|]+?)\s*\|\s*$", line)
        if m:
            rows[m.group(1)] = {
                "name": m.group(2),
                "start": parse_date(m.group(3)),
                "end": parse_date(m.group(4)),
                "resp": m.group(5),
                "estado": m.group(6),
            }
    return rows


def gantt_svg(rows) -> str:
    start = min(r["start"] for r in rows.values())
    end = max(r["end"] for r in rows.values())
    days = (end - start).days + 1
    label_w, day_w, row_h, sec_h, top = 215, 15.5, 19, 20, 42
    n_rows = sum(len(ids) for _, ids, _ in GANTT_SECTIONS)
    height = top + n_rows * row_h + len(GANTT_SECTIONS) * sec_h + 30
    width = label_w + days * day_w + 10
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {height}" '
           f'width="100%" font-family="Segoe UI, Arial, sans-serif">']
    out.append(f'<rect width="{width:.0f}" height="{height}" fill="#fff"/>')
    # Rejilla de días
    for i in range(days):
        d = start + timedelta(days=i)
        x = label_w + i * day_w
        if d.weekday() >= 5:
            out.append(f'<rect x="{x:.1f}" y="{top-6}" width="{day_w:.1f}" height="{height-top-24}" fill="#f1f5f9"/>')
        out.append(f'<line x1="{x:.1f}" y1="{top-6}" x2="{x:.1f}" y2="{height-30}" stroke="#e2e8f0" stroke-width="0.6"/>')
        if i % 2 == 0:
            out.append(f'<text x="{x + day_w/2:.1f}" y="{top-12}" font-size="8" text-anchor="middle" fill="#334155">'
                       f'{d.day:02d}/{d.month:02d}</text>')
    out.append(f'<text x="{width/2:.0f}" y="14" font-size="12" font-weight="700" text-anchor="middle" fill="#0f172a">'
               f'Cronograma – AutoPro (Equipo 5)</text>')
    y = top
    for sec, ids, color in GANTT_SECTIONS:
        out.append(f'<rect x="0" y="{y}" width="{width:.0f}" height="{sec_h}" fill="#e2e8f0" opacity="0.6"/>')
        out.append(f'<text x="6" y="{y+14}" font-size="10" font-weight="700" fill="#0f172a">{html.escape(sec)}</text>')
        y += sec_h
        for aid in ids:
            r = rows[aid]
            x0 = label_w + (r["start"] - start).days * day_w
            w = ((r["end"] - r["start"]).days + 1) * day_w
            fill = "#94a3b8" if r["estado"].lower().startswith("complet") else color
            label = f'{aid} {r["name"]}'
            out.append(f'<text x="6" y="{y+13}" font-size="9" fill="#0f172a">{html.escape(label)}</text>')
            out.append(f'<rect x="{x0+1:.1f}" y="{y+3}" width="{w-2:.1f}" height="{row_h-6}" rx="3" fill="{fill}"/>')
            y += row_h
    # Leyenda
    lx = 6
    for txt, col in [("Completado", "#94a3b8")] + [(s, c) for s, _, c in GANTT_SECTIONS] + [("Fin de semana", "#f1f5f9")]:
        out.append(f'<rect x="{lx}" y="{height-20}" width="10" height="10" fill="{col}" stroke="#cbd5e1"/>')
        out.append(f'<text x="{lx+14}" y="{height-11}" font-size="9" fill="#334155">{html.escape(txt)}</text>')
        lx += 14 + len(txt) * 5.2 + 16
    out.append("</svg>")
    return "\n".join(out)


def slug(i):
    return f"h{i}"


def build_html(md: str, pages: dict) -> str:
    rows = parse_schedule(md)
    body_md = md[md.index("## 1."):]
    body_md = re.sub(r"```mermaid.*?```", "@@GANTT@@", body_md, flags=re.S)
    body = markdown.markdown(body_md, extensions=["tables", "sane_lists"])
    body = body.replace("<p>@@GANTT@@</p>", f'<div class="fig">{gantt_svg(rows)}</div>')
    body = re.sub(r'<p><img alt="([^"]*)" src="([^"]+)" /></p>', r'<div class="fig"><img alt="\1" src="\2"/></div>', body)
    body = body.replace("<hr />", "")

    # Encabezados numerados -> anclas + marcadores para localizar página
    toc = []

    def h_repl(m):
        level, text = m.group(1), m.group(2)
        i = len(toc)
        toc.append((level, re.sub("<[^>]+>", "", text)))
        return f'<h{level} id="{slug(i)}"><span class="mk">@@H{i}@@</span>{text}</h{level}>'

    body = re.sub(r"<h([23])>(.*?)</h\1>", h_repl, body)

    # Pies/títulos de tablas y figuras
    captions = []

    def c_repl(m):
        kind, num, text = m.group(1), m.group(2), m.group(3)
        key = f"{kind[0]}{num}"
        captions.append((kind, num, text, key))
        return (f'<p class="caption {kind.lower()}" id="{key}"><span class="mk">@@{key}@@</span>'
                f'<b>{kind} {num}.</b> {text}</p>')

    body = re.sub(r"<p><em>(Tabla|Figura) (\d+)\. (.*?)</em></p>", c_repl, body)

    def pg(key):
        return pages.get(key, "")

    toc_html = "".join(
        f'<li class="l{lvl}"><a href="#{slug(i)}"><span class="t">{html.escape(t)}</span>'
        f'<span class="dots"></span><span class="p">{pg(f"H{i}")}</span></a></li>'
        for i, (lvl, t) in enumerate(toc)
    )
    lof = lambda k: "".join(
        f'<li class="l3"><a href="#{key}"><span class="t">{kind} {num}. {html.escape(re.sub("<[^>]+>", "", text))}</span>'
        f'<span class="dots"></span><span class="p">{pg(key)}</span></a></li>'
        for kind, num, text, key in captions if kind == k
    )
    p = PORTADA
    integrantes = "".join(f"<li>{html.escape(n)}</li>" for n in p["integrantes"])
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<base href="{ROOT.as_uri()}/">
<title>{html.escape(p['titulo'])}</title>
<style>
@page {{ size: Letter; margin: 2.2cm 2cm 2.2cm 2cm;
  @top-right {{ content: "AutoPro – Planeación del proyecto (Equipo 5)"; font: 8pt 'Segoe UI', Arial; color: #64748b; }}
  @bottom-center {{ content: "Página " counter(page) " de " counter(pages); font: 9pt 'Segoe UI', Arial; color: #334155; }} }}
@page :first {{ @top-right {{ content: none; }} @bottom-center {{ content: none; }} }}
body {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #0f172a; line-height: 1.45; }}
.mk {{ font-size: 1px; color: #fff; }}
.cover {{ height: 23cm; display: flex; flex-direction: column; justify-content: space-between; text-align: center;
  page-break-after: always; border: 3px double #0369a1; padding: 1.2cm; box-sizing: border-box; }}
.cover .inst {{ font-size: 15pt; font-weight: 700; }} .cover .mat {{ font-size: 12pt; }}
.cover h1 {{ font-size: 22pt; color: #0c4a6e; margin: .2cm 0; }} .cover .proj {{ font-size: 15pt; font-weight: 600; }}
.cover ul {{ list-style: none; padding: 0; font-size: 12pt; margin: .2cm 0; }}
.cover .meta {{ font-size: 11pt; }} .cover a {{ color: #0369a1; }}
.toc {{ page-break-after: always; }} .toc ul {{ list-style: none; padding: 0; margin: 0 0 .6cm 0; }}
.toc li a {{ display: flex; color: #0f172a; text-decoration: none; padding: 2px 0; }}
.toc li.l2 {{ font-weight: 700; margin-top: 5px; }} .toc li.l3 {{ padding-left: 1cm; font-size: 10pt; }}
.toc .dots {{ flex: 1; border-bottom: 1px dotted #94a3b8; margin: 0 6px 4px 6px; }}
h1.doc {{ font-size: 17pt; color: #0c4a6e; }}
h2 {{ font-size: 15pt; color: #0c4a6e; border-bottom: 2px solid #0369a1; padding-bottom: 3px; margin-top: 22px; page-break-after: avoid; }}
h3 {{ font-size: 12pt; color: #075985; margin-top: 16px; page-break-after: avoid; }}
table {{ border-collapse: collapse; width: 100%; font-size: 8.4pt; margin: 4px 0 12px 0; page-break-inside: auto; }}
th {{ background: #0c4a6e; color: #fff; text-align: left; padding: 4px; }}
td {{ border: 1px solid #cbd5e1; padding: 3px 4px; vertical-align: top; }}
tr {{ page-break-inside: avoid; }} tr:nth-child(even) td {{ background: #f8fafc; }}
thead {{ display: table-header-group; }}
.caption {{ font-size: 9.5pt; color: #334155; margin: 10px 0 4px 0; page-break-after: avoid; }}
.caption.figura {{ text-align: center; margin-top: 4px; page-break-before: avoid; }}
.fig {{ text-align: center; page-break-inside: avoid; margin-top: 8px; }} .fig img {{ max-width: 100%; }}
code {{ font-family: Consolas, monospace; font-size: 9pt; background: #f1f5f9; padding: 0 2px; }}
a {{ color: #0369a1; }}
</style></head><body>
<section class="cover">
  <div><div class="inst">{html.escape(p['institucion'])}</div>
  <div class="mat">{html.escape(p['materia'])} · Grupo {html.escape(p['grupo'])}</div></div>
  <div><h1>{html.escape(p['titulo'])}</h1><div class="proj">{html.escape(p['proyecto'])}</div></div>
  <div><b>{html.escape(p['equipo'])} – Integrantes</b><ul>{integrantes}</ul></div>
  <div class="meta">Docente: {html.escape(p['docente'])}<br>
  Repositorio: <a href="{p['repositorio']}">{p['repositorio']}</a><br>
  {html.escape(p['version'])} · {html.escape(p['fecha'])}</div>
</section>
<section class="toc">
  <h1 class="doc">Índice</h1><ul>{toc_html}</ul>
  <h1 class="doc">Índice de tablas</h1><ul>{lof('Tabla')}</ul>
  <h1 class="doc">Índice de figuras</h1><ul>{lof('Figura')}</ul>
</section>
{body}
</body></html>"""


def find_browser():
    for c in EDGE_CANDIDATES:
        if Path(c).exists():
            return c
    sys.exit("No se encontró Microsoft Edge ni Google Chrome.")


def render(html_text: str, browser: str):
    TMP_HTML.write_text(html_text, encoding="utf-8")
    subprocess.run([browser, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={OUT_PDF}", TMP_HTML.as_uri()],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)


def locate_pages() -> dict:
    pages = {}
    with pymupdf.open(OUT_PDF) as doc:
        for i, page in enumerate(doc):
            for key in re.findall(r"@@([HTF]\d+)@@", page.get_text()):
                pages.setdefault(key, i + 1)
    return pages


def main():
    md = SRC.read_text(encoding="utf-8")
    browser = find_browser()
    pages = {}
    for _ in range(3):  # se repite hasta que los números de página del índice se estabilicen
        render(build_html(md, pages), browser)
        new_pages = locate_pages()
        if new_pages == pages:
            break
        pages = new_pages
    TMP_HTML.unlink(missing_ok=True)
    with pymupdf.open(OUT_PDF) as doc:
        print(f"PDF generado: {OUT_PDF} ({doc.page_count} páginas)")


if __name__ == "__main__":
    main()
