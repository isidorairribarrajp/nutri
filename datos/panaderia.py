"""Panadería y pastelería de supermercado, como genéricos.

Por qué existen: los productos de panadería del Jumbo/Líder llevan códigos de
barra INTERNOS de la tienda (empiezan con 2 y codifican el peso), que nunca
van a estar en Open Food Facts. El escáner no los va a encontrar jamás. La
salida honesta es el genérico con valores de tabla (USDA FoodData Central),
marcado como aproximado.
"""
import json
import re
import unicodedata
from pathlib import Path

RUTA = Path("../public/alimentos-cl.json")

def g(kcal, p, c, gr): return {"kcal": kcal, "p": p, "c": c, "g": gr}
def P(*pares): return [{"nombre": n, "gramos": gm} for n, gm in pares]

NUEVOS = [
  ("Pan de zapallo (pumpkin bread)", "Panes", "queque calabaza pumpkin bread jumbo",
   g(318, 4.2, 46.5, 13.1), P(("1 rebanada", 60), ("2 rebanadas", 120))),
  ("Banana bread", "Panes", "queque de plátano pan",
   g(326, 4.3, 54.6, 10.5), P(("1 rebanada", 60),)),
  ("Queque inglés", "Dulces", "budín bizcocho",
   g(389, 5.4, 52.8, 17.4), P(("1 rebanada", 55),)),
  ("Croissant", "Panes", "medialuna cachito",
   g(406, 8.2, 45.8, 21), P(("1 croissant", 57),)),
  ("Dona glaseada", "Dulces", "donut berlinesa",
   g(421, 5.1, 49.7, 22.8), P(("1 dona", 60),)),
  ("Muffin de arándanos", "Dulces", "queque individual blueberry",
   g(377, 4.5, 54, 16), P(("1 muffin", 110),)),
  ("Muffin de chocolate", "Dulces", "queque individual chips",
   g(410, 5.3, 52, 20), P(("1 muffin", 110),)),
  ("Pan amasado", "Panes", None,
   g(300, 8, 55, 5), P(("1 pan", 90), ("medio pan", 45))),
  ("Pan pita integral", "Panes", "árabe",
   g(266, 9.8, 55, 2.6), P(("1 pan pita", 64),)),
  ("Baguette", "Panes", "pan francés barra",
   g(274, 8.8, 55.8, 1.6), P(("un cuarto de baguette", 62), ("media baguette", 125))),
  ("Chapata", "Panes", "ciabatta",
   g(271, 9.2, 52, 3.2), P(("1 chapata chica", 90),)),
  ("Pan de pascua", "Dulces", "fruta confitada navidad",
   g(367, 5.6, 58, 12.5), P(("1 rebanada", 60),)),
  ("Pan de hamburguesa", "Panes", "brioche",
   g(294, 9.5, 50.1, 5.8), P(("1 pan", 60),)),
  ("Pan de completo", "Panes", "hot dog",
   g(290, 9.4, 51.5, 4.9), P(("1 pan", 55),)),
  ("Pan integral de molde de panadería", "Panes", "multigrano centeno",
   g(252, 12.3, 42.7, 4.2), P(("1 rebanada", 40),)),
  ("Tostadas / pan tostado", "Panes", "crostini zwieback",
   g(407, 12, 74, 6.5), P(("1 tostada", 10), ("3 tostadas", 30))),
  ("Empanada de queso de horno", "Platos", "panadería",
   g(310, 9.5, 33, 15.5), P(("1 empanada", 130),)),
  ("Kuchen de manzana", "Dulces", "tarta alemana",
   g(265, 3.5, 38, 11), P(("1 trozo", 110),)),
  ("Pie de limón de pastelería", "Dulces", "tarta",
   g(361, 4.7, 49.7, 16.4), P(("1 trozo", 110),)),
  ("Torta de mil hojas", "Dulces", "manjar hojarasca",
   g(430, 5.5, 48, 24), P(("1 trozo", 100),)),
  ("Brazo de reina", "Dulces", "pionono rollo",
   g(320, 5.8, 55, 8.5), P(("1 rebanada", 70),)),
  ("Galleta de mantequilla de panadería", "Dulces", "mantecado",
   g(478, 5.6, 62, 23), P(("1 galleta", 25),)),
  ("Palmerita", "Dulces", "palmera hojaldre",
   g(486, 5.5, 55, 27), P(("1 palmerita", 30),)),
  ("Berlín de panadería", "Dulces", "bomba crema pastelera",
   g(361, 6.3, 48.5, 15.6), P(("1 berlín", 100),)),
]


def slug(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


d = json.loads(RUTA.read_text(encoding="utf-8"))
existentes = {a["id"] for a in d["alimentos"]}
nombres = {a["nombre"].lower() for a in d["alimentos"]}

agregados, saltados = 0, []
for nombre, grupo, alias, por100g, porciones in NUEVOS:
    ident = f"cl-{slug(nombre)}"
    if ident in existentes or nombre.lower() in nombres:
        saltados.append(nombre)
        continue
    item = {"id": ident, "nombre": nombre, "grupo": grupo, "por100g": por100g,
            "porciones": porciones, "aprox": True}
    if alias:
        item["alias"] = alias
    d["alimentos"].append(item)
    existentes.add(ident)
    agregados += 1

d["alimentos"].sort(key=lambda a: (a["grupo"], a["nombre"]))
RUTA.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"agregados {agregados} · total {len(d['alimentos'])}")
if saltados:
    print("ya existían:", ", ".join(saltados))
