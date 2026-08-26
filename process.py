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

# More specific keywords first. First match wins.
FIELD_GROUPS = [
	('neurológia', ['neuro']),
	('kardiológia', ['kardio']),
	('onkológia', ['onko']),
	('imunológia', ['imun']),
	('virológia', ['virol']),
	('mikrobiológia', ['mikrobiol']),
	('farmakológia', ['farmak']),
	('epidemiológia', ['epidemiol']),
	('fyziológia', ['fyziol']),  # before patológia so patofyziológia lands here
	('patológia', ['patol']),
	('hydrológia', ['hydrol']),
	('geológia', ['geol']),
	('ekonómia', ['ekon']),
	('manažment', ['manazment']),
	('umelá inteligencia', ['umela inteligencia']),
	('informatika', ['informatik']),
	('matematika', ['matemat']),
	('biochémia', ['biochem']),
	('biofyzika', ['biofyz']),
	('biotechnológia', ['biotech']),
	('molekulárna biológia', ['molekularn']),
	('rastlinná biológia', ['rastlin']),
	('ekológia', ['ekolog']),
	('materiálová veda', ['material']),
	('chémia', ['fyzikalna chem', 'anorgan', 'organick', 'chemick', 'chem']),
	('fyzika', ['subjadr', 'tuhych latok', 'kvantov', 'fyzik', 'jadr']),
	('biológia', ['biol']),
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
	return raw

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

print("odbor groups", len(rows), "sum n", sum(e[1] for e in rows))
for e in rows[:8]:
	print("odbor top", e[0], "n", e[1], "min", e[2], "avg", e[3], "max", e[4])


SENIORITY_LABELS = ['odborný asistent', 'docent', 'profesor', 'ostatné']

def seniority_bucket(position):
	p = repl(str(position or '')).lower()
	is_asistent = (
		'assistant professor' in p
		or 'odborny asistent' in p
		or 'odb. asistent' in p
		or 'asistent' in p
	)
	is_docent = ('docent' in p) or ('associate professor' in p)
	is_profesor = (
		('profesor' in p)
		or ('full professor' in p)
		or ('professor' in p and 'assistant professor' not in p and 'associate professor' not in p)
	)
	if is_profesor:
		return 'profesor'
	if is_docent:
		return 'docent'
	if is_asistent:
		return 'odborný asistent'
	return 'ostatné'

seniority_points = []
seniority_counts = {k: 0 for k in SENIORITY_LABELS}
for person in alllst:
	bucket = seniority_bucket(person.get('position'))
	seniority_counts[bucket] += 1
	seniority_points.append("{x:'%s',y:%d}" % (bucket.replace("'", "\\'"), int(person['hindex'])))

stats["seniority_xy"] = "[" + ",".join(seniority_points) + "]"
print("seniority", seniority_counts, "sum", sum(seniority_counts.values()), "people", len(alllst))


 
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
