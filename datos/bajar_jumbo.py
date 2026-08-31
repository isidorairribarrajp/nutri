"""Importa productos de jumbo.cl con sus datos reales de etiqueta.

Como funciona el sitio: Next.js server-side. Cada pagina de producto
({slug}/p) incrusta un JSON-LD con nombre/marca/EAN/foto y la ficha
nutricional completa como pares {"key","value"} en el flight data, con
formato "por_100g / por_porcion" y coma decimal chilena. La API de busqueda
exige llave, pero las paginas de categoria incrustan los slugs.

Cortesia: es el sitio de una tienda, no una API publica. Una pagina cada
2,5 s, sin paralelismo, sin evadir nada, y con tope de productos por corrida.
Uso personal: la app de comidas de Isi.
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

AQUI = Path(__file__).parent
SALIDA = AQUI / "descargas" / "jumbo-cl.json"
SALIDA.parent.mkdir(exist_ok=True)
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
PAUSA = 2.5
TOPE = int(sys.argv[1]) if len(sys.argv) > 1 else 650

# categorias de comida del sitemap, en orden de interes para Isi
CATEGORIAS = [
    "panaderia-y-pasteleria", "desayuno", "lacteos-y-quesos", "despensa",
    "congelados", "comidas-preparadas", "fiambreria-y-encurtidos",
    "chocolates-galletas-y-dulces", "carniceria", "pescaderia",
    "bebidas-aguas-y-jugos", "pan-integral", "mundo-saludable",
]


def pedir(url):
    for intento in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                return None
            time.sleep(8 * (intento + 1))
        except Exception:
            time.sleep(8 * (intento + 1))
    return None


def numero(txt):
    """'217 / 173,60' -> 217.0 (el primer valor es por 100 g)."""
    if not txt:
        return None
    primer = str(txt).split("/")[0].strip().replace(".", "").replace(",", ".")
    # ojo: '1.234,5' chileno; pero '2,60' tambien. Quitar puntos de miles solo
    # si hay coma; si no, respetar el punto decimal.
    if "," not in str(txt).split("/")[0]:
        primer = str(txt).split("/")[0].strip()
    m = re.search(r"[\d.]+", primer.replace(",", "."))
    try:
        return float(m.group(0)) if m else None
    except ValueError:
        return None


def parsear_producto(html, slug):
    # 1. JSON-LD: nombre, marca, EAN, foto
    ld = re.search(r'"gtin":"(\d{8,14})"', html)
    marca = re.search(r'"@type":"Brand","name":"([^"]+)"', html)
    nombre = re.search(r'"@type":"Product","name":"([^"]+)"', html) or \
             re.search(r'<meta property="og:title" content="([^"]+)"', html)
    foto = re.search(r'(https://jumbocl\.vtexassets\.com/arquivos/ids/\d+)', html)

    # 2. la ficha nutricional del flight data
    plano = html.replace('\\"', '"')
    pares = dict(re.findall(r'\{"key":"([^"]{1,60})","value":\["([^"]{0,120})"\]', plano))

    kcal = next((numero(v) for k, v in pares.items() if k.startswith("Energ")), None)
    if kcal is None or not nombre:
        return None
    prot = next((numero(v) for k, v in pares.items() if k.startswith("Prote")), 0) or 0
    grasa = next((numero(v) for k, v in pares.items() if k.startswith("Grasas Totales") or k == "Grasas (g)"), 0) or 0
    carbo = next((numero(v) for k, v in pares.items() if k.startswith("Hidratos")), 0) or 0

    porcion = pares.get("portion", "")
    m = re.search(r"\(([\d.,]+)\s*(g|ml)\)", porcion)
    porcion_g = numero(m.group(1)) if m else None

    return {
        "slug": slug,
        "nombre": nombre.group(1)[:70],
        "marca": (marca.group(1) if marca else "Jumbo")[:30],
        "ean": ld.group(1) if ld else None,
        "foto": foto.group(1) if foto else None,
        "por100g": {"kcal": round(kcal), "p": round(prot, 1), "c": round(carbo, 1), "g": round(grasa, 1)},
        "porcion_nombre": re.sub(r"\s*\([^)]*\)", "", porcion).strip()[:40] or None,
        "porcion_g": round(porcion_g) if porcion_g else None,
    }


# ── fase A: descubrir slugs en las categorias ────────────────────────────────
vistos = {}
if SALIDA.exists():
    for p in json.loads(SALIDA.read_text(encoding="utf-8")):
        vistos[p["slug"]] = p
print(f"partiendo con {len(vistos)} ya parseados", flush=True)

slugs = []
for cat in CATEGORIAS:
    html = pedir(f"https://www.jumbo.cl/{cat}")
    nuevos = []
    if html:
        for s in re.findall(r'/([a-z0-9-]{6,90})/p["\']', html):
            if s not in vistos and s not in slugs and s not in nuevos:
                nuevos.append(s)
    slugs.extend(nuevos)
    print(f"  {cat:34} +{len(nuevos):4} slugs · {len(slugs)} en cola", flush=True)
    time.sleep(PAUSA)

# ── fase B: bajar cada producto ──────────────────────────────────────────────
sin_ficha = 0
for i, slug in enumerate(slugs[:TOPE], 1):
    html = pedir(f"https://www.jumbo.cl/{slug}/p")
    prod = parsear_producto(html, slug) if html else None
    if prod:
        vistos[slug] = prod
    else:
        sin_ficha += 1
    if i % 25 == 0:
        SALIDA.write_text(json.dumps(list(vistos.values()), ensure_ascii=False), encoding="utf-8")
        print(f"  [{i}/{min(len(slugs), TOPE)}] {len(vistos)} con ficha · {sin_ficha} sin ficha nutricional", flush=True)
    time.sleep(PAUSA)

SALIDA.write_text(json.dumps(list(vistos.values()), ensure_ascii=False), encoding="utf-8")
print(f"LISTO: {len(vistos)} productos con ficha · {sin_ficha} sin ficha", flush=True)
