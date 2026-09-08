import bpy, math, random, os
from mathutils import Vector
from math import sin, cos, pi
random.seed(41)
OUT = os.path.dirname(os.path.abspath(__file__))
scene = bpy.data.scenes.new('溪畔秋日 · Countryside')
bpy.context.window.scene = scene
collections = {}
def group(name):
    c=bpy.data.collections.new(name); scene.collection.children.link(c); collections[name]=c; return c
LAND=group('01 地形与溪水'); BRIDGE=group('02 石桥与步道'); CROP=group('03 金色稻田'); HOME=group('04 山村民居'); PLANT=group('05 草木与野花'); DOG=group('06 回首的小狗'); BG=group('07 远山与树林'); LIGHT=group('08 镜头与光照')
def put(o, c):
    for old in list(o.users_collection): old.objects.unlink(o)
    c.objects.link(o); return o
def mat(name,color,rough=.7,noise=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    n=m.node_tree.nodes; l=m.node_tree.links; p=next(v for v in n if v.type=='BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough
    if noise:
        t=n.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value=noise; t.inputs['Detail'].default_value=3
        ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.2; ramp.color_ramp.elements[0].color=(*(v*.57 for v in color),1); ramp.color_ramp.elements[1].position=.8; ramp.color_ramp.elements[1].color=(*(min(1,v*1.25) for v in color),1)
        l.new(t.outputs['Fac'],ramp.inputs[0]); l.new(ramp.outputs[0],p.inputs['Base Color'])
        bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.23; bump.inputs['Distance'].default_value=.08; l.new(t.outputs['Fac'],bump.inputs['Height']); l.new(bump.outputs[0],p.inputs['Normal'])
    return m
earth=mat('湿润草岸',(.19,.26,.055),noise=4); pathmat=mat('浅色夯土小路',(.57,.45,.28),noise=8); stone=mat('斑驳灰色石材',(.32,.34,.28),noise=7); rockmat=mat('溪岸青石',(.22,.27,.20),noise=5)
grassm=[mat('草叶 '+str(i),c) for i,c in enumerate([(.18,.31,.045),(.3,.43,.075),(.42,.49,.1),(.1,.23,.035)])]
leafm=[mat('树叶 '+str(i),c,noise=3) for i,c in enumerate([(.12,.23,.065),(.2,.32,.09),(.29,.38,.105),(.07,.18,.08)])]
ricem=[mat('稻叶 '+str(i),c) for i,c in enumerate([(.29,.43,.055),(.43,.52,.08),(.56,.6,.13)])]; grainm=mat('成熟金色稻穗',(.69,.53,.18),.65)
plaster=mat('暖土墙',(.58,.43,.25),noise=5); white=mat('石灰白墙',(.73,.73,.62),noise=6); wood=mat('老木梁',(.17,.115,.065),noise=5); dark=mat('门窗暗部',(.045,.058,.042)); roofm=[mat('灰瓦 '+str(i),c,noise=12) for i,c in enumerate([(.16,.19,.18),(.23,.24,.21),(.28,.28,.23),(.19,.22,.2)])]
water=mat('溪水 · 细波反射',(.12,.22,.16),.18); p=next(v for v in water.node_tree.nodes if v.type=='BSDF_PRINCIPLED'); p.inputs['Metallic'].default_value=.22; p.inputs['IOR'].default_value=1.333; p.inputs['Transmission Weight'].default_value=.22
tex=water.node_tree.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=3.4; tex.inputs['Detail'].default_value=2; mapping=water.node_tree.nodes.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'; mapping.inputs[1].default_value=(1,6,1); coord=water.node_tree.nodes.new('ShaderNodeTexCoord'); water.node_tree.links.new(coord.outputs['Generated'],mapping.inputs[0]); water.node_tree.links.new(mapping.outputs[0],tex.inputs[0]); bump=water.node_tree.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.22; bump.inputs['Distance'].default_value=.09; water.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']); water.node_tree.links.new(bump.outputs[0],p.inputs['Normal'])
foam=mat('浅滩水光',(.69,.81,.7),.22)
def mesh(name,verts,faces,mats,c,inds=None,smooth=False):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update(); ob=bpy.data.objects.new(name,me); c.objects.link(ob)
    for m in mats: me.materials.append(m)
    for i,poly in enumerate(me.polygons):
        if inds: poly.material_index=inds[i]
        poly.use_smooth=smooth
    return ob
def box(name,loc,scale,m,c,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); put(o,c); o.data.materials.append(m)
    if bevel: mod=o.modifiers.new('磨损边缘','BEVEL'); mod.width=bevel; mod.segments=2; o.modifiers.new('加权法线','WEIGHTED_NORMAL')
    return o
def ell(name,loc,scale,m,c,sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc); o=bpy.context.object; o.name=name; o.scale=scale; put(o,c); o.data.materials.append(m)
    for p in o.data.polygons:p.use_smooth=True
    return o
def tube(name,pts,r,m,c):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.resolution_u=8; cu.bevel_depth=r; cu.bevel_resolution=2
    sp=cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts)-1)
    for b,p in zip(sp.bezier_points,pts):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,cu);c.objects.link(ob);cu.materials.append(m);return ob
class Batch:
    def __init__(self):self.v=[];self.f=[];self.i=[]
    def tri(self,a,b,c,mi=0):
        k=len(self.v);self.v.extend([a,b,c]);self.f.append((k,k+1,k+2));self.i.append(mi)
    def quad(self,a,b,c,d,mi=0):
        k=len(self.v);self.v.extend([a,b,c,d]);self.f.append((k,k+1,k+2,k+3));self.i.append(mi)
    def blade(self,x,y,z,h,a,w,lean,mi=0):
        dx,dy=cos(a),sin(a); sx,sy=-dy*w,dx*w
        self.quad((x-sx,y-sy,z),(x+sx,y+sy,z),(x+dx*lean*.4+sx*.6,y+dy*lean*.4+sy*.6,z+h*.6),(x+dx*lean*.4-sx*.6,y+dy*lean*.4-sy*.6,z+h*.6),mi)
        self.tri((x+dx*lean*.4-sx*.6,y+dy*lean*.4-sy*.6,z+h*.6),(x+dx*lean*.4+sx*.6,y+dy*lean*.4+sy*.6,z+h*.6),(x+dx*lean,y+dy*lean,z+h),mi)
    def oval(self,pos,scale,mi=0,rings=4,n=7):
        k=len(self.v)
        for j in range(rings+1):
            a=pi*j/rings
            for t in range(n):
                b=2*pi*t/n;self.v.append((pos[0]+scale[0]*sin(a)*cos(b),pos[1]+scale[1]*sin(a)*sin(b),pos[2]+scale[2]*cos(a)))
        for j in range(rings):
            for t in range(n):self.f.append((k+j*n+t,k+j*n+(t+1)%n,k+(j+1)*n+(t+1)%n,k+(j+1)*n+t));self.i.append(mi)
    def finish(self,name,m,c,smooth=False):return mesh(name,self.v,self.f,m,c,self.i,smooth)
def river(y):return 2.1+1.1*sin(y*.16-.3)
def width(y):return 1.7+.25*cos(y*.22)
def pathx(y):return river(y)-width(y)-1.8-.35*sin(y*.38)
# Continuous sculpted river banks, sloping to the water.
for side in [-1,1]:
    v=[];f=[]
    for j in range(131):
        y=-18+j*.46;edge=river(y)+side*width(y)
        for d,z in [(0,-.4),(.32,-.10),(.7,.23),(1.2,.30),(3,.23),(12,.22),(28,.21)]:v.append((edge+side*d,y,z+.025*sin(y*1.8+d)))
    for j in range(130):
        for k in range(6):a=j*7+k;f.append((a,a+1,a+8,a+7))
    mesh('左岸' if side<0 else '右岸',v,f,[earth],LAND,smooth=True)
v=[];f=[]
for j in range(151):
    y=-18+j*.4
    for side in [-1,1]:v.append((river(y)+side*(width(y)+.1),y,-.31+.012*sin(y*3)))
for j in range(150):a=j*2;f.append((a,a+1,a+3,a+2))
mesh('蜿蜒溪流',v,f,[water],LAND,smooth=True)
v=[];f=[]
for j in range(110):
    y=-17+j*.3;x=pathx(y)
    for s in [-1,1]:v.append((x+s*(.63+.08*sin(y)),y,.285))
for j in range(109):a=j*2;f.append((a,a+1,a+3,a+2))
mesh('沿溪乡间小路',v,f,[pathmat],BRIDGE)
for i in range(110):
    y=random.uniform(-14,25);s=random.choice([-1,1]);x=river(y)+s*(width(y)+random.uniform(-.1,.5));r=random.uniform(.12,.48)
    o=ell('岸边卵石', (x,y,-.05),(r,r*.72,r*.55),rockmat,LAND,1);o.rotation_euler=(random.random(),random.random(),random.random())
# Stone slab bridge, visible abutments, stairs, and broken-water riffles.
by=5.0;bc=river(by);span=width(by)*2+1.8
for x in [bc-span/2+.45,bc+span/2-.45]:
    for layer in range(3):
        for j in range(3):box('桥墩砌石',(x,by-.55+j*.53,-.1+layer*.29),(.8,.50,.28),stone,BRIDGE,.055)
for j in range(4):box('横跨溪流的石桥板',(bc,by-.66+j*.44,.91),(span,.43,.26),stone,BRIDGE,.045)
for i in range(4):box('左岸石阶',(bc-span/2-.3-i*.38,by,.69-i*.13),(.53,1.63,.18),stone,BRIDGE,.06)
for i in range(4):box('右岸石阶',(bc+span/2+.22+i*.3,by,.7-i*.14),(.45,1.55,.18),stone,BRIDGE,.05)
for i in range(16):
    y=random.uniform(3.6,4.15);x=random.uniform(bc-1.35,bc+1.35)
    ell('桥下浅滩石',(x,y,-.22),(.27,.17,.14),rockmat,LAND,1)
    tube('细碎水花',[(x-.23,y-.17,-.26),(x,y-.22,-.19),(x+.2,y-.19,-.27)],.012,foam,LAND)
for i in range(36):
    y=random.uniform(-11,12);x=river(y)+random.uniform(-1.2,1.2);le=random.uniform(.1,.45)
    tube('溪面波光',[(x-le,y,-.285),(x,y+.025,-.28),(x+le,y,-.285)],.006,foam,LAND)
# Paddy terraces to the left, receding into the valley.
for row,(ya,yb) in enumerate([(8.0,11.2),(11.8,15.2),(15.8,19.0),(19.6,22.7),(23.3,26.1)]):
    for col,(xa,xb) in enumerate([(-18,-9.5),(-9,0.0)]):
        z=.29+row*.06
        box('稻田 %d-%d'%(row+1,col+1),((xa+xb)/2,(ya+yb)/2,z-.1),(xb-xa,yb-ya,.2),earth,CROP,.06)
        box('田埂',((xa+xb)/2,yb+.18,z+.02),(xb-xa,.34,.16),earth,CROP,.06)
        leaves=Batch();grain=Batch()
        x=xa+.15
        while x<xb-.1:
            y=ya+.16
            while y<yb-.1:
                xx=x+random.uniform(-.065,.065);yy=y+random.uniform(-.06,.06);h=random.uniform(.65,.95)
                for k in range(5):leaves.blade(xx,yy,z,h*random.uniform(.68,1),random.random()*2*pi,.017,random.uniform(.08,.27),random.randrange(3))
                if random.random()<.86:
                    a=random.random()*2*pi;dx,dy=cos(a),sin(a)
                    for g in range(6):
                        t=g/5;grain.oval((xx+dx*t*.18,yy+dy*t*.18,z+h-.13*t*t),(.027,.024,.046),0,3,5)
                y+=.24
            x+=.24
        leaves.finish('稻叶 %d-%d'%(row,col),ricem,CROP);grain.finish('垂垂稻穗 %d-%d'%(row,col),[grainm],CROP,True)
# Village: plaster / earth walls, actual curved clay tiles, lintels, doors and shutters.
def house(x,y,w,d,h,wall,idx):
    z=.28;box('民居%d · 墙体'%idx,(x,y,z+h/2),(w,d,h),wall,HOME,.035)
    rise=w*.29;ridge=z+h+rise
    verts=[(x-w/2,y-d/2,z+h),(x+w/2,y-d/2,z+h),(x,y-d/2,ridge),(x-w/2,y+d/2,z+h),(x+w/2,y+d/2,z+h),(x,y+d/2,ridge)]
    mesh('山墙',verts,[(0,1,2),(3,5,4)],[wall],HOME)
    tiles=Batch()
    for side in [-1,1]:
        rows=int((w/2+.35)/.31);cols=int((d+.85)/.24)
        for a in range(rows):
            u0=a*(w/2+.35)/rows;u1=(a+1)*(w/2+.35)/rows+.055
            for b in range(cols):
                yy=y-d/2-.42+b*(d+.85)/cols;mi=random.randrange(4)
                for t in range(4):
                    va=t/4;vb=(t+1)/4
                    def p(u,v):return (x+side*u,yy+v*.26,ridge-u*.58+.05*sin(v*pi)+.03)
                    tiles.quad(p(u0,va),p(u1,va),p(u1,vb),p(u0,vb),mi)
    tiles.finish('民居%d · 独立弧面瓦片'%idx,roofm,HOME)
    tube('屋脊',[(x,y-d/2-.48,ridge+.09),(x,y,ridge+.11),(x,y+d/2+.48,ridge+.09)],.075,roofm[1],HOME)
    for sx in [-1,1]:box('檐木',(x+sx*(w/2+.15),y,z+h-.08),(.13,d+.6,.14),wood,HOME)
    front=y-d/2-.018
    box('木门',(x,front,z+.95),(.77,.07,1.9),wood,HOME,.015)
    for k in range(5):box('门板缝',(x-.31+k*.155,front-.045,z+.95),(.011,.014,1.82),dark,HOME)
    box('门前石阶',(x,front-.35,z+.04),(1.1,.75,.16),stone,HOME,.04)
    for sx in [-1,1]:
        wx=x+sx*w*.31
        box('窗洞',(wx,front-.02,z+h*.58),(.79,.065,.94),dark,HOME,.01)
        for v in [-.43,.43]:box('窗框',(wx+v,front-.08,z+h*.58),(.07,.07,1.04),wood,HOME)
        for v in [-.5,.5]:box('窗框横梁',(wx,front-.08,z+h*.58+v),(.91,.07,.065),wood,HOME)
        for v in [-.2,0,.2]:box('窗棂',(wx+v,front-.09,z+h*.58),(.035,.06,.94),wood,HOME)
    if idx%2==0:
        for sx in [-1,1]:box('门廊立柱',(x+sx*w*.40,front-1.1,z+1.13),(.11,.12,2.26),wood,HOME)
        aw=box('门廊瓦顶',(x,front-.72,z+2.4),(w*.94,1.6,.12),roofm[1],HOME,.015);aw.rotation_euler.x=.15
    if idx%3==0:box('烟囱',(x+.65,y+.5,ridge-.1),(.35,.43,1.2),white,HOME,.035)
for args in [(5.4,24,4.5,3.5,3.5,plaster,1),(10.5,26.0,4.6,4.0,4.5,white,2),(15.5,25.6,4.5,3.7,3.4,white,3),(1.2,27.5,3.5,3.2,3.3,wood,4),(-3.6,28,4.1,3,2.6,white,5),(-8,29,3.6,3.1,2.6,plaster,6),(-12.5,30,3.7,3,2.6,white,7)]:house(*args)
# A few masonry seams, firewood and utility lines reinforce the rural scale.
for i in range(22):
    x=random.uniform(3.3,7.45);z=random.choice([.8,1.4,2.1,2.7])+random.uniform(-.04,.04)
    box('土墙石缝',(x,22.235,z),(random.uniform(.16,.48),.012,.012),stone,HOME)
for i in range(13):ell('门旁柴堆',(8.4+(i%4)*.14,23.1+(i//4)*.13,.42+(i//8)*.15),(.10,.36,.10),wood,HOME,1)
for px,py in [(-9,26),(-1,25),(8.5,23.5),(17,25)]:
    tube('电线杆',[(px,py,.25),(px,py,6)],.065,stone,HOME)
    tube('电杆横担',[(px-.4,py,5.7),(px+.4,py,5.7)],.045,wood,HOME)
for a,b in zip([(-9,26),(-1,25),(8.5,23.5)], [(-1,25),(8.5,23.5),(17,25)]):
    for off in [-.24,.24]:tube('下垂电线',[(a[0]+off,a[1],5.8),((a[0]+b[0])/2+off,(a[1]+b[1])/2,5.35),(b[0]+off,b[1],5.8)],.011,dark,HOME)
# Grasses on both banks and foreground meadow. All blades batched as editable meshes.
gr=Batch()
for i in range(12500):
    y=random.uniform(-16,29);side=random.choice([-1,1]);x=river(y)+side*(width(y)+random.uniform(.4,4.8))
    if side<0 and abs(x-pathx(y))<.72:continue
    if y>7 and side<0:continue
    if abs(y-by)<1.0 and abs(x-bc)<span/2+1.5:continue
    h=random.uniform(.12,.47)
    for k in range(3):gr.blade(x,y,.27,h,random.random()*2*pi,.012,random.uniform(.05,.24),random.randrange(4))
gr.finish('野草 · 交错叶片',grassm,PLANT)
bush=Batch()
for i in range(155):
    y=random.uniform(-12,31);side=random.choice([-1,1]);x=river(y)+side*(width(y)+random.uniform(.6,2.8))
    if abs(x-pathx(y))<.9 or (side<0 and y>7) or abs(y-by)<1.3:continue
    for k in range(18):
        a=random.random()*2*pi;r=random.random()*.55;z=.35+random.random()*.6
        bush.oval((x+r*cos(a),y+r*sin(a),z),(.16,.12,.12),random.randrange(4),3,5)
bush.finish('溪岸繁茂灌木',leafm,PLANT,True)
petals=[mat('波斯菊 · '+n,c,.5) for n,c in [('浅粉',(.86,.37,.54)),('奶白',(.92,.87,.69)),('金黄',(.98,.58,.035)),('淡紫',(.71,.34,.56))]]; center=mat('花蕊',(.53,.27,.02));fl=Batch();st=Batch()
for i in range(420):
    y=random.uniform(-15,2.6);x=pathx(y)-random.uniform(.92,4.1)
    if i<70:y=random.uniform(-12,3);x=river(y)+width(y)+random.uniform(.7,2)
    z=random.uniform(.40,.9);r=random.uniform(.065,.12);mi=random.randrange(4)
    st.blade(x,y,.28,z-.28,random.random()*6,.009,.035,0)
    for k in range(7):
        a=k*2*pi/7;dx,dy=cos(a),sin(a);tx,ty=-dy,dx
        fl.quad((x+dx*r*.16,y+dy*r*.16,z),(x+dx*r*.68+tx*r*.38,y+dy*r*.68+ty*r*.38,z+.025),(x+dx*r,y+dy*r,z+.018),(x+dx*r*.68-tx*r*.38,y+dy*r*.68-ty*r*.38,z+.025),mi)
    fl.oval((x,y,z+.012),(.024,.024,.015),4,3,6)
fl.finish('溪畔波斯菊 · 花瓣和花蕊',petals+[center],PLANT,True);st.finish('野花茎叶',[grassm[0]],PLANT)
# Layered forest silhouettes and rounded, densely wooded mountain slopes.
trunk=mat('树干',(.14,.105,.055),noise=4)
def tree(x,y,z,s,c=BG):
    tube('树干',[(x,y,z),(x+.08*s,y,z+1.5*s),(x-.12*s,y,z+2.6*s)],.09*s,trunk,c)
    for dx,dy,dz,r in [(-.55,0,2.6,.9),(.5,.12,2.9,1),(0,-.2,3.6,.95),(.05,.5,2.6,.9)]:
        o=ell('树冠',(x+dx*s,y+dy*s,z+dz*s),(r*s,r*.8*s,r*.85*s),random.choice(leafm),c,2)
for i in range(52):
    x=random.uniform(-22,25);y=random.uniform(30,42);tree(x,y,.2,random.uniform(.75,1.6))
for x,y,s in [(18,21,1.4),(13,31,1.6),(-17,24,1.5),(-1,24,.9),(3,21,.65),(8,21,.65),(18,9,1.5)]:tree(x,y,.25,s,PLANT)
for layer in range(3):
    mm=mat('远山空气透视 '+str(layer),[(.17,.29,.19),(.24,.37,.34),(.34,.46,.47)][layer],noise=1.2)
    v=[];f=[]
    for j in range(17):
        y=37+layer*13+j*1.8
        for i in range(61):
            x=-60+i*2;peak=(9+4*sin(x*.09+layer*1.7)+2*cos(x*.21+layer));h=peak*sin(pi*j/16)**.7+(.5 if j>0 else 0)
            v.append((x,y,h))
    for j in range(16):
        for i in range(60):a=j*61+i;f.append((a,a+1,a+62,a+61))
    mesh('层叠青山 '+str(layer),v,f,[mm],BG,smooth=True)
# Small golden dog, standing on the path and looking back at the camera.
fur=mat('小狗 · 金色绒毛',(.63,.36,.12),noise=24);fur_light=mat('小狗 · 奶油毛色',(.84,.64,.36),noise=28);fur_dark=mat('小狗 · 耳朵',(.43,.235,.075),noise=22);nose=mat('小狗 · 鼻眼',(.018,.012,.008),.3);eye_glint=mat('眼睛高光',(.95,.92,.82),.2);collar=mat('棕红项圈',(.32,.055,.025),.5)
dx=pathx(-5.2);dy=-5.2
def dogell(n,p,s,m):return ell(n,(dx+p[0],dy+p[1],p[2]+.28),s,m,DOG,3)
body=dogell('小狗 · 躯干',(0,0,.82),(.27,.51,.31),fur)
dogell('小狗 · 胸脯',(0,.32,.89),(.25,.25,.35),fur_light)
for xx,yy in [(-.19,-.33),(.19,-.33),(-.18,.29),(.18,.29)]:
    dogell('小狗 · 腿',(xx,yy,.43),(.088,.105,.33),fur_light)
    dogell('小狗 · 脚掌',(xx,yy+.035,.14),(.105,.155,.095),fur_light)
dogell('小狗 · 颈部',(0,.30,1.14),(.20,.22,.28),fur_light)
dogell('小狗 · 回首头部',(.05,.34,1.42),(.265,.235,.25),fur_light)
dogell('小狗 · 口鼻',(.23,.17,1.36),(.20,.14,.12),fur_light)
dogell('小狗 · 黑鼻',(.39,.075,1.385),(.07,.061,.05),nose)
for xx,yy in [(.18,.175),(.24,.40)]:
    dogell('小狗 · 眼睛',(xx,yy,1.48),(.038,.026,.044),nose)
    dogell('小狗 · 眼神光',(xx+.018,yy-.017,1.498),(.012,.012,.013),eye_glint)
ear=dogell('小狗 · 左垂耳',(-.14,.23,1.34),(.105,.16,.24),fur_dark);ear.rotation_euler.y=-.2
ear=dogell('小狗 · 右垂耳',(.16,.52,1.35),(.12,.11,.235),fur_dark);ear.rotation_euler.x=-.2
tube('小狗 · 弯曲蓬松尾巴',[(dx,dy-.43,1.12),(dx+.08,dy-.65,1.31),(dx+.15,dy-.68,1.57),(dx+.13,dy-.57,1.72)],.09,fur_light,DOG)
tube('小狗 · 项圈',[(dx-.19,dy+.30,1.38),(dx,dy+.10,1.35),(dx+.19,dy+.28,1.36),(dx,dy+.49,1.38),(dx-.19,dy+.30,1.38)],.028,collar,DOG)
# Short individually modelled tufts soften the toy-like base volumes.
tufts=Batch()
for i in range(1400):
    a=random.random()*2*pi;t=random.uniform(-1,1);rr=math.sqrt(1-t*t)
    x=dx+.273*rr*cos(a);y=dy+.49*t;z=1.10+.312*rr*sin(a)
    if z<.91:continue
    tufts.blade(x,y,z,random.uniform(.025,.06),random.random()*6,.006,.025,0)
tufts.finish('小狗 · 毛尖',[fur_light],DOG)
# Warm afternoon light, cool sky fill, portrait camera.
world=bpy.data.worlds.new('山谷晴空');scene.world=world;world.use_nodes=True;nodes=world.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputWorld');back=nodes.new('ShaderNodeBackground');back.inputs['Color'].default_value=(.54,.70,.82,1);back.inputs['Strength'].default_value=.45;world.node_tree.links.new(back.outputs[0],out.inputs[0])
ld=bpy.data.lights.new('午后暖阳','SUN');lo=bpy.data.objects.new('午后暖阳',ld);LIGHT.objects.link(lo);lo.rotation_euler=(math.radians(28),math.radians(-27),math.radians(-38));ld.energy=2.4;ld.angle=.10;ld.color=(1,.88,.67)
ld=bpy.data.lights.new('天空柔光','AREA');lo=bpy.data.objects.new('天空柔光',ld);LIGHT.objects.link(lo);lo.location=(-3,-2,15);ld.energy=1500;ld.shape='DISK';ld.size=14
camd=bpy.data.cameras.new('参考图竖幅镜头');cam=bpy.data.objects.new('参考图竖幅镜头',camd);LIGHT.objects.link(cam);cam.location=(8.2,-22.5,11.0);target=Vector((.2,8,2.3));cam.rotation_euler=(target-Vector(cam.location)).to_track_quat('-Z','Y').to_euler();camd.lens=43;scene.camera=cam
camd.dof.use_dof=False
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='CUDA';prefs.get_devices()
    gpu=False
    for d in prefs.devices:d.use=d.type!='CPU';gpu=gpu or d.use
    if gpu:scene.cycles.device='GPU'
except Exception:pass
scene.render.resolution_x=800;scene.render.resolution_y=1400;scene.render.resolution_percentage=70
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'countryside_preview.png')
scene.view_settings.view_transform='AgX'
scene.render.film_transparent=False
scene['说明']='依据参考图程序化搭建的可编辑乡村场景。主体为溪流、石桥、稻田、瓦屋、野花与回首小狗。'
scene['参考图片']='codex-clipboard-cffd3d6c-df0d-44be-9bbe-f4bdf6e9915a.png'
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'溪畔秋日_Countryside.blend'))
print('BUILD_COMPLETE',len(scene.objects),'objects')

