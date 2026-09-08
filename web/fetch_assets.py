from pathlib import Path
import json, urllib.request, concurrent.futures
OUT=Path(__file__).resolve().parent/'assets'
OUT.mkdir(exist_ok=True)
HEADERS={'User-Agent':'Mozilla/5.0','Accept':'application/json'}
def get(url):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=75) as response:return response.read()
def api(url):return json.loads(get(url))
def texture(asset,prefix):
    data=api('https://api.polyhaven.com/files/'+asset)
    results=[]
    for aliases,label in [(['diff','Diffuse','diffuse'],'color'),(['nor_gl'],'normal'),(['rough','Rough'],'rough')]:
        channel=next((key for key in aliases if key in data),None)
        if not channel:continue
        entry=data[channel].get('1k',data[channel].get('2k'))
        fmt='jpg' if 'jpg' in entry else 'png'
        target=OUT/(prefix+'-'+label+'.'+fmt)
        if not target.exists():target.write_bytes(get(entry[fmt]['url']))
        results.append({'channel':label,'file':target.name,'bytes':target.stat().st_size})
    return {'source':'https://polyhaven.com/a/'+asset,'license':'CC0','asset':asset,'maps':results}
def main():
    assets=api('https://api.polyhaven.com/assets?t=textures')
    print('AVAILABLE',json.dumps({k:v.get('name') for k,v in assets.items() if any(q in k for q in ['forest_ground','aerial_grass','roof','bark','wood_plank','brown_mud'])},ensure_ascii=False),flush=True)
    requests=[('mossy_stone_wall','stone'),('worn_mossy_plasterwall','plaster'),('aerial_grass_rock','ground'),('brown_mud_leaves_01','soil'),('bark_brown_01','bark'),('grey_roof_tiles','roof'),('wood_planks_grey','wood')]
    sources=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs={pool.submit(texture,asset,prefix):asset for asset,prefix in requests if asset in assets}
        for future,asset in jobs.items():
            try:sources.append(future.result());print('TEXTURE_OK',asset,flush=True)
            except Exception as e:print('TEXTURE_ERROR',asset,str(e),flush=True)
    (OUT/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
