"""Calcula macros por porcion de cada receta y CONTRASTA las kcal calculadas
contra las que Isi ya declaro en el recetario.

La comparacion es el control de calidad: si mi calculo se aleja mucho de lo que
dice el libro, es que algo esta mal (ingrediente sin peso, unidad mal leida,
composicion equivocada) y hay que mirarlo, no taparlo.
"""
import json
import re
import unicodedata
from pathlib import Path

TABLA = json.loads(Path("ingredientes.json").read_text(encoding="utf-8"))
ING = TABLA["ingredientes"]
DEF = TABLA["conversiones_default"]
RECETAS = json.loads(Path("recetas_crudas.json").read_text(encoding="utf-8"))

# Ingredientes que aparecen "al gusto" o son ruido del parser: no aportan peso.
IGNORAR = {"banadas", "solo con salsa de yogur", "camote y canela", "pollo y espinaca",
           "pimienta", "hojas de albahaca"}

# Grupos que NO se suman: son versiones alternativas de la misma receta.
# Sumarlos fue el error que inflaba los helados un 30 %.
GRUPOS_ALTERNATIVOS = {"variantes", "rellenos que van", "sin lacteos"}

# Grupos que son un acompanamiento aparte. El recetario ya los cuenta aparte
# ("240 (+155 con papas)"), asi que van como su propia entrada.
GRUPOS_ACOMPANAMIENTO = {"papas rusticas", "ensalada", "para servir"}

# Un grupo como "De maiz · 12 de 14 cm" declara su propio rendimiento:
# la pagina son en realidad dos recetas distintas.
RE_RENDIMIENTO = re.compile(r"^(.*?)\s*·\s*(\d+)\s+de\b", re.I)


def norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", t).strip()


ING_NORM = {norm(k): v for k, v in ING.items()}


def buscar(nombre):
    n = norm(nombre)
    if n in ING_NORM:
        return ING_NORM[n]
    # plural/singular simple
    for cand in (n.rstrip("s"), n + "s"):
        if cand in ING_NORM:
            return ING_NORM[cand]
    return None


def gramos_de(ing):
    """Convierte cantidad+unidad a gramos usando la tabla del ingrediente."""
    datos = buscar(ing["nombre"])
    if datos is None:
        return None, None
    cant, uni = ing["cantidad"], (ing["unidad"] or "unidad")
    if cant is None:
        return None, datos                      # "hojas de albahaca": sin peso
    if uni in ("g", "gr"):
        return cant, datos
    if uni == "kg":
        return cant * 1000, datos
    if uni == "ml":
        return cant, datos                      # 1 ml ~ 1 g para lo que hay aca
    if uni == "unidad":
        gu = datos.get("gramos_unidad")
        return (cant * gu, datos) if gu else (None, datos)
    peso = datos.get(uni) or DEF.get(uni)
    return (cant * peso, datos) if peso else (None, datos)


salida, problemas, sin_tabla = [], [], set()


def sumar(ingredientes):
    """Suma un grupo de ingredientes. Devuelve (totales, gramos, faltantes)."""
    tot = {"kcal": 0.0, "p": 0.0, "c": 0.0, "g": 0.0}
    peso, faltantes = 0.0, []
    for ing in ingredientes:
        nombre = ing["nombre"]
        if not nombre or norm(nombre) in IGNORAR:
            continue
        if "opcional" in norm(ing["crudo"]):
            continue
        gr, datos = gramos_de(ing)
        if datos is None:
            sin_tabla.add(nombre)
            faltantes.append(nombre)
            continue
        if gr is None:
            continue
        f = gr / 100
        for k in tot:
            tot[k] += datos["por100g"][k] * f
        peso += gr
    return tot, peso, faltantes


def armar(nombre, base, ingredientes, porciones, unidad, kcal_declaradas, sufijo=""):
    tot, peso, faltantes = sumar(ingredientes)
    porciones = porciones or 1
    por = {k: v / porciones for k, v in tot.items()}
    dif = ((por["kcal"] - kcal_declaradas) / kcal_declaradas) if kcal_declaradas else None
    fila = {
        "tipo": base["tipo"],
        "numero": base["numero"],
        "nombre": nombre + sufijo,
        "descripcion": base["descripcion"],
        "porciones": porciones,
        "unidad_porcion": unidad,
        "kcal_declaradas": kcal_declaradas,
        "kcal_por": base["kcal_por"],
        "gramos_totales": round(peso),
        "gramos_porcion": round(peso / porciones) if porciones else None,
        "calculado_porcion": {k: round(v, 1) for k, v in por.items()},
        "desviacion": round(dif * 100, 1) if dif is not None else None,
        "ingredientes_sin_tabla": faltantes,
    }
    salida.append(fila)
    if dif is not None and abs(dif) > 0.25:
        problemas.append(fila)
    return fila


for r in RECETAS:
    grupos = {}
    for ing in r["ingredientes"]:
        grupos.setdefault(ing.get("grupo"), []).append(ing)

    # 1. Grupos que declaran su propio rendimiento => recetas separadas.
    con_rendimiento = [(g, RE_RENDIMIENTO.match(g)) for g in grupos if g]
    con_rendimiento = [(g, m) for g, m in con_rendimiento if m]
    if len(con_rendimiento) > 1:
        kcals = [float(x) for x in re.findall(r"\d+", str(r["kcal_declaradas"]) + " " + r["kcal_por"])]
        for idx, (g, m) in enumerate(con_rendimiento):
            base_nombre = re.sub(r"\s+(de|con)\s+\w+\s+y\s+.*$", "", r["nombre"])
            armar(f"{base_nombre} {m[1].strip().lower()}", r, grupos[g],
                  int(m[2]), "unidad", kcals[idx] if idx < len(kcals) else None)
        continue

    # 2. Resto: parte principal + acompanamientos como entradas propias.
    principal, acomp = [], {}
    for g, items in grupos.items():
        gn = norm(g)
        if gn in GRUPOS_ALTERNATIVOS:
            continue
        if gn in GRUPOS_ACOMPANAMIENTO:
            acomp[g] = items
        else:
            principal += items

    extra = re.search(r"\+\s*(\d+)", r["kcal_por"] or "")
    armar(r["nombre"], r, principal, r["porciones"], r["unidad_porcion"], r["kcal_declaradas"])
    for g, items in acomp.items():
        armar(f"{r['nombre']} — {g}", r, items, r["porciones"], r["unidad_porcion"],
              float(extra[1]) if extra else None)

Path("recetas_calculadas.json").write_text(
    json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"{len(salida)} recetas calculadas")
if sin_tabla:
    print("\nINGREDIENTES SIN COMPOSICION (no suman):")
    for n in sorted(sin_tabla):
        print("   -", n)

desv = [abs(f["desviacion"]) for f in salida if f["desviacion"] is not None]
desv.sort()
print(f"\ndesviacion vs kcal declaradas: mediana {desv[len(desv)//2]:.1f}%  ·  peor {desv[-1]:.1f}%")
print(f"dentro de +-15%: {sum(1 for d in desv if d <= 15)}/{len(desv)}")
print(f"dentro de +-25%: {sum(1 for d in desv if d <= 25)}/{len(desv)}")

if problemas:
    print(f"\n{len(problemas)} RECETAS FUERA DE +-25% (revisar):")
    for f in problemas:
        print(f"   {f['nombre'][:44]:46} declara {f['kcal_declaradas']:>4.0f}  "
              f"calculo {f['calculado_porcion']['kcal']:>6.1f}  ({f['desviacion']:+.0f}%)"
              + (f"  faltan: {f['ingredientes_sin_tabla']}" if f["ingredientes_sin_tabla"] else ""))
