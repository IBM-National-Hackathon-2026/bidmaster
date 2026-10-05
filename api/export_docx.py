"""DOCX writer stdlib-only (zipfile + XML OOXML minimal). Satu file, tanpa dependency.

Bukan konversi sempurna: heading, bold, tabel, list. Cukup untuk draft proposal.
Cek: python -m api.export_docx -> tulis sample.docx di cwd.
"""
import re
import zipfile
from io import BytesIO
from xml.sax.saxutils import escape

NAMES = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
         'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"')
CT = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>"""
RELS = """<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>"""


def _runs(text):
    parts = re.split(r"(\*\*.+?\*\*)", text)
    out = ""
    for p in parts:
        if p.startswith("**") and p.endswith("**") and len(p) > 4:
            out += f'<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{escape(p[2:-2])}</w:t></w:r>'
        elif p:
            out += f'<w:r><w:t xml:space="preserve">{escape(p)}</w:t></w:r>'
    return out or '<w:r><w:t xml:space="preserve"></w:t></w:r>'


def _para(text, style=None):
    ppr = f"<w:pPr><w:pStyle w:val=\"{style}\"/></w:pPr>" if style else ""
    return f"<w:p {NAMES}>{ppr}{_runs(text)}</w:p>"


def _row(cells, hdr=False):
    tds = "".join(
        f"<w:tc><w:tcPr><w:shd w:fill=\"{'D9D9D9' if hdr else 'auto'}\"/></w:tcPr>"
        f"<w:p {NAMES}>{_runs(c.strip(' *'))}</w:p></w:tc>" for c in cells)
    return f"<w:tr>{tds}</w:tr>"


def md_to_docx_bytes(md):
    paras, tables, cur = [], [], []
    for line in md.splitlines():
        line = line.rstrip()[:2000]
        if line.startswith("|") and line.endswith("|"):
            cur.append([c.strip() for c in line.strip("|").split("|")])
            continue
        if cur:
            if len(cur) >= 2 and all(set(c) <= set(":-| ") for c in cur[1]):
                hdr, rows = cur[0], cur[2:]
            else:
                hdr, rows = None, cur
            t = "<w:tbl><w:tblPr><w:tblBorders><w:top w:sz=\"4\"/><w:left w:sz=\"4\"/>"
            t += "<w:bottom w:sz=\"4\"/><w:right w:sz=\"4\"/><w:insideH w:sz=\"4\"/><w:insideV w:sz=\"4\"/>"
            t += "</w:tblBorders></w:tblPr>"
            if hdr:
                t += _row(hdr, True)
            for r in rows:
                t += _row(r)
            tables.append((len(paras), t + "</w:tbl>"))
            cur = []
        if line.startswith("### "):
            paras.append(_para(line[4:], "Heading3"))
        elif line.startswith("## "):
            paras.append(_para(line[3:], "Heading2"))
        elif line.startswith("# "):
            paras.append(_para(line[2:], "Heading1"))
        elif line.startswith(("- ", "* ")):
            paras.append(_para("• " + line[2:]))
        elif line.strip():
            paras.append(_para(line))
        else:
            paras.append(f"<w:p {NAMES}/>")
    if cur:  # tabel di akhir dokumen
        t = "<w:tbl><w:tblPr><w:tblBorders><w:top w:sz=\"4\"/><w:left w:sz=\"4\"/>"
        t += "<w:bottom w:sz=\"4\"/><w:right w:sz=\"4\"/><w:insideH w:sz=\"4\"/><w:insideV w:sz=\"4\"/>"
        t += "</w:tblBorders></w:tblPr>" + "".join(_row(r) for r in cur) + "</w:tbl>"
        tables.append((len(paras), t))
    for i, t in tables:
        paras.insert(i, t)
    doc = (f'<?xml version="1.0" encoding="UTF-8"?><w:document {NAMES}><w:body>'
           + "".join(paras) + "</w:body></w:document>")
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CT)
        z.writestr("_rels/.rels", RELS)
        z.writestr("word/document.xml", doc)
    return buf.getvalue()


if __name__ == "__main__":
    sample = "# Judul\n\nHalo **dunia**.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n"
    out = md_to_docx_bytes(sample)
    assert zipfile.ZipFile(BytesIO(out)).namelist() == ["[Content_Types].xml", "_rels/.rels", "word/document.xml"], "zip docx invalid"
    open("sample.docx", "wb").write(out)
    print("ok", len(out), "bytes -> sample.docx")
