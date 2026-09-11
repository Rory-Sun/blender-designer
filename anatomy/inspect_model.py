import bpy, json, os
from collections import Counter
out = os.path.dirname(os.path.abspath(__file__))
data = []
for o in bpy.data.objects:
    if o.type == 'MESH':
        data.append({'name':o.name,'vertices':len(o.data.vertices),'faces':len(o.data.polygons),'collections':[c.name for c in o.users_collection],'dimensions':list(o.dimensions),'location':list(o.location),'materials':[m.name if m else '' for m in o.data.materials]})
with open(os.path.join(out,'source','inventory.json'),'w',encoding='utf8') as f: json.dump(data,f,ensure_ascii=False,indent=2)
print('MESHES',len(data),'FACES',sum(o['faces'] for o in data))
print('COLLECTIONS',Counter(c for o in data for c in o['collections']))
print('SAMPLE',data[:3])
