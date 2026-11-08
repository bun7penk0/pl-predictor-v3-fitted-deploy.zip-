import json, urllib.request, collections, math

# โหลดสกอร์จริงจาก openfootball
url = "https://raw.githubusercontent.com/openfootball/football.json/master/2025-26/en.1.json"
data = json.loads(urllib.request.urlopen(url).read())

matches = []
for m in data.get("matches", []):
    try:
        h = m["team1"]["name"]; a = m["team2"]["name"]
        hg = int(m["score"]["ft"][0]); ag = int(m["score"]["ft"][1])
        matches.append((h, a, hg, ag))
    except: pass

# แปลงชื่อทีมเป็นโค้ด
CODE = {"Arsenal":"ARS","Man City":"MCI","Liverpool":"LIV","Aston Villa":"AVL","Newcastle":"NEW","Tottenham":"TOT","Chelsea":"CHE","West Ham":"WHU","Crystal Palace":"CRY","Man United":"MUN","Wolves":"WOL","Brentford":"BRE","Everton":"EVE","Brighton":"BHA","Nottm Forest":"NFO","Ipswich":"IPS","Leicester":"LEI","Bournemouth":"BOU","Southampton":"SOU","Fulham":"FUL"}

teams = list(CODE.values())
attack = {t:1.0 for t in teams}
defense = {t:1.0 for t in teams}
homeAdv = 1.30

# MLE 26 iter แบบเดียวกับในเว็บ
for _ in range(26):
    for h,a,hg,ag in matches:
        hc = CODE.get(h); ac = CODE.get(a)
        if not hc or not ac: continue
        lh = attack[hc]*defense[ac]*homeAdv
        la = attack[ac]*defense[hc]
        attack[hc] *= (hg/lh if lh>0 else 1) ** 0.05
        defense[ac] *= (hg/lh if lh>0 else 1) ** 0.05
        attack[ac] *= (ag/la if la>0 else 1) ** 0.05
        defense[hc] *= (ag/la if la>0 else 1) ** 0.05
    ma = sum(attack.values())/len(attack)
    for t in teams: attack[t]/=ma; defense[t]*=ma

out = {"version":"v3-fitted","rho":0.10,"homeAdvantage":homeAdv,"teams":{},"matches":len(matches),"source":"openfootball auto"}
for t in teams:
    out["teams"][t] = {"attack":round(attack[t],4),"defense":round(defense[t],4),"score":80}

json.dump(out, open("pl-fitted-params.json","w"), indent=2)
print(f"done {len(matches)} matches")
