"""Baja productos por SUPERMERCADO (faceta stores_tags de Open Food Facts).

Eje nuevo: las pasadas anteriores fueron por pais, categoria y marca. La
faceta de tienda captura lo que la gente escaneo EN el Jumbo/Lider/Tottus,
venga de la marca que venga. Cada tienda es una consulta con su propio tope
de 1.000.

Guarda la descarga cruda en datos/descargas/ (gitignorado pero dentro del
repo, no en /tmp: ya perdimos una descarga entera por una limpieza).
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

AQUI = Path(__file__).parent
SALIDA = AQUI / "descargas" / "off-stores.json"
SALIDA.parent.mkdir(exist_ok=True)
UA = "Nutri/2.0 (app personal de registro de comidas; contacto isidorairribarra14@gmail.com)"
CAMPOS = "code,product_name,product_name_es,brands,nutriments,serving_size,quantity,image_thumb_url,categories_tags"
PAUSA = 3.5

TIENDAS = sys.argv[1].split(",") if len(sys.argv) > 1 else ["jumbo", "lider", "tottus", "santa-isabel", "unimarc", "acuenta"]

productos = {}
if SALIDA.exists():
    for p in json.loads(SALIDA.read_text(encoding="utf-8")):
        if p.get("code"):
            productos[p["code"]] = p
print(f"partiendo con {len(productos)}", flush=True)


def pedir(tienda, pagina):
    q = urllib.parse.urlencode({"countries_tags": "chile", "stores_tags": tienda,
                                "fields": CAMPOS, "page_size": "100", "page": str(pagina)})
    espera = 10
    for _ in range(3):
        try:
            req = urllib.request.Request(f"https://world.openfoodfacts.org/api/v2/search?{q}",
                                         headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 401:
                return None
            time.sleep(espera); espera = min(espera * 2, 60)
        except Exception:
            time.sleep(espera); espera = min(espera * 2, 60)
    return None


for i, tienda in enumerate(TIENDAS, 1):
    antes = len(productos)
    for pagina in range(1, 11):
        d = pedir(tienda, pagina)
        if not d:
            break
        lote = d.get("products", [])
        for p in lote:
            if p.get("code"):
                productos[p["code"]] = p
        if len(lote) < 100:
            break
        time.sleep(PAUSA)
    print(f"[{i}/{len(TIENDAS)}] {tienda:16} +{len(productos)-antes:4} · total {len(productos)}", flush=True)
    SALIDA.write_text(json.dumps(list(productos.values()), ensure_ascii=False), encoding="utf-8")
    time.sleep(PAUSA)

print(f"LISTO: {len(productos)} productos", flush=True)
