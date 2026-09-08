"""Export the original Blender architecture/landforms as a small, batched GLB.
Vegetation is recreated as wind-animated instances by the real-time renderer.
The saved source .blend is never overwritten.
"""
import bpy, math, os, json
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent/'assets'
source=bpy.data.scenes.get('溪畔秋日 · Countryside') or bpy.context.scene
bpy.context.window.scene=source
deps=bpy.context.evaluated_depsgraph_get()
buckets={}
def classify(name):
    for prefix,key in [('湿润草岸','ground'),('浅色夯土','soil'),('斑驳灰色','stone'),('溪岸青石','rock'),('暖土墙','earthwall'),('石灰白墙','plaster'),('老木梁','wood'),('门窗暗部','dark'),('灰瓦','roof')]:
        if name.startswith(prefix):return key
    return 'stone'
included=[]
for c in source.collection.children:
    if not c.name.startswith(('01 ','02 ','03 ','04 ')):continue
    for o in c.objects:
        if o.type not in {'MESH','CURVE'}:continue
        if o.name.startswith(('蜿蜒溪流','细碎水花','溪面波光','稻叶','垂垂稻穗')):continue
        region='village' if c.name.startswith('04 ') else 'bridge' if c.name.startswith('02 ') and not o.name.startswith('沿溪') else 'terrain'
        ev=o.evaluated_get(deps);me=ev.to_mesh();matrix=o.matrix_world
        world=[tuple(matrix@v.co) for v in me.vertices]
        for p in me.polygons:
            material=me.materials[p.material_index] if len(me.materials)>p.material_index else None
            key=classify(material.name if material else '')
            bucket=buckets.setdefault(region+'_'+key,{'key':key,'region':region,'verts':[],'faces':[],'smooth':[]})
            # Deindexing at polygon boundaries gives stable world-space UVs on buildings.
            offset=len(bucket['verts']);coords=[world[i] for i in p.vertices]
            bucket['verts'].extend(coords);bucket['faces'].append(tuple(range(offset,offset+len(coords))));bucket['smooth'].append(False if key in ['plaster','earthwall','wood','roof','dark'] else p.use_smooth)
        ev.to_mesh_clear();included.append(o.name)
export=bpy.data.scenes.new('Countryside · Web export')
bpy.context.window.scene=export
colors={'ground':(.26,.32,.11),'soil':(.55,.43,.28),'stone':(.41,.43,.34),'rock':(.32,.35,.27),'earthwall':(.69,.57,.38),'plaster':(.75,.74,.64),'wood':(.27,.19,.11),'dark':(.035,.045,.03),'roof':(.29,.31,.28)}
materials={}
for key,color in colors.items():
    m=bpy.data.materials.new('web_'+key);m.diffuse_color=(*color,1);m.use_nodes=True
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=.85;materials[key]=m
for name,b in buckets.items():
    me=bpy.data.meshes.new(name);me.from_pydata(b['verts'],[],b['faces']);me.update()
    uv=me.uv_layers.new(name='UVMap')
    for p,smooth in zip(me.polygons,b['smooth']):
        p.use_smooth=smooth;n=p.normal
        for li in p.loop_indices:
            co=me.vertices[me.loops[li].vertex_index].co
            if abs(n.z)>.55:uv.data[li].uv=(co.x*.45,co.y*.45)
            elif abs(n.x)>abs(n.y):uv.data[li].uv=(co.y*.45,co.z*.45)
            else:uv.data[li].uv=(co.x*.45,co.z*.45)
    me.materials.append(materials[b['key']]);o=bpy.data.objects.new(name,me);export.collection.objects.link(o);o['surface']=b['key'];o['region']=b['region'];o['source']='Blender Countryside'
camera=source.camera
metadata={'source_blend':bpy.data.filepath,'objects_exported':len(included),'draw_batches':len(buckets),'vertices':sum(len(b['verts']) for b in buckets.values()),'coordinate_system':'glTF Y-up (Blender x,z,-y)','camera':{'position':[camera.location.x,camera.location.z,-camera.location.y]},'bridge':[2.63,.95,-5],'puppy':[-2.18,.29,5.2],'village':[5.4,2.0,-24]}
(OUT/'scene-info.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
bpy.ops.export_scene.gltf(filepath=str(OUT/'countryside.glb'),export_format='GLB',use_active_scene=True,export_extras=True,export_cameras=False,export_lights=False,export_animations=False,export_apply=True)
print('EXPORT_COMPLETE',json.dumps(metadata,ensure_ascii=False))
