

import oyaml as yaml
import os
#from serpapi import GoogleSearch
import glob
import pickle 
from datetime import datetime, timedelta





import requests

 

for y in glob.glob("./config/conf.yaml"):
	with open(y) as f: conf = yaml.safe_load(f)


import numpy as np
KEY = np.random.randint(8)

 
payload = {'api_key': conf['apikey%d'%KEY],
  'url': 'URL'}
print("USING KEY %d"%KEY)

def getHIndex(resp):
	data = resp
	dat = data.split("h-index</a></td><td class=")[1]
	dat = dat.split(">")[1]
	dat = dat.split("<")[0]
	return dat







 



people=[]
for y in glob.glob("./people/*.yaml"):
	with open(y) as f:
		dic = yaml.safe_load(f)
		if "last_update" not in dic:
			dic["last_update"]="2020-12-31"
			with open(y, 'w') as file:
			   documents = yaml.dump(dic, file)
		people.append([y,dic])
		
people = sorted(people, key = lambda kv: kv[1]["last_update"])


CONTINUE = True

for kv in people: # we start updating the last updated person
	y, dic = kv

	last_update_str = dic.get("last_update")
	if last_update_str:
		last_update = datetime.strptime(last_update_str, '%Y-%m-%d')
		if datetime.today() - last_update < timedelta(days=7) and dic.get("update_status") != "ERROR":
			continue

	try:
		print("\n\n processing....")
		print("BEFORE",y, dic["hindex"])
		url = dic["scholar"]
		
		
		if "hl=en&amp;" in url:
			print('correcting url',url)
			url = url.replace("hl=en&amp;","hl=en&")  
			
		if "&amp;hl=sk" in url:
			print('correcting url',url)
			url = url.replace("&amp;hl=sk","&hl=en")  
		if "hl=sk&amp;" in url:
			print('correcting url',url)
			url = url.replace("hl=sk&amp;","hl=en&")  
				
		if "hl=" not in url:
			url = url+"&hl=en"
			
			
		if "&amp;" in url:
			url = url.replace("&amp;","&")  
			
			
		
		payload['url']=url
		resp = requests.get('http://api.scraperapi.com', params=payload)
		resp = resp.text
		 
		
		hindex = int(getHIndex(resp))
		
		print("AFTER",y, hindex)
		 
		
		dic["hindex"] =  hindex
		if  dic["hindex"] < 25:
					
					print(y)
					print(hindex)
					pickle.dump(results,open("/tmp/debug.pkl","wb"))
					print(payload)
					print("error", y); die		
		
		
		
		 
		dic["last_update"] = datetime.today().strftime('%Y-%m-%d')
		dic["update_status"] = 'UPDATED'
		
		 
	 
		with open(y, 'w') as file:
			documents = yaml.dump(dic, file) 
		 
		




	except:
		print("erro",y)


		# You have exhausted the API Credits available in this monthly cycle. You can upgrade your subscription or enable overages from your dashboard (https://dashboard.scraperapi.com/billing). For custom plan upgrades, please contact support (https://www.scraperapi.com/support/).
		if "exhausted the API Credits" in resp:
			CONTINUE = False
			print("hitting limit")
		elif "Unauthorized" in resp:
			CONTINUE = False
			print("unauthorized - wrong key")
			 		
		else:
			
			print(resp)
			print("\n\n")
			print(url)
			
			dic["last_update"] = datetime.today().strftime('%Y-%m-%d')
			dic["update_status"] = 'ERROR'
			with open(y, 'w') as file:
				documents = yaml.dump(dic, file) 
		
		
	 
	if not CONTINUE:
		break


 
'''
				
				print(dic)
				afafafsafsafsas
'''
	
