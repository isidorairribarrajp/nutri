"""Convierte lo bajado de Open Food Facts en el catálogo compacto de la app.

Se filtra fuerte: sin nombre o sin calorías por 100 g, el producto no sirve para
registrar nada. Y se usan claves de una letra porque son miles de productos y
cada byte se multiplica.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ENTRADA = Path(sys.argv[1] if len(sys.argv) > 1 else "../../off-chile.json")
SALIDA = Path("../public/off-cl.json")


def limpiar_nombre(t):
    t = re.sub(r"\s+", " ", (t or "").strip())
    return t[:70]


def norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def gramos_de(txt):
    if not txt:
        return None
    m = re.search(r"([\d.,]+)\s*(g|gr|ml)\b", str(txt), re.I)
    if not m:
        return None
    try:
        n = float(m.group(1).replace(",", "."))
    except ValueError:
        return None
    return round(n) if 0 < n < 2000 else None


crudos = json.loads(ENTRADA.read_text(encoding="utf-8"))
print(f"{len(crudos)} productos bajados")

salida, vistos = [], set()
descartes = {"sin nombre": 0, "sin kcal": 0, "kcal absurda": 0, "duplicado": 0}

for p in crudos:
    nombre = limpiar_nombre(p.get("product_name_es") or p.get("product_name"))
    # hay fichas donde el "nombre" es el codigo de barras o puro numero: no sirven
    if not nombre or len(nombre) < 3 or not re.search(r"[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3}", nombre):
        descartes["sin nombre"] += 1
        continue

    n = p.get("nutriments") or {}
    try:
        kcal = float(n.get("energy-kcal_100g"))
    except (TypeError, ValueError):
        descartes["sin kcal"] += 1
        continue
    # 0 kcal es un valor legitimo: Coca Zero, endulzantes, te, agua. Lo que no
    # sirve es que el campo no exista (eso ya se descarto arriba) o que sea
    # imposible. Antes se descartaba el cero y se perdian las bebidas light.
    if not (0 <= kcal <= 900):
        descartes["kcal absurda"] += 1
        continue

    marca = limpiar_nombre((p.get("brands") or "").split(",")[0])[:30]
    clave = (norm(nombre), norm(marca))
    if clave in vistos:
        descartes["duplicado"] += 1
        continue
    vistos.add(clave)

    def num(x):
        try:
            return round(float(n.get(x, 0)), 1)
        except (TypeError, ValueError):
            return 0

    item = {
        "c": str(p["code"]),
        "n": nombre,
        "k": round(kcal),
        "p": num("proteins_100g"),
        "h": num("carbohydrates_100g"),
        "g": num("fat_100g"),
    }
    if marca:
        item["m"] = marca
    porcion = gramos_de(p.get("serving_size")) or gramos_de(p.get("quantity"))
    if porcion:
        item["s"] = porcion
    # la foto se guarda solo como la parte que cambia: la base es siempre la misma
    img = p.get("image_thumb_url") or ""
    if img.startswith("https://images.openfoodfacts.org/images/products/"):
        item["i"] = img[len("https://images.openfoodfacts.org/images/products/"):]
    salida.append(item)

salida.sort(key=lambda x: norm(x["n"]))
SALIDA.write_text(json.dumps({
    "version": 1,
    "fuente": "Open Food Facts (productos con país Chile), bajo licencia ODbL",
    "base_imagen": "https://images.openfoodfacts.org/images/products/",
    "productos": salida,
}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

kb = SALIDA.stat().st_size / 1024
con_foto = sum(1 for x in salida if "i" in x)
con_marca = sum(1 for x in salida if "m" in x)
print(f"guardados {len(salida)} · {kb:.0f} KB")
print(f"  con marca: {con_marca} · con foto: {con_foto}")
print("  descartes:", ", ".join(f"{k} {v}" for k, v in descartes.items() if v))
