import oyaml as yaml
with open("_data/page.yaml") as f:
    p = yaml.safe_load(f)
for k in ["odbor","odborCount","odborMin","odborAvg","odborMax","hindex_hist_x","hindex_hist_count","year_hist_x","year_hist_count","seniority_xy"]:
    v = p[k]
    print("====", k, "type", type(v).__name__, "len", len(v))
    print(v[:120] + ("..." if len(v)>120 else ""))
# parse arrays
import ast
labels = ast.literal_eval(p["odbor"])
mins = ast.literal_eval(p["odborMin"])
avgs = ast.literal_eval(p["odborAvg"])
maxs = ast.literal_eval(p["odborMax"])
cnts = ast.literal_eval(p["odborCount"])
print("n_groups", len(labels), len(mins), len(avgs), len(maxs), len(cnts))
print("sum_n", sum(cnts))
ok = all(mn <= av <= mx for mn,av,mx in zip(mins,avgs,maxs))
print("min<=avg<=max", ok)
print("first8")
for i in range(8):
    print(labels[i], cnts[i], mins[i], avgs[i], maxs[i])
# leftover samples
print("leftover examples:")
known = set(["neurológia","kardiológia","onkológia","imunológia","virológia","mikrobiológia","farmakológia","epidemiológia","fyziológia","patológia","hydrológia","geológia","ekonómia","manažment","umelá inteligencia","informatika","matematika","biochémia","biofyzika","biotechnológia","molekulárna biológia","rastlinná biológia","ekológia","materiálová veda","chémia","fyzika","biológia","ostatné"])
for lab,c in zip(labels,cnts):
    if lab not in known:
        print(" ", c, lab)
