"""Our statements for "What a Probe Reads": Marks & Tegmark's constructions, rebuilt from sources we can redistribute.

cities / neg_cities follow Marks & Tegmark's recipe (Geometry of Truth, App. H): "The city of [city] is in [country]."
from the GeoNames list of world cities (CC BY 4.0, https://www.geonames.org), keeping cities with population > 500,000
whose name no other city in the list shares (GeoNames' cities15000 here), located in widely recognized countries (we use
the 193 UN member states) and not city-states. One true and one false statement per city, the false country drawn with
probability equal to its frequency among the true statements (so that sentences ending in "China" aren't mostly true).
Our additions: cities whose name contains their country's name, or is contained in it, are dropped ("Kuwait City",
"Tunis"), because the text alone would give the answer away; the running example, Krasnodar, is row 0 (true) and row 1
(false). neg_cities negates every statement with "not" (row i is the twin of row i, labels flipped).

sp_en_trans / neg_sp_en_trans: "The Spanish word '[word]' means '[English word]'." from our own list of common Spanish
words with one clear sense each. Unlike Marks & Tegmark (each word once, half true), every word appears twice, once with
its translation and once with another word's, the same paired design as the cities.

    uv run python projects/probes/data/statements.py          # writes data/run/data/*.csv
"""
import csv, io, urllib.request, zipfile
from collections import Counter
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
OUT = HERE / "run" / "data"
CACHE = HERE.parent / "build" / "geonames"
GEONAMES = "https://download.geonames.org/export/dump/"

# the 193 UN member states (ISO 3166-1 alpha-2)
UN = set("""AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO
KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID
IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM
NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA
SS ES LK SD SR SE CH SY TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW""".split())
CITY_STATES = {"SG", "MC", "SM"}
# how the country is named in running English text (GeoNames' short names, with "the" where English uses it)
NAME = {"US": "the United States", "GB": "the United Kingdom", "PH": "the Philippines", "DO": "the Dominican Republic",
        "CD": "the Democratic Republic of the Congo", "CG": "the Republic of the Congo", "AE": "the United Arab Emirates",
        "CF": "the Central African Republic", "CZ": "the Czech Republic", "NL": "the Netherlands", "GM": "the Gambia",
        "BS": "the Bahamas"}

SPANISH = [  # (Spanish word, its English translation); every English side distinct, one clear sense per word
    ("uno", "one"), ("dos", "two"), ("tres", "three"), ("cuatro", "four"), ("cinco", "five"), ("seis", "six"),
    ("siete", "seven"), ("ocho", "eight"), ("nueve", "nine"), ("diez", "ten"), ("once", "eleven"), ("doce", "twelve"),
    ("veinte", "twenty"), ("cien", "one hundred"), ("mil", "thousand"),
    ("rojo", "red"), ("azul", "blue"), ("verde", "green"), ("amarillo", "yellow"), ("negro", "black"), ("blanco", "white"),
    ("gris", "gray"), ("morado", "purple"),
    ("lunes", "Monday"), ("martes", "Tuesday"), ("jueves", "Thursday"), ("viernes", "Friday"), ("domingo", "Sunday"),
    ("enero", "January"), ("abril", "April"), ("mayo", "May"), ("junio", "June"), ("agosto", "August"),
    ("perro", "dog"), ("gato", "cat"), ("caballo", "horse"), ("vaca", "cow"), ("cerdo", "pig"), ("oveja", "sheep"),
    ("cabra", "goat"), ("gallina", "hen"), ("pato", "duck"), ("pájaro", "bird"), ("pez", "fish"), ("ratón", "mouse"),
    ("conejo", "rabbit"), ("oso", "bear"), ("lobo", "wolf"), ("zorro", "fox"), ("mono", "monkey"), ("serpiente", "snake"),
    ("rana", "frog"), ("tortuga", "turtle"), ("abeja", "bee"), ("hormiga", "ant"), ("mariposa", "butterfly"),
    ("araña", "spider"), ("ballena", "whale"), ("tiburón", "shark"), ("águila", "eagle"), ("búho", "owl"),
    ("ciervo", "deer"), ("burro", "donkey"), ("toro", "bull"), ("gusano", "worm"),
    ("cabeza", "head"), ("mano", "hand"), ("pie", "foot"), ("ojo", "eye"), ("oreja", "ear"), ("nariz", "nose"),
    ("boca", "mouth"), ("diente", "tooth"), ("brazo", "arm"), ("pierna", "leg"), ("dedo", "finger"), ("rodilla", "knee"),
    ("hombro", "shoulder"), ("corazón", "heart"), ("sangre", "blood"), ("hueso", "bone"), ("piel", "skin"),
    ("pelo", "hair"), ("cuello", "neck"), ("codo", "elbow"), ("labio", "lip"), ("cara", "face"), ("barba", "beard"),
    ("madre", "mother"), ("padre", "father"), ("hermano", "brother"), ("hermana", "sister"), ("hijo", "son"),
    ("hija", "daughter"), ("abuelo", "grandfather"), ("abuela", "grandmother"), ("tío", "uncle"), ("tía", "aunt"),
    ("esposo", "husband"), ("hombre", "man"), ("amigo", "friend"), ("vecino", "neighbor"),
    ("pan", "bread"), ("agua", "water"), ("leche", "milk"), ("queso", "cheese"), ("huevo", "egg"), ("carne", "meat"),
    ("arroz", "rice"), ("manzana", "apple"), ("plátano", "banana"), ("uva", "grape"), ("fresa", "strawberry"),
    ("sal", "salt"), ("azúcar", "sugar"), ("mantequilla", "butter"), ("miel", "honey"), ("sopa", "soup"),
    ("cebolla", "onion"), ("ajo", "garlic"), ("zanahoria", "carrot"), ("galleta", "cookie"), ("vino", "wine"),
    ("cerveza", "beer"), ("hielo", "ice"), ("cereza", "cherry"), ("pera", "pear"), ("sandía", "watermelon"),
    ("casa", "house"), ("puerta", "door"), ("ventana", "window"), ("mesa", "table"), ("silla", "chair"), ("cama", "bed"),
    ("libro", "book"), ("llave", "key"), ("espejo", "mirror"), ("cuchillo", "knife"), ("cuchara", "spoon"),
    ("tenedor", "fork"), ("plato", "plate"), ("taza", "cup"), ("botella", "bottle"), ("caja", "box"), ("papel", "paper"),
    ("lápiz", "pencil"), ("tijeras", "scissors"), ("jabón", "soap"), ("toalla", "towel"), ("almohada", "pillow"),
    ("martillo", "hammer"), ("cuerda", "rope"), ("campana", "bell"), ("rueda", "wheel"), ("sombrero", "hat"),
    ("zapato", "shoe"), ("camisa", "shirt"), ("falda", "skirt"), ("abrigo", "coat"), ("guante", "glove"),
    ("paraguas", "umbrella"),
    ("sol", "sun"), ("luna", "moon"), ("estrella", "star"), ("nube", "cloud"), ("lluvia", "rain"), ("nieve", "snow"),
    ("viento", "wind"), ("mar", "sea"), ("río", "river"), ("lago", "lake"), ("montaña", "mountain"), ("bosque", "forest"),
    ("árbol", "tree"), ("flor", "flower"), ("arena", "sand"), ("isla", "island"), ("playa", "beach"), ("fuego", "fire"),
    ("calle", "street"), ("puente", "bridge"), ("iglesia", "church"), ("escuela", "school"), ("granja", "farm"),
    ("castillo", "castle"), ("torre", "tower"),
    ("rey", "king"), ("reina", "queen"), ("ladrón", "thief"), ("juez", "judge"), ("abogado", "lawyer"),
    ("panadero", "baker"), ("soldado", "soldier"), ("cantante", "singer"),
    ("grande", "big"), ("pequeño", "small"), ("nuevo", "new"), ("viejo", "old"), ("joven", "young"), ("bueno", "good"),
    ("malo", "bad"), ("caliente", "hot"), ("frío", "cold"), ("feliz", "happy"), ("triste", "sad"), ("lento", "slow"),
    ("débil", "weak"), ("sucio", "dirty"), ("lleno", "full"), ("vacío", "empty"), ("pesado", "heavy"), ("dulce", "sweet"),
    ("amargo", "bitter"), ("oscuro", "dark"), ("feo", "ugly"), ("cansado", "tired"), ("perezoso", "lazy"),
    ("barato", "cheap"), ("caro", "expensive"), ("fácil", "easy"),
    ("comer", "to eat"), ("beber", "to drink"), ("dormir", "to sleep"), ("correr", "to run"), ("caminar", "to walk"),
    ("hablar", "to speak"), ("escribir", "to write"), ("leer", "to read"), ("cantar", "to sing"), ("bailar", "to dance"),
    ("nadar", "to swim"), ("comprar", "to buy"), ("vender", "to sell"), ("abrir", "to open"), ("cerrar", "to close"),
    ("llorar", "to cry"), ("saltar", "to jump"), ("olvidar", "to forget"), ("aprender", "to learn"),
    ("enseñar", "to teach"), ("ayudar", "to help"), ("romper", "to break"), ("construir", "to build"),
    ("encontrar", "to find"), ("vivir", "to live"), ("morir", "to die"), ("viajar", "to travel"), ("gritar", "to shout"),
    ("besar", "to kiss"), ("oler", "to smell"),
    ("día", "day"), ("noche", "night"), ("semana", "week"), ("año", "year"), ("invierno", "winter"),
    ("verano", "summer"), ("dinero", "money"), ("guerra", "war"), ("paz", "peace"), ("miedo", "fear"),
    ("coche", "car"), ("tren", "train"), ("avión", "airplane"), ("bicicleta", "bicycle"), ("camión", "truck"),
]


def fetch(name):
    CACHE.mkdir(parents=True, exist_ok=True)
    p = CACHE / name
    if not p.exists():
        urllib.request.urlretrieve(GEONAMES + name, p)
    return p


def cities():
    z = zipfile.ZipFile(fetch("cities15000.zip"))
    rows = [l.split("\t") for l in io.TextIOWrapper(z.open("cities15000.txt"), encoding="utf-8").read().splitlines()]
    countries = {}
    for l in fetch("countryInfo.txt").read_text(encoding="utf-8").splitlines():
        if not l.startswith("#"):
            f = l.split("\t")
            countries[f[0]] = f[4]
    name_count = Counter(r[2] for r in rows)                       # asciiname, across every city in the list
    keep = []
    for r in rows:
        city, cc, pop = r[2], r[8], int(r[14] or 0)
        if pop <= 500_000 or name_count[city] != 1 or cc not in UN or cc in CITY_STATES:
            continue
        country = NAME.get(cc, countries[cc])
        a, b = city.lower(), country.lower().removeprefix("the ")
        if a in b or b in a:
            continue
        keep.append((city, country))
    keep.sort()
    k = next(i for i, (c, _) in enumerate(keep) if c == "Krasnodar")
    keep.insert(0, keep.pop(k))
    freq = Counter(c for _, c in keep)
    names = sorted(freq)
    p = np.array([freq[c] for c in names], dtype=float)
    rng = np.random.default_rng(2026)
    out = []
    for city, country in keep:
        q = p * (np.array(names) != country)
        wrong = names[rng.choice(len(names), p=q / q.sum())]
        out.append((city, country, 1, country))
        out.append((city, wrong, 0, country))
    return out


def write(name, header, rows):
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / f"{name}.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"{name}: {len(rows)} statements")


if __name__ == "__main__":
    C = cities()
    hdr = ["statement", "label", "city", "country", "correct_country"]
    write("cities", hdr, [(f"The city of {c} is in {k}.", y, c, k, t) for c, k, y, t in C])
    write("neg_cities", hdr, [(f"The city of {c} is not in {k}.", 1 - y, c, k, t) for c, k, y, t in C])
    print(f"   {len(C) // 2} cities in {len({t for *_, t in C})} countries; Krasnodar's false twin: {C[1][1]}")
    assert len({e for _, e in SPANISH}) == len(SPANISH) and len({s for s, _ in SPANISH}) == len(SPANISH)
    rng = np.random.default_rng(2027)
    en = [e for _, e in SPANISH]
    sp = []
    for s, e in SPANISH:
        wrong = rng.choice([x for x in en if x != e])
        sp += [(s, e, 1), (s, wrong, 0)]
    write("sp_en_trans", ["statement", "label"], [(f"The Spanish word '{s}' means '{e}'.", y) for s, e, y in sp])
    write("neg_sp_en_trans", ["statement", "label"], [(f"The Spanish word '{s}' does not mean '{e}'.", 1 - y) for s, e, y in sp])
    print(f"   {len(SPANISH)} Spanish words")
