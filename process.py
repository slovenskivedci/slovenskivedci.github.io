import oyaml as yaml
import os

import glob
countries={}
institutions={}
alllst=[]

stats={
    "countries" : {},
    'man':0,
    'woman':0,
    'hindex':[],
    'affiliation': {},
    'fields': {}
      }


#os.system("rm country_*")
#os.system("rm affiliation_*")
os.system("rm _data/*yaml")


import unicodedata

def repl(text):
	return unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('UTF-8').replace(",","_").replace("(","_").replace(")","_")

# Superfields for the stats chart only. Profile "field" values stay narrow.
# First match wins. More specific keywords first.
FIELD_GROUPS = [
	('umelá inteligencia', [
		'umela inteligencia', 'optimalizac', 'strojove ucenie', 'pocitacove videnie',
		'robotika', 'strojove videnie',
	]),
	('matematika', [
		'teoria grafov', 'diferencialne rovnice', 'numericka matemat',
		'aplikovana matemat', 'matemat',
	]),
	('informatika', [
		'kvantova informac', 'distribuovane', 'bioinformatik',
		'aplikovana informatik', 'informatik', 'datova veda',
		'programovacie jazyky', 'web system', 'pocitacova grafik',
		'grafove algoritm', 'geograficke informacne', 'geovizualiz',
		'komplexne a adaptivne', 'komplexne system',
	]),
	('biológia', [
		'fyziologia rastlin', 'fyziologia zivocich', 'fyziologia buniek',
		'neurobiologia rastlin', 'genetika drevin', 'genetika a molekular',
	]),
	('fyzika', ['termodynam', 'fyzika polymer']),
	('medicína', [
		'mikrobiol', 'lekarska biol', 'genetika rakoviny',
		'kardiovaskularna genetik', 'molekularna biomedicin',
		'lekarska fyz', 'lekarska biochem', 'lakarska chem',
		'behavioralna medic', 'verejne zdravot', 'interna medic',
		'medicinske zobraz', 'vyvoj lieciv', 'reprodukcne zdrav',
		'neuroimun', 'neurogenetik', 'neuroved', 'neurol',
		'kardio', 'onko', 'imunol', 'virol', 'farmak', 'epidemiol',
		'patofyziol', 'patol', 'hematol', 'radiol',
		'oftalm', 'pediatr', 'reumat', 'biomedicin',
		'toxikol', 'hygien', 'fyziologia', 'imun', 'genetik',
	]),
	('biológia', [
		'fyziologia rastlin', 'fyziologia zivocich', 'fyziologia buniek',
		'neurobiologia rastlin', 'biotechnolog', 'biosenzor',
		'rastlinna', 'biologia rastlin', 'botanik', 'entomol',
		'paleobiol', 'fytolog', 'biogeograf', 'fylogenom',
		'vegetacna', 'behavioralna ekolog', 'ekolog',
		'biologia ryb', 'reprodukcna biol', 'reproduktivna',
		'biologia reprodukcie', 'synteza protein', 'genova expres',
		'genetika drevin', 'molekularna a bunkova', 'molekularna biol',
		'genetika a molekular', 'lesnictvo', 'fyzika dreva', 'chemia dreva',
		'biologia',
	]),
	('geovedy', [
		'geofyz', 'geochem', 'strukturalna geol', 'geol', 'hydrol',
		'geochronol', 'seizmol', 'vulkanol', 'oceanograf', 'klimatick',
	]),
	('inžinierstvo', [
		'chemicke inzinier', 'elektrotechnik', 'elektronik',
		'energetik', 'environmentalne inzinier', 'vyrobne technolog',
		'kolajove vozidl', 'aplikovana mechanik', 'telekomunik',
		'potravinarska technolog', 'organicka technolog',
		'automatizac', 'kybernet', 'bezdrotove siete',
	]),
	('fyzika', ['fyzika polymer', 'termodynam']),
	('chémia', [
		'biochem', 'fyzikalna chem', 'anorgan', 'organick',
		'analyticka chem', 'makromolekular', 'teoreticka chem',
		'environmentalna chem', 'farmaceuticka chem', 'materialova chem',
		'medicinalna chem', 'polymer', 'vypoctova chem', 'vypoctova katalyz',
		'mechanochem', 'krystalograf', 'ilove mineral', 'biopolymer',
		'membran', 'chemick', 'chem',
	]),
	('fyzika', [
		'fyzika polymer', 'termodynam', 'subjadr', 'tuhych latok',
		'kondenzovanych', 'fyzika castic', 'fyzika neutr', 'fyzika plazm',
		'elektronova a plazmov', 'fyzika magnet', 'fyzika makkych',
		'fyzika pevnych', 'experimentalna fyz', 'teoreticka fyz',
		'aplikovana fyz', 'matematicka fyz', 'kvantov',
		'astronom', 'nanooptik', 'fotonik', 'optika',
		'fotovolta', 'fotovolt', 'supravodic',
		'magneticka rezonanc', 'nuklearna magneticka',
		'fyzik', 'jadr',
	]),
	('materiály', [
		'nanomaterial', 'nanotechnol', 'antibakterialne material',
		'opticke material', 'materialova veda', 'materialy', 'material',
	]),
	('ekonómia a manažment', [
		'medzinarodna ekon', 'polnohospodarska ekon', 'ekon',
		'financny manazment', 'manazment', 'logistik',
	]),
	('spoločenské vedy', [
		'kognitivna psycholog', 'socialna psycholog', 'psycholog',
		'sociolog', 'predskolska pedagog', 'rane detstvo',
		'cudzie jazyky',
	]),
]

def _has_ai_token(norm):
	# whole-token 'ai' only; avoid substring false positives
	padded = ' ' + norm.replace('/', ' ').replace('_', ' ').replace('-', ' ') + ' '
	return ' ai ' in padded

def field_group(field):
	raw = field if field is not None else ""
	if str(raw).strip() == "":
		return 'ostatné'
	norm = repl(str(raw)).lower()
	for label, keys in FIELD_GROUPS:
		for key in keys:
			if key in norm:
				return label
	if _has_ai_token(norm):
		return 'umelá inteligencia'
	return 'ostatné'

for y in glob.glob("./people/*.yaml"):
	print(y)
	with open(y) as f:
		dic = yaml.safe_load(f)

		if int(dic['hindex']) < 30:
			continue

		if dic['country'] not in countries:
			countries[dic['country']] = []

		if dic['affiliation'] not in institutions:
			institutions[dic['affiliation']] = []

		dic["countryurl"]=repl(dic["country"].replace(" ","_"))
		dic["fieldurl"]=repl(dic["field"].replace(" ","_"))
		dic["area"]=field_group(dic.get("field") or "")
		dic["areaurl"]=repl(dic["area"].replace(" ","_"))
		dic["positionurl"]=repl(dic["position"].replace(" ","_"))
		dic["affiliationurl"]=repl(dic["affiliation"].replace(" ","_"))
		dic["cityurl"]=repl(dic["city"].replace(" ","_"))
		dic["sexurl"]=repl(dic["sex"].replace(" ","_"))

		dic["last"]=repl(dic["last"])
		
		links=dic['links']
		links=[ [k, links[k]] for k in links]

		links = sorted(links, key=lambda kv: kv[0].lower())

		dic['links'] = links

		try:
			  if len(dic["sex"] )==3:
				  stats["man"]+=1
			  else:
				  stats["woman"]+=1
		except:
			print("Error in SEX in ",y,"SEX = ",dic["sex"],"LENGTH = ", len(dic["sex"]))


		institutions[dic['affiliation']].append(dic)

		if dic["country"] not in stats["countries"]:
			stats["countries"][dic["country"]] = 0
		if dic["affiliation"] not in stats["affiliation"]:
			stats["affiliation"][dic["affiliation"]] = 0
		stats["countries"][dic["country"]] += 1
		stats["affiliation"][dic["affiliation"]] += 1
		field = dic.get("field") or ""
		group = field_group(field)
		if group not in stats["fields"]:
			stats["fields"][group] = []
		stats["fields"][group].append(int(dic['hindex']))
		if "field_members" not in stats:
			stats["field_members"] = {}
		if group not in stats["field_members"]:
			stats["field_members"][group] = []
		label = str(field).strip() or "neuvedené"
		if label not in stats["field_members"][group]:
			stats["field_members"][group].append(label)
		stats["hindex"].append(int(dic['hindex']))

		countries[dic['country']].append(dic)
		alllst.append(dic)





alllst = sorted(alllst,key= lambda e: (-int(e['hindex']), e['last'] ))
with open(r'_data/all.yaml', 'w') as file:
	documents = yaml.dump(alllst, file)


import numpy as np

hindexes = stats['hindex']
max_h = max(hindexes)
# Regular decades; last bin ends at the current max h-index.
# Histogram edges go to the next multiple of 10 after max (269 -> 270).
top_edge = (max_h // 10 + 1) * 10
edges = list(range(30, top_edge + 1, 10))

xcount = "["
for i, lo in enumerate(edges[:-1]):
    hi = max_h if i == len(edges) - 2 else edges[i+1] - 1
    xcount += "'"+str(lo)+"-"+str(hi)+"',"
xcount += "]"
stats["hindex_hist_x"] = xcount

stats["hindex_hist_count"] = [int(e) for e in np.histogram(hindexes, bins=edges)[0]]
stats["hindex_hist_count"] = "["+",".join([str(e) for e in stats["hindex_hist_count"]])+"]"

print(stats["hindex_hist_x"],stats["hindex_hist_count"])


def parse_year(val):
    if val is None or val == '':
        return None
    if isinstance(val, int):
        return val
    try:
        return int(val)
    except (TypeError, ValueError):
        return None

years = []
unknown_years = 0
year_hindex_points = []
for person in alllst:
    y = parse_year(person.get('year'))
    if y is None:
        unknown_years += 1
    else:
        years.append(y)
        year_hindex_points.append("{x:%d,y:%d}" % (y, int(person['hindex'])))

if years:
    max_year = max(years)
    min_year = min(years)
    floor_decade = (min_year // 10) * 10
    top_edge = (max_year // 10 + 1) * 10
    year_edges = list(range(floor_decade, top_edge + 1, 10))

    yxcount = "["
    for i, lo in enumerate(year_edges[:-1]):
        hi = max_year if i == len(year_edges) - 2 else year_edges[i+1] - 1
        yxcount += "'"+str(lo)+"-"+str(hi)+"',"
    yxcount += "'neuvedený',"
    yxcount += "]"
    stats["year_hist_x"] = yxcount

    year_counts = [int(e) for e in np.histogram(years, bins=year_edges)[0]]
    year_counts.append(unknown_years)
    stats["year_hist_count"] = "["+",".join([str(e) for e in year_counts])+"]"
else:
    stats["year_hist_x"] = "['neuvedený',]"
    stats["year_hist_count"] = "["+str(unknown_years)+"]"

stats["year_hindex_xy"] = "["+",".join(year_hindex_points)+"]"

print(stats["year_hist_x"], stats["year_hist_count"])
print("scatter", len(year_hindex_points), "unknown", unknown_years, "people", len(alllst))



d = stats["countries"]
d = sorted([(k,d[k]) for k in d],  key = lambda e: (-e[1],repl(e[0])))
countries = "["+ ",".join(["'"+str(e[0])+"'" for e in d])+"]"
countriesCount ="["+ ",".join([str(e[1]) for e in d])+"]"

stats["country"]=countries
stats["countryCount"]=countriesCount



d = stats["affiliation"]
d = sorted([(k,d[k]) for k in d],  key = lambda e: (-e[1],repl(e[0])))
affiliation = "["+ ",".join(["'"+str(e[0])+"'" for e in d])+"]"
affiliationCount ="["+ ",".join([str(e[1]) for e in d])+"]"

stats["affiliation"]=affiliation
stats["affiliationCount"]=affiliationCount


d = stats["fields"]
rows = []
for name, hs in d.items():
	n = len(hs)
	mn = min(hs)
	mx = max(hs)
	avg = round(sum(hs) / float(n), 1)
	rows.append((name, n, mn, avg, mx))
rows = sorted(rows, key=lambda e: (-e[1], repl(e[0]).lower()))

def _js_str(s):
	return "'"+str(s).replace("'","\\'")+"'"

def _js_num(v):
	if isinstance(v, float):
		return ("%.1f" % v)
	return str(v)

odbor = "["+ ",".join([_js_str(e[0]) for e in rows])+"]"
odborCount ="["+ ",".join([str(e[1]) for e in rows])+"]"
odborMin ="["+ ",".join([_js_num(e[2]) for e in rows])+"]"
odborAvg ="["+ ",".join([_js_num(e[3]) for e in rows])+"]"
odborMax ="["+ ",".join([_js_num(e[4]) for e in rows])+"]"

stats["odbor"]=odbor
stats["odborCount"]=odborCount
stats["odborMin"]=odborMin
stats["odborAvg"]=odborAvg
stats["odborMax"]=odborMax

odbor_key = []
members = stats.get("field_members") or {}
for e in rows:
	names = sorted(members.get(e[0], []), key=lambda s: repl(s).lower())
	odbor_key.append({"area": e[0], "fields": names})
stats["odbor_key"] = odbor_key
stats.pop("field_members", None)

print("odbor groups", len(rows), "sum n", sum(e[1] for e in rows))
for e in rows[:8]:
	print("odbor top", e[0], "n", e[1], "min", e[2], "avg", e[3], "max", e[4])


PLACE_LABELS = ["Slovensko", "zahraničie"]
place_h = {k: [] for k in PLACE_LABELS}
for person in alllst:
	c = str(person.get("country") or "").strip()
	bucket = "Slovensko" if c == "Slovensko" else PLACE_LABELS[1]
	place_h[bucket].append(int(person["hindex"]))

place_rows = []
for name in PLACE_LABELS:
	hs = place_h[name]
	n = len(hs)
	if n == 0:
		place_rows.append((name, 0, 0, 0.0, 0))
	else:
		place_rows.append((name, n, min(hs), round(sum(hs) / float(n), 1), max(hs)))

stats["place"] = "[" + ",".join([_js_str(e[0]) for e in place_rows]) + "]"
stats["placeCount"] = "[" + ",".join([str(e[1]) for e in place_rows]) + "]"
stats["placeMin"] = "[" + ",".join([_js_num(e[2]) for e in place_rows]) + "]"
stats["placeAvg"] = "[" + ",".join([_js_num(e[3]) for e in place_rows]) + "]"
stats["placeMax"] = "[" + ",".join([_js_num(e[4]) for e in place_rows]) + "]"
print("place", [(e[0], e[1], e[2], e[3], e[4]) for e in place_rows])


 
with open(r'_data/page.yaml', 'w') as file:
	documents = yaml.dump(stats, file)
 



'''
for k in countries:
	countries[k] = sorted(countries[k],key= lambda e: -int(e['hindex']))
	countrycode = repl(k.replace(" ","_"))
	with open(r'_data/country_%s.yaml'%countrycode, 'w') as file:
			documents = yaml.dump(countries[k], file)

	os.system("sed 's/DATAFILE/country_%s/g' template.style > country_%s.html"%(countrycode,countrycode))




for k in institutions:
	institutions[k] = sorted(institutions[k],key= lambda e: -int(e['hindex']))
	affcode = repl(k.replace(" ","_"))
	print(affcode)

	with open(r'_data/institution_%s.yaml'%affcode, 'w') as file:
			documents = yaml.dump(institutions[k], file)
	os.system("sed 's/DATAFILE/institution_%s/g' template.style > affiliation_%s.html"%(affcode,affcode))

os.system("sed 's/DATAFILE/all/g' template.style > index.html")
'''
