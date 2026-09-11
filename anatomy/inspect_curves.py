import bpy,json,os
out=os.path.dirname(os.path.abspath(__file__))
items=[]
for o in bpy.data.objects:
    if o.type=='CURVE': items.append({'name':o.name,'collections':[c.name for c in o.users_collection],'bevel':o.data.bevel_depth,'resolution':o.data.resolution_u,'modifiers':[(m.name,m.type) for m in o.modifiers]})
with open(os.path.join(out,'source','curves.json'),'w',encoding='utf8') as f:json.dump(items,f,ensure_ascii=False,indent=2)
print('CURVES',len(items));print(items[:5])
