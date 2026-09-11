"""Prepare genuine Z-Anatomy meshes in Blender and export the interactive atlas.

No anatomical primitives are generated. All anatomical surfaces originate from
the licensed source blend. Blender performs modifier evaluation, smoothing,
material authoring, grouping, and GLB export. See assets/ATTRIBUTION.txt.
"""
import bpy, math, os, json, time
from mathutils import Vector, Matrix
from collections import defaultdict

ROOT=os.path.dirname(os.path.abspath(__file__))
DEST=os.path.abspath(os.path.join(ROOT,'../web/anatomy/assets'))
os.makedirs(DEST,exist_ok=True)
t=time.time()
source_objects=list(bpy.data.objects)
scene=bpy.data.scenes.new('Human Atlas | Digital Anatomy')
bpy.context.window.scene=scene
groups=defaultdict(list)
meta={}

def classify(o):
    n=o.name.lower(); c={x.name for x in o.users_collection}
    if o.type not in {'MESH','CURVE'} or n.endswith('.j') or n.endswith('.g') or '?' in n or 'profile' in n: return None
    if o.type=='MESH' and not len(o.data.polygons): return None
    if any(m and m.name=='Text' for m in o.data.materials): return None # Collection title lettering ('Skeletal system.g' etc.) is not anatomy.
    if '9: Regions of human body' in c:
        if any(m and m.name.startswith('Skin') for m in o.data.materials):return ('shell','body','人体外壳','BODY SURFACE')
        return None
    if 'Heart' in c or n in ['left atrium','right atrium','left ventricle','right ventricle']:
        return ('circulatory','heart','心脏','HEART')
    if '5: Cardiovascular system' in c:
        return ('circulatory','veins' if 'vein' in n or 'venous' in n or 'Systemic veins' in c else 'arteries','静脉网络' if 'vein' in n or 'venous' in n or 'Systemic veins' in c else '动脉网络','VEINS' if 'vein' in n or 'venous' in n or 'Systemic veins' in c else 'ARTERIES')
    if 'Lungs' in c: return ('respiratory','lungLeft' if 'left' in n else 'lungRight','左肺' if 'left' in n else '右肺','LEFT LUNG' if 'left' in n else 'RIGHT LUNG')
    if 'Respiratory system' in c or 'Bronchi' in c:
        return ('respiratory','airway','气管与支气管','AIRWAYS')
    if 'Urinary system' in c:
        if 'kidney' in n:return ('urinary','kidneyLeft' if n.endswith('.l') else 'kidneyRight','左肾' if n.endswith('.l') else '右肾','LEFT KIDNEY' if n.endswith('.l') else 'RIGHT KIDNEY')
        return ('urinary','urinaryTract','膀胱与尿路','URINARY TRACT')
    if 'Digestive system' in c:
        if 'Liver' in c:return None # Segmentation overlays; the complete Liver object is retained.
        if n=='liver':return ('digestive','liver','肝脏','LIVER')
        if n=='stomach':return ('digestive','stomach','胃','STOMACH')
        if n=='oesophagus':return ('digestive','esophagus','食管','ESOPHAGUS')
        if 'colon' in n or 'caecum' in n or 'rectum' in n or 'appendix' in n:return ('digestive','colon','大肠','LARGE INTESTINE')
        if n in ['jejunum','ileum','duodenum']:return ('digestive','intestine','小肠','SMALL INTESTINE')
        if 'pancrea' in n or 'gallbladder' in n or 'bile' in n:return ('digestive','accessory','胰腺与胆道','PANCREAS & BILIARY TRACT')
        return None
    if '7: Nervous system & Sense organs' in c:
        if 'Meninges' in c or 'Sense organs' in c or any(k in n for k in ['sulcus','sulci','ventricle','dura','pia','tentorium','arachnoid','eye','lens','cornea','retina','vitreous','foramen','ear','cochlea','semicircular','malleus','incus','stapes','sclera','iris','auditory tube']):return None # Isolated eye, ear and meningeal fragments read as clutter in the head without their neighbours.
        if 'Brain' in c or 'Telencephalon' in c or 'Cerebellum' in c or 'Brainstem' in c:return ('nervous','brain','脑','BRAIN')
        return ('nervous','nerves','脊髓与周围神经','SPINAL CORD & NERVES')
    if '1: Skeletal system' in c:
        if any('Insertion' in m.name or 'Origin' in m.name for m in o.data.materials if m):return None
        if 'Head' in c or 'Cranium' in c:return ('skeletal','skull','颅骨','SKULL')
        if 'Ribs' in c or 'Thoracic skeleton' in c:return ('skeletal','ribs','胸廓','THORACIC SKELETON')
        if 'Vertebral column' in c:return ('skeletal','spine','脊柱','VERTEBRAL COLUMN')
        if 'Pelvis' in c:return ('skeletal','pelvis','骨盆','PELVIS')
        if 'Right lower limb' in c or 'Left lower limb' in c or 'Bones of lower limb' in c:return ('skeletal','legBones','下肢骨骼','LOWER LIMB BONES')
        if 'Right upper limb' in c or 'Left upper limb' in c or 'Bones of upper limb' in c:return ('skeletal','armBones','上肢骨骼','UPPER LIMB BONES')
        return ('skeletal','otherBones','其他骨骼','SKELETON')
    if '4: Muscular system' in c and '2: Muscular insertions' not in c:
        return ('muscular','muscles','全身肌群','MUSCULAR SYSTEM')
    return None

selected=[(o,classify(o)) for o in source_objects if classify(o)]
print('SELECTED',len(selected),flush=True)
# Copy into a clean scene first, retaining real mesh data and mirror transforms.
copies=[]
for o,info in selected:
    cp=o.copy();cp.data=o.data.copy();cp.animation_data_clear()
    world=o.matrix_world.copy(); cp.parent=None;cp.matrix_world=world
    cp.hide_viewport=False;cp.hide_render=False;cp.hide_set(False)
    for mod in list(cp.modifiers):
        if mod.type in {'SUBSURF','MULTIRES','SOLIDIFY','MASK','ARMATURE','SHRINKWRAP'}:cp.modifiers.remove(mod)
    if cp.type=='CURVE':
        cp.data.resolution_u=7;cp.data.bevel_resolution=2
        if cp.data.bevel_object:
            cp.data.bevel_mode='ROUND';cp.data.bevel_object=None
            if cp.data.bevel_depth==0:cp.data.bevel_depth=.001
    scene.collection.objects.link(cp);copies.append((cp,info,o.name))
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
for i,(cp,info,original) in enumerate(copies):
    evaluated=cp.evaluated_get(deps)
    mesh=bpy.data.meshes.new_from_object(evaluated,depsgraph=deps)
    mesh.transform(cp.matrix_world)
    ob=bpy.data.objects.new('part_'+str(i),mesh);scene.collection.objects.link(ob)
    groups[info[1]].append(ob); meta[info[1]]={'system':info[0],'id':info[1],'label':info[2],'english':info[3]}
    if i%250==0:print('EVALUATED',i,original,flush=True)
bpy.data.batch_remove(ids=tuple(cp for cp,_,_ in copies))
print('BULK CLEANUP source objects',flush=True)
bpy.data.batch_remove(ids=tuple(source_objects))
bpy.data.batch_remove(ids=tuple(other for other in bpy.data.scenes if other!=scene))
bpy.data.batch_remove(ids=tuple(bpy.data.collections))
print('BULK CLEANUP complete',flush=True)

colors={'shell':(.08,.25,.43),'skeletal':(.26,.39,.49),'circulatory':(.64,.22,.075),'respiratory':(.33,.24,.20),'digestive':(.46,.25,.10),'urinary':(.38,.15,.11),'nervous':(.42,.32,.23),'muscular':(.22,.14,.14)}
final=[]
for key,obs in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in obs:ob.select_set(True)
    bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();ob=bpy.context.object
    ob.name=key;ob.data.name=key+'_anatomical_mesh'
    for k,v in meta[key].items():ob[k]=v
    # Weld anatomical patch boundaries, then use Blender subdivision on coarse organ surfaces.
    if key=='body':
        mod=ob.modifiers.new('Weld source skin regions','WELD');mod.merge_threshold=.00015
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if len(ob.data.polygons)<55000 and key not in {'arteries','veins','nerves'}:
        mod=ob.modifiers.new('Fine anatomical surface','SUBSURF');mod.levels=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in ob.data.polygons:p.use_smooth=True;p.material_index=0
    ob.data.materials.clear()
    system=meta[key]['system'];color=colors[system]
    if key=='veins':color=(.07,.20,.35)
    if key=='heart':color=(.60,.20,.055)
    mat=bpy.data.materials.new(key+'_digital_tissue');mat.use_nodes=True
    p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=.4;p.inputs['Metallic'].default_value=.15
    p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=.12
    mat.diffuse_color=(*color,1);ob.data.materials.append(mat)
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY',center='BOUNDS')
    final.append(ob);meta[key]['triangles']=sum(len(p.vertices)-2 for p in ob.data.polygons)
    print('GROUP',key,len(ob.data.vertices),meta[key]['triangles'],flush=True)

# Original source collections remain in the source file; delivery is a clean scene.
bpy.data.batch_remove(ids=tuple(other for other in bpy.data.scenes if other!=scene))
final_names={x.name for x in final}
bpy.data.batch_remove(ids=tuple(o for o in bpy.data.objects if o.name not in final_names))
for txt in list(bpy.data.texts):bpy.data.texts.remove(txt)
for col in list(bpy.data.collections):
    if not col.objects and not col.children:bpy.data.collections.remove(col)
for system in colors:
    col=bpy.data.collections.new(system);scene.collection.children.link(col)
    for ob in final:
        if ob['system']==system:
            for old in list(ob.users_collection):old.objects.unlink(ob)
            col.objects.link(ob)
scene.unit_settings.system='METRIC'
scene.world=bpy.data.worlds.new('Digital atlas environment');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.015,.025,.04,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.render.engine='CYCLES';scene.cycles.samples=32
scene['source']='Z-Anatomy / BodyParts3D; see ATTRIBUTION.txt'
scene['note']='Real anatomical source meshes; educational animation is authored separately in viewer.'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=3
            area.spaces.active.region_3d.view_location=(0,0,.9)
            area.spaces.active.shading.type='MATERIAL'
with open(os.path.join(DEST,'manifest.json'),'w',encoding='utf8') as f:json.dump({'source':'Z-Anatomy','groups':list(meta.values()),'sourceObjects':len(selected)},f,ensure_ascii=False,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'Human_Atlas.blend'),compress=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(DEST,'human-atlas.glb'),export_format='GLB',use_selection=True,export_extras=True,export_apply=True,export_animations=False,export_yup=True)
print('DONE',round(time.time()-t,1),flush=True)
