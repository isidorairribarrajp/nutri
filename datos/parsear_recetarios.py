"""Extrae las recetas de los dos recetarios HTML de Isi.

No inventa nada: toma el titulo, las porciones, las kcal declaradas y la lista
de ingredientes tal como estan escritos. El calculo de macros va aparte.
"""
import html
import json
import re
import sys
from pathlib import Path

BASE = Path.home() / "Library/CloudStorage/GoogleDrive-isidora.irribarra@jpmetals.cl/Mi unidad/Personal"
LIBROS = [
    ("salado", BASE / "Recetas saladas/Comida salada liviana - recetario (fuente).html"),
    ("postre", BASE / "Recetas postres/Postres livianos - recetario (fuente).html"),
]

# "150 g de harina de avena" / "1 1/2 cdta de polvos de hornear" / "1 huevo"
CANT = r"(\d+\s+\d+/\d+|\d+/\d+|\d+[.,]?\d*)"
UNIDADES = r"(g|gr|ml|kg|cdta|cda|taza|tazas|unidad|unidades)?"


def limpiar(t):
    t = re.sub(r"<[^>]+>", " ", t)
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


def a_numero(txt):
    txt = txt.strip().replace(",", ".")
    m = re.match(r"^(\d+)\s+(\d+)/(\d+)$", txt)      # 1 1/2
    if m:
        return int(m[1]) + int(m[2]) / int(m[3])
    m = re.match(r"^(\d+)/(\d+)$", txt)               # 1/2
    if m:
        return int(m[1]) / int(m[2])
    try:
        return float(txt)
    except ValueError:
        return None


def parsear_ingrediente(li_html):
    """Devuelve {cantidad, unidad, nombre, crudo}. El nombre viene del <b>."""
    nombres = [limpiar(b) for b in re.findall(r"<b>(.*?)</b>", li_html, re.S)]
    crudo = limpiar(li_html)
    m = re.match(rf"^{CANT}\s*{UNIDADES}\s*(?:de\s+)?", crudo)
    cantidad = a_numero(m[1]) if m else None
    unidad = (m[2] or "unidad") if m else None
    return {
        "crudo": crudo,
        "cantidad": cantidad,
        "unidad": unidad,
        "nombres": nombres,
        "nombre": nombres[0] if nombres else None,
    }


def parsear_libro(tipo, ruta):
    s = ruta.read_text(encoding="utf-8")
    recetas = []
    for sec in re.findall(r'<section class="page recipe">(.*?)</section>', s, re.S):
        t = re.search(r'<h2 class="r-title">(.*?)</h2>', sec, re.S)
        if not t:
            continue
        num = re.search(r'<div class="r-num">Receta\s*(\d+)</div>', sec)
        desc = re.search(r'<p class="r-desc">(.*?)</p>', sec, re.S)

        meta = {}
        for lbl, val in re.findall(r'<div class="lbl">(.*?)</div><div class="val">(.*?)</div>', sec, re.S):
            meta[limpiar(lbl)] = limpiar(val)

        porciones = a_numero((re.match(r"[\d\s/]+", meta.get("Porciones", "")) or [""])[0] or "")
        unidad_porcion = re.sub(r"^[\d\s/]+", "", meta.get("Porciones", "")).strip() or "porcion"
        kcal_txt = meta.get("Kcal aprox.", "")
        kcal = a_numero((re.match(r"[\d\s/]+", kcal_txt) or [""])[0] or "")
        por = re.sub(r"^[\d\s/]+", "", kcal_txt).strip()

        # solo la columna de ingredientes, no la de preparacion
        ing_html = re.search(r'<div class="ing">(.*?)</div>\s*<div class="prep">', sec, re.S)
        ingredientes = []
        if ing_html:
            # Los <div class="grp"> agrupan: algunos son partes que se suman
            # (Masa + Arriba) y otros son VARIANTES alternativas que no.
            grupo = None
            for tag, cuerpo in re.findall(r'<(grp|li)[^>]*>(.*?)</(?:div|li)>',
                                          ing_html[1].replace('<div class="grp">', '<grp>'), re.S):
                if tag == "grp":
                    grupo = limpiar(cuerpo)
                else:
                    ing = parsear_ingrediente(cuerpo)
                    ing["grupo"] = grupo
                    ingredientes.append(ing)

        recetas.append({
            "tipo": tipo,
            "numero": int(num[1]) if num else None,
            "nombre": limpiar(t[1]),
            "descripcion": limpiar(desc[1]) if desc else "",
            "porciones": porciones,
            "unidad_porcion": unidad_porcion,
            "kcal_declaradas": kcal,
            "kcal_por": por,
            "ingredientes": ingredientes,
        })
    return recetas


def main():
    todas = []
    for tipo, ruta in LIBROS:
        if not ruta.exists():
            print(f"NO ENCONTRADO: {ruta}", file=sys.stderr)
            continue
        r = parsear_libro(tipo, ruta)
        print(f"{tipo}: {len(r)} recetas")
        todas += r

    Path("recetas_crudas.json").write_text(
        json.dumps(todas, ensure_ascii=False, indent=2), encoding="utf-8")

    # vocabulario de ingredientes, ordenado por frecuencia
    from collections import Counter
    c = Counter()
    for r in todas:
        for i in r["ingredientes"]:
            if i["nombre"]:
                c[i["nombre"].lower()] += 1
    Path("ingredientes_vocabulario.txt").write_text(
        "\n".join(f"{n}\t{k}" for k, n in c.most_common()), encoding="utf-8")
    print(f"\ntotal {len(todas)} recetas · {len(c)} ingredientes distintos")
    sin_kcal = [r["nombre"] for r in todas if not r["kcal_declaradas"]]
    sin_porc = [r["nombre"] for r in todas if not r["porciones"]]
    if sin_kcal:
        print("sin kcal declaradas:", sin_kcal)
    if sin_porc:
        print("sin porciones:", sin_porc)


main()
