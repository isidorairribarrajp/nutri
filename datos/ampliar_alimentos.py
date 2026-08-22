"""Amplía la tabla chilena con lo que faltaba.

Valores por 100 g de USDA FoodData Central para los genéricos y de etiquetas de
producto para los específicos (bebidas vegetales, proteína en polvo, snacks).
Las porciones son las caseras de acá, no medidas de laboratorio.
"""
import json
import re
import unicodedata
from pathlib import Path

RUTA = Path("../public/alimentos-cl.json")

def g(kcal, p, c, gr): return {"kcal": kcal, "p": p, "c": c, "g": gr}
def P(*pares): return [{"nombre": n, "gramos": gm} for n, gm in pares]

NUEVOS = [
  # ── lo que Isi come de verdad (visto en su diario de Fitia) ──────────────
  ("Avena instantánea", "Cereales", None, g(389,16.9,66.3,6.9), P(("1 sobre",30),("media taza",40))),
  ("Bebida de avena sin azúcar", "Lácteos", "leche de avena vegetal", g(40,0.8,6.5,1.2), P(("1 taza",240),("1 vaso",200))),
  ("Bebida de avena barista", "Lácteos", "leche de avena", g(60,1,8,2.5), P(("1 taza",240),("chorrito de café",50))),
  ("Bebida de almendras sin azúcar", "Lácteos", "leche de almendras vegetal", g(15,0.6,0.6,1.2), P(("1 taza",240),("1 vaso",200))),
  ("Bebida de coco", "Lácteos", "leche de coco vegetal", g(20,0.2,1.5,1.5), P(("1 taza",240),)),
  ("Bebida de soya", "Lácteos", "leche de soya vegetal", g(43,3.3,5,1.8), P(("1 taza",243),)),
  ("Proteína en polvo (whey)", "Suplementos", "suero isolate scoop batido", g(375,85,5,2), P(("1 scoop",30),("2 scoops",60))),
  ("Proteína vegetal en polvo", "Suplementos", "vegana arveja scoop", g(380,75,10,5), P(("1 scoop",30),)),
  ("Colágeno en polvo", "Suplementos", "colageno", g(360,90,0,0), P(("1 scoop",10),)),
  ("Creatina", "Suplementos", "monohidrato", g(0,0,0,0), P(("1 cucharadita",5),)),
  ("Alulosa", "Dulces", "endulzante alulose", g(40,0,10,0), P(("1 cucharadita",4),("1 cucharada",12))),
  ("Endulzante sin calorías", "Dulces", "sucralosa stevia estevia", g(0,0,0,0), P(("1 sobre",1),("1 cucharadita",1))),
  ("Eritritol", "Dulces", "endulzante", g(20,0,5,0), P(("1 cucharadita",4),("1 cucharada",12))),
  ("Chía", "Frutos secos", "semillas de chia", g(486,16.5,42.1,30.7), P(("1 cucharada",12),("2 cucharadas",24))),
  ("Linaza molida", "Frutos secos", "semillas", g(534,18.3,28.9,42.2), P(("1 cucharada",10),)),
  ("Yogur proteico", "Lácteos", "protein extra alto en proteina", g(60,10,4,0.5), P(("1 envase",140),("1 pote",125))),
  ("Quark", "Lácteos", "queso fresco batido", g(67,12,4,0.2), P(("1 pote",150),)),
  ("Canela", "Dulces", "especias", g(247,4,80.6,1.2), P(("1 cucharadita",2.6),("1 pizca",0.5))),
  ("Cacao amargo en polvo", "Dulces", "cocoa chocolate", g(228,19.6,57.9,13.7), P(("1 cucharada",5.4),)),

  # ── frutas ──────────────────────────────────────────────────────────────
  ("Mandarina", "Frutas", "clementina", g(53,0.8,13.3,0.3), P(("1 mandarina",88),("2 mandarinas",176))),
  ("Melón", "Frutas", "calameño tuna", g(34,0.8,8.2,0.2), P(("1 taza",160),("1 rebanada",160))),
  ("Mango", "Frutas", None, g(60,0.8,15,0.4), P(("1 mango",207),("1 taza",165))),
  ("Piña", "Frutas", "ananá", g(50,0.5,13.1,0.1), P(("1 taza",165),("1 rodaja",84))),
  ("Ciruela", "Frutas", None, g(46,0.7,11.4,0.3), P(("1 ciruela",66),)),
  ("Damasco", "Frutas", "albaricoque", g(48,1.4,11.1,0.4), P(("1 damasco",35),("3 damascos",105))),
  ("Cerezas", "Frutas", "guindas", g(63,1.1,16,0.2), P(("1 taza",154),("10 cerezas",68))),
  ("Higo", "Frutas", None, g(74,0.8,19.2,0.3), P(("1 higo",50),)),
  ("Granada", "Frutas", None, g(83,1.7,18.7,1.2), P(("1 taza de granos",174),)),
  ("Papaya", "Frutas", None, g(43,0.5,10.8,0.3), P(("1 taza",145),)),
  ("Frambuesas", "Frutas", None, g(52,1.2,11.9,0.7), P(("1 taza",123),)),
  ("Moras", "Frutas", "murtilla", g(43,1.4,9.6,0.5), P(("1 taza",144),)),
  ("Pomelo", "Frutas", "toronja", g(42,0.8,10.7,0.1), P(("media unidad",123),)),
  ("Pasas", "Frutas", "uvas pasas", g(299,3.1,79.2,0.5), P(("1 cucharada",10),("1 puñado",28))),
  ("Durazno en conserva", "Frutas", "almíbar", g(54,0.5,14,0), P(("media unidad",98),("1 taza",244))),
  ("Limón", "Frutas", None, g(29,1.1,9.3,0.3), P(("1 limón",58),("jugo de 1 limón",25))),

  # ── verduras ────────────────────────────────────────────────────────────
  ("Apio", "Verduras", None, g(16,0.7,3,0.2), P(("1 tallo",40),("1 taza",101))),
  ("Repollo", "Verduras", "col", g(25,1.3,5.8,0.1), P(("1 taza",89),)),
  ("Repollo morado", "Verduras", "col lombarda", g(31,1.4,7.4,0.2), P(("1 taza",89),)),
  ("Acelga", "Verduras", None, g(19,1.8,3.7,0.2), P(("1 taza",36),("1 atado cocido",175))),
  ("Alcachofa", "Verduras", None, g(47,3.3,10.5,0.2), P(("1 alcachofa",128),)),
  ("Espárragos", "Verduras", None, g(20,2.2,3.9,0.1), P(("1 taza",134),("6 espárragos",90))),
  ("Palmitos", "Verduras", "palmito", g(28,2.5,4.6,0.6), P(("1 taza",146),("1 tarro",220))),
  ("Aceitunas", "Grasas", "olivas", g(145,1,3.8,15.3), P(("5 aceitunas",20),("1 taza",134))),
  ("Rabanito", "Verduras", "rábano", g(16,0.7,3.4,0.1), P(("1 taza",116),)),
  ("Kale", "Verduras", "col rizada berza", g(49,4.3,8.8,0.9), P(("1 taza",67),)),
  ("Rúcula", "Verduras", "arugula", g(25,2.6,3.7,0.7), P(("1 taza",20),)),
  ("Berenjena", "Verduras", None, g(25,1,5.9,0.2), P(("1 taza",82),("1 berenjena",458))),
  ("Pimentón rojo", "Verduras", "pimiento morrón", g(31,1,6,0.3), P(("1 pimentón",119),("1 taza",149))),
  ("Pimentón verde", "Verduras", "pimiento", g(20,0.9,4.6,0.2), P(("1 pimentón",119),)),
  ("Jengibre", "Verduras", "kion", g(80,1.8,17.8,0.8), P(("1 cucharadita",2),)),
  ("Ajo", "Verduras", None, g(149,6.4,33,0.5), P(("1 diente",3),)),
  ("Cilantro", "Verduras", None, g(23,2.1,3.7,0.5), P(("1 cucharada",4),)),
  ("Perejil", "Verduras", None, g(36,3,6.3,0.8), P(("1 cucharada",4),)),
  ("Albahaca", "Verduras", None, g(23,3.2,2.7,0.6), P(("1 taza",24),)),
  ("Cebollín", "Verduras", "ciboulette cebolleta", g(32,1.8,7.3,0.2), P(("1 cucharada",6),)),

  # ── proteínas ───────────────────────────────────────────────────────────
  ("Camarones cocidos", "Pescados", "gambas", g(99,24,0.2,0.3), P(("1 taza",145),("porción",120))),
  ("Choritos cocidos", "Pescados", "mejillones", g(172,23.8,7.4,4.5), P(("1 taza",150),)),
  ("Machas", "Pescados", "almejas", g(86,14.7,3,1.5), P(("6 machas",90),)),
  ("Jurel en lata", "Pescados", "conserva", g(156,20.7,0,7.9), P(("1 lata",125),("media lata",62))),
  ("Salmón ahumado", "Pescados", None, g(117,18.3,0,4.3), P(("2 láminas",50),)),
  ("Atún en aceite (lata)", "Pescados", "conserva", g(198,29,0,8.2), P(("1 lata escurrida",104),)),
  ("Pechuga de pavo", "Carnes", None, g(135,29.9,0,1), P(("1 porción",120),)),
  ("Cordero", "Carnes", None, g(258,25.6,0,16.5), P(("1 porción",120),)),
  ("Hígado de vacuno", "Carnes", None, g(175,26.5,5.1,4.9), P(("1 porción",100),)),
  ("Longaniza", "Carnes", None, g(320,15,2,28), P(("1 longaniza",80),)),
  ("Chorizo", "Carnes", None, g(455,24,1.9,38), P(("1 chorizo",60),)),
  ("Tocino", "Carnes", "panceta bacon", g(541,37,1.4,42), P(("1 lonja",8),("3 lonjas",24))),
  ("Arrollado huaso", "Carnes", None, g(280,18,2,22), P(("1 rebanada",50),)),
  ("Prieta", "Carnes", "morcilla", g(379,14.6,1.3,34.5), P(("1 prieta",100),)),
  ("Salchicha de pavo", "Carnes", None, g(180,14,3,12), P(("1 salchicha",45),)),

  # ── lácteos ─────────────────────────────────────────────────────────────
  ("Queso mantecoso", "Lácteos", None, g(330,22,2,26), P(("1 lámina",20),("2 láminas",40))),
  ("Queso crema", "Lácteos", "philadelphia untable", g(342,6,4.1,34), P(("1 cucharada",15),)),
  ("Ricotta", "Lácteos", None, g(174,11.3,3,13), P(("media taza",123),)),
  ("Queso parmesano", "Lácteos", None, g(392,35.8,3.2,25.8), P(("1 cucharada",5),)),
  ("Leche condensada", "Lácteos", None, g(321,7.9,54.4,8.7), P(("1 cucharada",20),)),
  ("Crema de leche", "Lácteos", "nata", g(292,2.1,3.7,30), P(("1 cucharada",15),)),
  ("Kéfir", "Lácteos", None, g(55,3.3,4.5,2.5), P(("1 vaso",240),)),
  ("Leche sin lactosa", "Lácteos", None, g(61,3.2,4.8,3.3), P(("1 taza",244),("1 vaso",200))),
  ("Yogur descremado", "Lácteos", None, g(41,4.1,5.6,0.2), P(("1 pote",125),)),

  # ── despensa ────────────────────────────────────────────────────────────
  ("Kétchup", "Salsas", "catsup", g(101,1.1,25.8,0.1), P(("1 cucharada",17),)),
  ("Mostaza", "Salsas", None, g(66,4.4,5.8,3.3), P(("1 cucharadita",5),)),
  ("Salsa de soya", "Salsas", "soja shoyu", g(53,8.1,4.9,0.6), P(("1 cucharada",16),)),
  ("Vinagre", "Salsas", None, g(18,0,0.9,0), P(("1 cucharada",15),)),
  ("Puré de tomate", "Salsas", "salsa de tomate", g(38,1.6,8.6,0.2), P(("media taza",122),("1 cucharada",16))),
  ("Caldo de verduras", "Salsas", "cubito", g(6,0.3,1,0.1), P(("1 taza",240),)),
  ("Mermelada", "Dulces", "jalea", g(278,0.4,68.9,0.1), P(("1 cucharada",20),)),
  ("Harina blanca", "Cereales", "trigo", g(364,10.3,76.3,1), P(("1 taza",125),("1 cucharada",8))),
  ("Fideos integrales cocidos", "Cereales", "pasta", g(124,5.3,26.5,0.5), P(("1 taza",140),)),
  ("Galletas de arroz", "Cereales", None, g(387,8.2,81.5,2.8), P(("1 galleta",9),("2 galletas",18))),
  ("Granola", "Cereales", None, g(471,10,64,20), P(("un cuarto de taza",30),("media taza",60))),
  ("Barrita de cereal", "Cereales", None, g(400,6,70,10), P(("1 barrita",25),)),
  ("Levadura nutricional", "Suplementos", None, g(385,51,36,5), P(("1 cucharada",5),)),
  ("Aceite de maravilla", "Grasas", "girasol vegetal", g(884,0,0,100), P(("1 cucharadita",4.5),("1 cucharada",13.5))),
  ("Aceite de coco", "Grasas", None, g(862,0,0,100), P(("1 cucharadita",4.5),("1 cucharada",13.5))),
  ("Pistachos", "Frutos secos", None, g(560,20.2,27.2,45.3), P(("1 puñado",28),)),
  ("Castañas de cajú", "Frutos secos", "anacardo nuez de la india", g(553,18.2,30.2,43.9), P(("1 puñado",28),)),
  ("Semillas de maravilla", "Frutos secos", "girasol pepas", g(584,20.8,20,51.5), P(("1 cucharada",9),)),

  # ── snacks y dulces ─────────────────────────────────────────────────────
  ("Papas fritas de bolsa", "Dulces", "snack lays", g(536,7,53,34), P(("1 bolsa chica",30),("1 bolsa grande",90))),
  ("Ramitas", "Dulces", "snack palitos", g(500,8,60,25), P(("1 bolsa",45),)),
  ("Chocolate amargo 70%", "Dulces", "negro bitter", g(598,7.8,45.9,42.6), P(("1 cuadrito",10),("1 barra chica",40))),
  ("Berlín", "Dulces", "bomba", g(380,6,45,19), P(("1 berlín",100),)),
  ("Cuchuflí", "Dulces", None, g(480,5,60,24), P(("1 cuchuflí",20),)),
  ("Alfajor", "Dulces", None, g(420,5,62,17), P(("1 alfajor",45),)),
  ("Brownie", "Dulces", None, g(466,6,50,27), P(("1 cuadrado",56),)),
  ("Galletas dulces", "Dulces", "vainilla obleas", g(480,5.5,68,20), P(("1 galleta",12),("3 galletas",36))),

  # ── bebidas ─────────────────────────────────────────────────────────────
  ("Agua mineral", "Bebidas", "con gas", g(0,0,0,0), P(("1 vaso",200),("1 botella",500))),
  ("Jugo en polvo preparado", "Bebidas", "zuko livean sobre", g(5,0,1.2,0), P(("1 vaso",200),("1 jarro",1000))),
  ("Bebida energética", "Bebidas", "red bull monster", g(45,0,11,0), P(("1 lata",250),)),
  ("Kombucha", "Bebidas", None, g(25,0,6,0), P(("1 vaso",240),)),
  ("Leche chocolatada", "Bebidas", "chocolate milo", g(83,3.2,12.8,2.4), P(("1 caja",200),)),
  ("Café con leche", "Bebidas", "latte cortado", g(42,2.2,3.3,2.2), P(("1 taza",240),)),
  ("Matcha preparado", "Bebidas", "te verde", g(3,0.3,0.3,0), P(("1 taza",240),)),
  ("Té helado", "Bebidas", "ice tea", g(30,0,7.5,0), P(("1 vaso",240),("1 botella",500))),
  ("Jugo de manzana", "Bebidas", None, g(46,0.1,11.3,0.1), P(("1 vaso",248),)),
]


def slug(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


d = json.loads(RUTA.read_text(encoding="utf-8"))
existentes = {a["id"] for a in d["alimentos"]}
nombres = {unicodedata.normalize("NFD", a["nombre"].lower()) for a in d["alimentos"]}

agregados, saltados = 0, []
for nombre, grupo, alias, por100g, porciones in NUEVOS:
    ident = f"cl-{slug(nombre)}"
    if ident in existentes or unicodedata.normalize("NFD", nombre.lower()) in nombres:
        saltados.append(nombre)
        continue
    item = {"id": ident, "nombre": nombre, "grupo": grupo, "por100g": por100g,
            "porciones": porciones}
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
