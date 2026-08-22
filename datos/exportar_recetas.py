"""Convierte las recetas calculadas al formato que consume la app."""
import json
import re
import unicodedata
from pathlib import Path

RECETAS = json.loads(Path("recetas_calculadas.json").read_text(encoding="utf-8"))
CRUDAS = {r["nombre"]: r for r in json.loads(Path("recetas_crudas.json").read_text(encoding="utf-8"))}


# "4 porciones de 2 tacos" => la unidad es "porcion (2 tacos)", no "de 2 taco".
UNIDADES_RARAS = {
    "de 2 tacos": ("porcion", "2 tacos"),
    "de 2 tazas": ("porcion", "2 tazas"),
    "de 100 g": ("porcion", "100 g"),
    "unidad": ("unidad", None),
    "unidades": ("unidad", None),
    "armados": ("armado", None),
}


def unidad_singular(u):
    """Devuelve (singular, detalle)."""
    u = (u or "porcion").strip()
    if u in UNIDADES_RARAS:
        return UNIDADES_RARAS[u]
    # "panes" -> "pan" (antes de -es hay consonante), pero
    # "panqueques" -> "panqueque" (antes de -es hay vocal).
    if u.endswith("es") and len(u) > 3 and u[-3] not in "aeiou":
        return u[:-2], None
    if u.endswith("s"):
        return u[:-1], None
    return u, None


def slug(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:48]


def porciones_de(r, gp):
    sing, detalle = unidad_singular(r["unidad_porcion"])
    PLURALES = {"unidad": "unidades", "muffin": "muffins", "pan": "panes", "bowl": "bowls",
                "porcion": "porciones"}
    plural = PLURALES.get(sing, sing + ("es" if sing[-1] not in "aeiou" else "s"))
    extra = f" ({detalle})" if detalle else ""
    return [
        {"nombre": f"1 {sing}{extra}", "gramos": gp},
        {"nombre": f"2 {plural}{extra}", "gramos": gp * 2},
    ]


salida = []
for r in RECETAS:
    gp = r["gramos_porcion"] or 0
    if gp <= 0:
        continue
    por = r["calculado_porcion"]
    f = 100 / gp
    cruda = CRUDAS.get(r["nombre"], {})
    salida.append({
        "id": f"rec-{slug(r['nombre'])}",
        "nombre": r["nombre"],
        "grupo": "Recetas dulces" if r["tipo"] == "postre" else "Recetas saladas",
        "tipo": r["tipo"],
        "descripcion": r["descripcion"],
        "por100g": {
            "kcal": round(por["kcal"] * f),
            "p": round(por["p"] * f, 1),
            "c": round(por["c"] * f, 1),
            "g": round(por["g"] * f, 1),
        },
        "porciones": porciones_de(r, gp),
        "rinde": {"porciones": r["porciones"], "unidad": r["unidad_porcion"]},
        "kcal_declaradas": r["kcal_declaradas"],
        "kcal_calculadas": round(por["kcal"]),
        "desviacion": r["desviacion"],
        "ingredientes": [i["crudo"] for i in cruda.get("ingredientes", [])],
        "fuente": "receta",
        "aprox": True,
    })

Path("../public/recetas-cl.json").write_text(json.dumps({
    "version": 1,
    "nota": ("Recetas de los dos recetarios de Isi (Comida salada liviana y Postres livianos). "
             "Los macros se calculan sumando los ingredientes; las kcal se contrastan contra "
             "las que declara cada receta y se muestra la diferencia cuando es grande."),
    "recetas": salida,
}, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"{len(salida)} recetas exportadas")
saladas = sum(1 for r in salida if r["tipo"] == "salado")
print(f"  saladas: {saladas} · dulces: {len(salida)-saladas}")
lejos = [r for r in salida if r["desviacion"] and abs(r["desviacion"]) > 15]
print(f"  marcadas por diferencia >15% vs el libro: {len(lejos)}")
