"""Fusiona lo bajado de jumbo.cl dentro del catálogo de la app.

Regla de precedencia: para un mismo código de barras, el dato de jumbo.cl
GANA sobre el de Open Food Facts — viene de la etiqueta real del producto,
con la porción como la declara el fabricante.
"""
import json
import sys
from pathlib import Path

AQUI = Path(__file__).parent
CRUDO = AQUI / "descargas" / "jumbo-cl.json"
CATALOGO = AQUI / ".." / "public" / "off-cl.json"

crudos = json.loads(CRUDO.read_text(encoding="utf-8"))
cat = json.loads(CATALOGO.read_text(encoding="utf-8"))
previos = {p["c"]: p for p in cat["productos"]}

nuevos, pisados, sin_ean = 0, 0, 0
for p in crudos:
    if not (0 <= p["por100g"]["kcal"] <= 900):
        continue
    codigo = p["ean"]
    if not codigo:
        sin_ean += 1
        codigo = "jcl-" + p["slug"][:40]      # estable, aunque no escaneable
    item = {
        "c": codigo,
        "n": p["nombre"],
        "k": p["por100g"]["kcal"],
        "p": p["por100g"]["p"],
        "h": p["por100g"]["c"],
        "g": p["por100g"]["g"],
        "f": "jcl",
    }
    if p.get("marca"):
        item["m"] = p["marca"]
    if p.get("foto"):
        item["i"] = p["foto"] + "?width=300&height=300"
    if p.get("porcion_g"):
        item["s"] = p["porcion_g"]
        if p.get("porcion_nombre"):
            item["sn"] = p["porcion_nombre"].lower()
    if codigo in previos:
        pisados += 1
    else:
        nuevos += 1
    previos[codigo] = item                     # jumbo gana

cat["productos"] = sorted(previos.values(), key=lambda x: x["n"].lower())
cat["fuente"] = ("Open Food Facts (ODbL) + fichas de etiqueta de jumbo.cl "
                 "(datos nutricionales del fabricante, uso personal)")
CATALOGO.write_text(json.dumps(cat, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
kb = CATALOGO.stat().st_size / 1024
print(f"jumbo.cl: {nuevos} nuevos · {pisados} mejorados sobre OFF · {sin_ean} sin EAN")
print(f"catálogo total: {len(cat['productos'])} · {kb:.0f} KB")
