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
    'affiliation': {}
      }


#os.system("rm country_*")
#os.system("rm affiliation_*")
os.system("rm _data/*yaml")


import unicodedata

def repl(text):
	return unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('UTF-8').replace(",","_").replace("(","_").replace(")","_")

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
