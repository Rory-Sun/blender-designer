import bpy, math, random, os
from mathutils import Vector, Matrix
random.seed(85)
scene=bpy.context.scene
OUT=os.path.dirname(os.path.abspath(__file__))
# Reuse only the small mesh-building utilities, without rebuilding the scene.
src=open(os.path.join(OUT,'build_countryside.py'),encoding='utf-8-sig').read()
ns={'bpy':bpy,'math':math,'pi':math.pi,'sin':math.sin,'cos':math.cos}
exec(src[src.index('def mesh('):src.index('# Continuous sculpted river banks')],ns)
Batch=ns['Batch'];mesh=ns['mesh']
plants=next(c for c in scene.collection.children if c.name.startswith('05 '));background=next(c for c in scene.collection.children if c.name.startswith('07 '))
leaves=[bpy.data.materials.get('树叶 '+str(i)) for i in range(4)]
# Break the spherical canopies into small organically varied leaf masses.
b=Batch()
for o in list(scene.objects):
    if not o.name.startswith('树冠'):continue
    for v in o.data.vertices:
        p=v.co
        p*=1+.11*math.sin(p.x*9+p.y*5)*math.sin(p.z*7+1)
    for i in range(44):
        a=random.random()*math.tau;t=random.uniform(-1,1);rr=math.sqrt(1-t*t)
        co=Vector((rr*math.cos(a)*.91,rr*math.sin(a)*.91,t*.91))
        p=o.matrix_world@co;r=random.uniform(.12,.24)*max(o.scale)
        b.oval(p,(r,r*.8,r*.75),random.randrange(4),4,7)
b.finish('树冠 · 细密叶团',leaves,background,True)
# Wild meadow fills the left foreground instead of a bare flat surface.
grass=[bpy.data.materials.get('草叶 '+str(i)) for i in range(4)]
g=Batch()
def river(y):return 2.1+1.1*math.sin(y*.16-.3)
def width(y):return 1.7+.25*math.cos(y*.22)
def pathx(y):return river(y)-width(y)-1.8-.35*math.sin(y*.38)
for i in range(17000):
    y=random.uniform(-17,7.5);x=pathx(y)-random.uniform(.78,8)
    for k in range(3):g.blade(x,y,.25,random.uniform(.13,.43),random.random()*math.tau,.013,random.uniform(.05,.2),random.randrange(4))
g.finish('前景草甸 · 密集细草',grass,plants)
# Rotate the face toward the viewer, keeping the walking body facing upstream.
headcenter=Vector((pathx(-5.2)+.05,-5.2+.34,1.70));rot=Matrix.Rotation(math.radians(-95),4,'Z')
head_names=['回首头部','口鼻','黑鼻','眼睛','眼神光','左垂耳','右垂耳']
for o in next(c for c in scene.collection.children if c.name.startswith('06 ')).objects:
    if any(n in o.name for n in head_names):
        o.location=headcenter+rot.to_3x3()@(o.location-headcenter)
        o.rotation_euler=(rot.to_3x3()@o.rotation_euler.to_matrix()).to_euler()
bpy.context.view_layer.update()
anchor=Vector((pathx(-5.2),-5.2,.28))
for o in next(c for c in scene.collection.children if c.name.startswith('06 ')).objects:
    transform=Matrix.Translation(anchor)@Matrix.Scale(1.27,4)@Matrix.Translation(-anchor)
    o.matrix_world=transform@o.matrix_world
# Lighten distant mountains and lower their silhouettes to show some sky.
for o in scene.objects:
    if o.name.startswith('层叠青山'):
        o.scale.z=.68
        m=o.data.materials[0];n=next(n for n in m.node_tree.nodes if n.type=='VALTORGB')
        layer=int(o.name[-1]);c=[(.22,.34,.27),(.30,.44,.43),(.41,.54,.55)][layer]
        n.color_ramp.elements[0].color=(*(v*.80 for v in c),1)
        n.color_ramp.elements[1].color=(*(v*1.12 for v in c),1)
# Warm, directional light with softer shadows and a restrained sky fill.
sun=bpy.data.lights['午后暖阳'];sun.energy=3.0;sun.angle=.07
for n in scene.world.node_tree.nodes:
    if n.type=='BACKGROUND':n.inputs['Strength'].default_value=.32
scene.camera.location=(-6,-19,12)
scene.camera.rotation_euler=(Vector((.8,8,2))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.shift_y=-.07;scene.camera.data.lens=40
scene.view_settings.exposure=.5
scene.render.resolution_x=800;scene.render.resolution_y=1400;scene.render.resolution_percentage=50;scene.cycles.samples=16
scene.render.filepath=os.path.join(OUT,'countryside_preview_v3.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'溪畔秋日_Countryside.blend'))
def render_refined():
    bpy.ops.render.render(write_still=True)
    return None
bpy.app.timers.register(render_refined,first_interval=1)
print('REFINED_RENDER_SCHEDULED')

