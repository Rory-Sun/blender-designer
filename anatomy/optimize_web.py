"""Keep the editable atlas intact; simplify a separate web delivery mesh."""
import bpy,os,json,time,math
from mathutils import Vector,Quaternion
ROOT=os.path.dirname(os.path.abspath(__file__))
DEST=os.path.abspath(os.path.join(ROOT,'../web/anatomy/assets'))
# Author the delivery .blend as a digital-anatomy scene, before any web LOD.
scene=bpy.context.scene
for o in list(scene.objects):
    if o.type!='MESH':continue
    system=o.get('system','')
    if system=='muscular':o.hide_set(True);o.hide_render=True
    if not o.data.materials:continue
    mat=o.data.materials[0];nodes=mat.node_tree.nodes;links=mat.node_tree.links
    output=nodes.get('Material Output');principled=nodes.get('Principled BSDF')
    if system=='shell':
        nodes.clear();output=nodes.new('ShaderNodeOutputMaterial');trans=nodes.new('ShaderNodeBsdfTransparent');emission=nodes.new('ShaderNodeEmission');emission.inputs[0].default_value=(.19,.42,.8,1);emission.inputs[1].default_value=.9
        layer=nodes.new('ShaderNodeLayerWeight');layer.inputs['Blend'].default_value=.35
        ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.25;ramp.color_ramp.elements[0].color=(0,0,0,1);ramp.color_ramp.elements[1].position=.9;ramp.color_ramp.elements[1].color=(.5,.5,.5,1)
        mix=nodes.new('ShaderNodeMixShader');links.new(layer.outputs['Facing'],ramp.inputs[0]);links.new(ramp.outputs[0],mix.inputs[0]);links.new(trans.outputs[0],mix.inputs[1]);links.new(emission.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],output.inputs[0])
    elif system in {'skeletal','respiratory'}:
        trans=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader');mix.inputs[0].default_value=.24 if system=='skeletal' else .58
        links.new(trans.outputs[0],mix.inputs[1]);links.new(principled.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],output.inputs[0])
    elif system=='circulatory':principled.inputs['Emission Strength'].default_value=.5
body=bpy.data.objects.get('body')
points=[body.matrix_world@Vector(c) for c in body.bound_box];center=sum(points,Vector())/8
camdata=bpy.data.cameras.new('Atlas camera');cam=bpy.data.objects.new('Atlas camera',camdata);scene.collection.objects.link(cam)
cam.location=center+Vector((0,-3.9,.12));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=52;scene.camera=cam
for name,loc,power,color,size in [('Warm key',(-2,-3,3),650,(1,.75,.53),3),('Blue rim',(2,1,2.5),850,(.28,.58,1),2),('Soft fill',(1,-2,1),200,(.65,.8,1),2)]:
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.color=color;light.shape='DISK';light.size=size
    obj=bpy.data.objects.new(name,light);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1000;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.cycles.transparent_max_bounces=16
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_rotation=Quaternion((1,0,0),math.pi/2)
            area.spaces.active.region_3d.view_location=center
            area.spaces.active.region_3d.view_distance=3
            area.spaces.active.shading.type='MATERIAL'
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'Human_Atlas.blend'),compress=True)
# Web meshes use runtime materials; retain only anatomical meshes in the GLB.
for o in list(scene.objects):
    if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    else:o.hide_set(False);o.hide_render=False
budgets={'muscles':180000,'arteries':230000,'veins':190000,'nerves':150000,'body':100000,'brain':170000,'airway':65000,'heart':110000}
report=[]
for o in list(bpy.context.scene.objects):
    if o.type!='MESH':continue
    before=sum(len(p.vertices)-2 for p in o.data.polygons)
    budget=budgets.get(o.name,75000)
    if before>budget:
        bpy.context.view_layer.objects.active=o
        dec=o.modifiers.new('Browser LOD - preserve original in blend','DECIMATE');dec.ratio=budget/before
        bpy.ops.object.modifier_apply(modifier=dec.name)
    after=sum(len(p.vertices)-2 for p in o.data.polygons)
    for polygon in o.data.polygons:polygon.material_index=0
    report.append({'id':o.name,'originalTriangles':before,'webTriangles':after})
    print('WEB',o.name,before,after,flush=True)
with open(os.path.join(DEST,'web-lod.json'),'w') as f:json.dump(report,f,indent=2)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(DEST,'human-atlas.glb'),export_format='GLB',use_selection=True,export_extras=True,export_apply=True,export_animations=False,export_yup=True)
print('WEB EXPORT COMPLETE',flush=True)
