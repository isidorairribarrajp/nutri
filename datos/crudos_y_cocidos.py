"""Agrega camote y las versiones CRUDAS que faltaban.

Por qué importa: al cocinar, la carne pierde agua y se concentra. 100 g de
pechuga cruda tienen 120 kcal; los mismos 100 g después de cocinarla tienen
165. Si pesas crudo y registras "cocido", te estás anotando un 35 % de más.

Regla de la tabla: el nombre SIEMPRE dice en qué estado está.
Valores por 100 g de USDA FoodData Central.
"""
import json
import re
import unicodedata
from pathlib import Path

RUTA = Path("../public/alimentos-cl.json")

def g(kcal, p, c, gr): return {"kcal": kcal, "p": p, "c": c, "g": gr}
def P(*pares): return [{"nombre": n, "gramos": gm} for n, gm in pares]

# (nombre, grupo, alias, por100g, porciones)
NUEVOS = [
  # ── camote, que faltaba entero ──────────────────────────────────────────
  ("Camote crudo", "Cereales", "batata boniato", g(86,1.6,20.1,0.1), P(("1 camote mediano",130),("media taza en cubos",67))),
  ("Camote cocido", "Cereales", "batata boniato hervido", g(76,1.4,17.7,0.1), P(("1 camote mediano",151),("1 taza",200))),
  ("Camote al horno", "Cereales", "batata boniato asado", g(90,2,20.7,0.2), P(("1 camote mediano",114),)),
  ("Puré de camote", "Cereales", "batata", g(90,1.8,20.8,0.2), P(("1 taza",255),)),

  # ── pollo ───────────────────────────────────────────────────────────────
  ("Pechuga de pollo cruda", "Carnes", "pollo pechuga sin piel", g(120,22.5,0,2.6), P(("1 pechuga",170),("porción",120))),
  ("Trutro de pollo crudo", "Carnes", "muslo pierna", g(214,16.7,0,15.9), P(("1 trutro",130),)),
  ("Trutro de pollo cocido", "Carnes", "muslo pierna", g(232,24.6,0,14.3), P(("1 trutro",95),)),
  ("Pollo molido crudo", "Carnes", None, g(143,17.4,0,8.1), P(("porción",120),)),

  # ── vacuno ──────────────────────────────────────────────────────────────
  ("Posta de vacuno cruda", "Carnes", "carne magra res", g(131,21.8,0,4.3), P(("1 bistec",150),)),
  ("Carne molida cruda", "Carnes", "molida magra", g(137,21.4,0,5), P(("porción",120),)),
  ("Lomo vetado crudo", "Carnes", "res bife", g(220,19,0,15.7), P(("1 bistec",180),)),
  ("Asado de tira crudo", "Carnes", "costillar res", g(250,18,0,19.5), P(("porción",180),)),
  ("Churrasco de vacuno cocido", "Carnes", "bistec plancha", g(214,29,0,10.5), P(("1 churrasco",100),)),

  # ── cerdo y pavo ────────────────────────────────────────────────────────
  ("Lomo de cerdo crudo", "Carnes", None, g(143,21,0,5.9), P(("1 porción",150),)),
  ("Costillar de cerdo crudo", "Carnes", None, g(277,17,0,23), P(("porción",180),)),
  ("Pechuga de pavo cruda", "Carnes", None, g(104,24,0,0.7), P(("1 porción",150),)),
  ("Pechuga de pavo cocida", "Carnes", None, g(135,29.9,0,1), P(("1 porción",120),)),

  # ── pescados y mariscos ─────────────────────────────────────────────────
  ("Merluza cruda", "Pescados", None, g(71,15.8,0,0.9), P(("1 filete",170),)),
  ("Salmón crudo", "Pescados", None, g(179,19.9,0,10.4), P(("1 porción",150),)),
  ("Reineta cruda", "Pescados", None, g(82,16,0,1.8), P(("1 filete",170),)),
  ("Camarones crudos", "Pescados", "gambas", g(85,20,0.2,0.5), P(("porción",150),)),
  ("Atún fresco crudo", "Pescados", None, g(109,24,0,0.5), P(("1 porción",150),)),

  # ── huevo, en sus formas ────────────────────────────────────────────────
  ("Huevo duro", "Huevos", "cocido", g(155,12.6,1.1,10.6), P(("1 huevo",50),("2 huevos",100))),
  ("Huevo frito", "Huevos", None, g(196,13.6,0.8,14.8), P(("1 huevo",46),)),
  ("Huevo revuelto", "Huevos", "scrambled", g(149,10,1.6,11), P(("2 huevos",120),)),
  ("Tortilla de huevo", "Huevos", "omelette", g(154,10.6,0.6,11.7), P(("1 tortilla",120),)),

  # ── cereales y legumbres, la versión CRUDA (la que pesas antes de cocinar)
  ("Arroz blanco crudo", "Cereales", "grano seco", g(365,7.1,80,0.7), P(("media taza",93),("1 taza",185))),
  ("Arroz integral crudo", "Cereales", "grano seco", g(370,7.9,77.2,2.9), P(("media taza",95),)),
  ("Fideos crudos", "Cereales", "pasta seca tallarines", g(371,13,74.7,1.5), P(("1 porción",80),("1 taza",105))),
  ("Lentejas crudas", "Legumbres", "grano seco", g(352,24.6,63.4,1.1), P(("media taza",96),)),
  ("Porotos crudos", "Legumbres", "frejol frijol grano seco", g(341,21.6,62.4,1.2), P(("media taza",90),)),
  ("Garbanzos crudos", "Legumbres", "grano seco", g(364,19.3,61,6), P(("media taza",100),)),
  ("Quinoa cruda", "Cereales", "grano seco", g(368,14.1,64.2,6.1), P(("media taza",85),)),
  ("Avena cocida", "Cereales", "papilla con agua", g(71,2.5,12,1.4), P(("1 taza",234),("1 plato",300))),
  ("Papa cruda", "Cereales", None, g(77,2,17.5,0.1), P(("1 papa mediana",173),)),
  ("Papa al horno", "Cereales", "asada", g(93,2.5,21.2,0.1), P(("1 papa mediana",138),)),

  # ── verduras cocidas que cambian harto ──────────────────────────────────
  ("Espinaca cocida", "Verduras", None, g(23,3,3.8,0.3), P(("1 taza",180),)),
  ("Acelga cocida", "Verduras", None, g(20,1.9,4.1,0.1), P(("1 taza",175),)),
  ("Choclo crudo", "Cereales", "maiz elote", g(86,3.3,19,1.4), P(("1 choclo",90),)),
]


def slug(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


d = json.loads(RUTA.read_text(encoding="utf-8"))
por_nombre = {a["nombre"]: a for a in d["alimentos"]}

# 1. dejar explícito el estado en los nombres que quedaron ambiguos
RENOMBRES = {
    "Cordero": "Cordero crudo",
    "Hígado de vacuno": "Hígado de vacuno crudo",
    "Machas": "Machas crudas",
    "Pechuga de pavo": None,          # se reemplaza por el par crudo/cocido
    "Pollo": None,
}
renombrados = 0
for viejo, nuevo in RENOMBRES.items():
    a = por_nombre.get(viejo)
    if not a:
        continue
    if nuevo is None:
        d["alimentos"].remove(a)
        renombrados += 1
    else:
        a["nombre"] = nuevo
        a["id"] = f"cl-{slug(nuevo)}"
        renombrados += 1

existentes = {a["id"] for a in d["alimentos"]}
nombres = {a["nombre"].lower() for a in d["alimentos"]}

agregados, saltados = 0, []
for nombre, grupo, alias, por100g, porciones in NUEVOS:
    ident = f"cl-{slug(nombre)}"
    if ident in existentes or nombre.lower() in nombres:
        saltados.append(nombre)
        continue
    item = {"id": ident, "nombre": nombre, "grupo": grupo, "por100g": por100g, "porciones": porciones}
    if alias:
        item["alias"] = alias
    d["alimentos"].append(item)
    existentes.add(ident)
    agregados += 1

d["alimentos"].sort(key=lambda a: (a["grupo"], a["nombre"]))
RUTA.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"agregados {agregados} · renombrados/limpiados {renombrados} · total {len(d['alimentos'])}")
if saltados:
    print("ya existían:", ", ".join(saltados))
