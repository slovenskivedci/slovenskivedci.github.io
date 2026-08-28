#!/usr/bin/env python3
"""Nominatim lookup for unique city+country pairs. Writes _data/city_coords.yaml."""
import glob
import json
import time
import urllib.parse
import urllib.request

import oyaml as yaml

UA = "slovenskivedci-stats/1.0 (https://www.slovenskivedci.sk; educational)"
NOMINATIM = "https://nominatim.openstreetmap.org/search"

COUNTRY_ISO = {
    "Slovensko": "sk",
    "USA": "us",
    "Česko": "cz",
    "Rakúsko": "at",
    "Kanada": "ca",
    "Austrália": "au",
    "Švajčiarsko": "ch",
    "Holandsko": "nl",
    "Katar": "qa",
    "Spojené arabské emiráty": "ae",
    "Saudská Arábia": "sa",
    "Nórsko": "no",
    "Švédsko": "se",
    "Nemecko": "de",
    "Dánsko": "dk",
    "Belgicko": "be",
    "Belgium": "be",
    "Veľká Británia": "gb",
    "Ruská federácia": "ru",
    "Írsko": "ie",
    "Francúzsko": "fr",
    "Japonsko": "jp",
    "Španielsko": "es",
    "Fínsko": "fi",
}

CITY_QUERY = {
    ("Viedeň", "Rakúsko"): "Vienna",
    ("Praha", "Česko"): "Prague",
    ("Filadelfia", "USA"): "Philadelphia",
    ("Antwerpy", "Belgicko"): "Antwerp",
    ("Paríž", "Francúzsko"): "Paris",
    ("Ženeva", "Švajčiarsko"): "Geneva",
    ("Londýn", "Veľká Británia"): "London",
    ("Edinburg", "Veľká Británia"): "Edinburgh",
    ("Essex/Colchester", "Veľká Británia"): "Colchester",
    ("Twin Cities", "USA"): "Minneapolis",
    ("Wakō", "Japonsko"): "Wako",
    ("Urbana-Champaign", "USA"): "Urbana",
    ("Manoa", "USA"): "Manoa",
    ("Columbia", "USA"): "Columbia",
    ("Salinas", "USA"): "Salinas",
    ("Upton", "USA"): "Upton",
    ("Gent", "Belgium"): "Ghent",
    ("Zürich", "Švajčiarsko"): "Zurich",
    ("Košice", "Slovensko"): "Kosice",
    ("Prešov", "Slovensko"): "Presov",
    ("Žilina", "Slovensko"): "Zilina",
    ("Piešťany", "Slovensko"): "Piestany",
    ("Trenčín", "Slovensko"): "Trencin",
    ("Banská Bystrica", "Slovensko"): "Banska Bystrica",
    ("Plzeň", "Česko"): "Plzen",
    ("Jülich", "Nemecko"): "Julich",
    ("Tromsø", "Nórsko"): "Tromso",
}

CITY_EXTRA = {
    ("Columbia", "USA"): "Missouri",
    ("Salinas", "USA"): "California",
    ("Upton", "USA"): "New York",
    ("Urbana-Champaign", "USA"): "Illinois",
    ("Manoa", "USA"): "Hawaii",
    ("Twin Cities", "USA"): "Minnesota",
    ("London", "Kanada"): "Ontario",
}

def load_people_cities():
    cities = {}
    for path in glob.glob("./people/*.yaml"):
        with open(path) as f:
            d = yaml.safe_load(f)
        if int(d["hindex"]) < 30:
            continue
        city = (d.get("city") or "").strip()
        country = (d.get("country") or "").strip()
        key = (city, country)
        if key not in cities:
            cities[key] = {"city": city, "country": country, "count": 0}
        cities[key]["count"] += 1
    return cities

def nominatim(params):
    q = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        NOMINATIM + "?" + q,
        headers={"User-Agent": UA, "Accept-Language": "en"},
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))

def lookup(city, country):
    iso = COUNTRY_ISO.get(country)
    queries = []
    alias = CITY_QUERY.get((city, country), city)
    extra = CITY_EXTRA.get((city, country))
    if extra:
        queries.append(alias + " " + extra)
    if alias != city:
        queries.append(alias)
    queries.append(city)
    seen = set()
    ordered = []
    for qcity in queries:
        if qcity and qcity not in seen:
            seen.add(qcity)
            ordered.append(qcity)

    last_err = None
    for qcity in ordered:
        params = {
            "format": "json",
            "limit": "1",
            "addressdetails": "1",
        }
        if iso:
            params["countrycodes"] = iso
            params["city"] = qcity
            params["featureType"] = "city"
        else:
            params["q"] = qcity + ", " + country
        try:
            data = nominatim(params)
        except Exception as e:
            last_err = str(e)
            data = []
        time.sleep(1.1)
        if not data and iso:
            try:
                data = nominatim({
                    "format": "json",
                    "limit": "1",
                    "addressdetails": "1",
                    "countrycodes": iso,
                    "q": qcity,
                })
            except Exception as e:
                last_err = str(e)
                data = []
            time.sleep(1.1)
        if data:
            hit = data[0]
            addr = hit.get("address") or {}
            cc = (addr.get("country_code") or "").lower()
            if iso and cc and cc != iso:
                continue
            return {
                "lat": float(hit["lat"]),
                "lon": float(hit["lon"]),
                "display": hit.get("display_name") or "",
                "osm_type": hit.get("osm_type") or "",
                "osm_id": hit.get("osm_id"),
                "query": qcity,
            }
    return None if last_err is None else {"error": last_err}

def main():
    people_cities = load_people_cities()
    cache_path = "_data/city_coords.yaml"
    cache = {}
    try:
        with open(cache_path) as f:
            loaded = yaml.safe_load(f) or {}
            if isinstance(loaded, dict):
                cache = loaded
    except FileNotFoundError:
        pass

    found = 0
    skipped = []
    items = sorted(people_cities.values(), key=lambda e: (-e["count"], e["city"], e["country"]))
    for i, info in enumerate(items, 1):
        key = info["city"] + " | " + info["country"]
        print("[%d/%d] %s (n=%d)" % (i, len(items), key, info["count"]), flush=True)
        rec = cache.get(key)
        if rec and rec.get("lat") is not None and rec.get("lon") is not None:
            found += 1
            print("  cache", rec["lat"], rec["lon"])
            continue
        if rec and rec.get("skip"):
            skipped.append(key)
            print("  cache skip")
            continue
        hit = lookup(info["city"], info["country"])
        if hit and "lat" in hit:
            rec = {
                "city": info["city"],
                "country": info["country"],
                "lat": hit["lat"],
                "lon": hit["lon"],
                "display": hit.get("display") or "",
                "query": hit.get("query") or info["city"],
            }
            cache[key] = rec
            found += 1
            print("  ok", rec["lat"], rec["lon"], rec["display"][:80])
        else:
            skipped.append(key)
            cache[key] = {
                "city": info["city"],
                "country": info["country"],
                "lat": None,
                "lon": None,
                "skip": True,
                "reason": (hit or {}).get("error") if isinstance(hit, dict) else "no nominatim hit",
            }
            print("  SKIP")
        with open(cache_path, "w") as f:
            yaml.dump(cache, f)

    print("FOUND", found, "SKIPPED", len(skipped))
    for s in skipped:
        print("  skip", s)

if __name__ == "__main__":
    main()
