import bpy, os
s=bpy.context.scene
dest=os.path.join(os.path.dirname(os.path.abspath(__file__)),'motion-mask.png')
original={o:o.color[:] for o in s.objects}
settings=(s.render.filepath,s.cycles.samples,s.cycles.use_denoising,s.view_settings.view_transform,s.view_settings.exposure,s.view_layers[0].material_override,s.world)
mask=bpy.data.materials.new('临时 · 动效遮罩');mask.use_nodes=True
nodes=mask.node_tree.nodes;nodes.clear()
info=nodes.new('ShaderNodeObjectInfo');em=nodes.new('ShaderNodeEmission');out=nodes.new('ShaderNodeOutputMaterial')
mask.node_tree.links.new(info.outputs['Color'],em.inputs[0]);mask.node_tree.links.new(em.outputs[0],out.inputs[0])
world=bpy.data.worlds.new('临时 · 遮罩黑背景');world.use_nodes=True
for n in world.node_tree.nodes:
    if n.type=='BACKGROUND':n.inputs[0].default_value=(0,0,0,1)
for o in s.objects:
    o.color=(0,0,0,1)
    if o.name.startswith(('蜿蜒溪流','细碎水花','溪面波光')):o.color=(1,0,0,1)
    elif o.name.startswith(('稻叶','垂垂稻穗','树冠','野草','前景草甸','野花','溪畔波斯菊','溪岸繁茂')):o.color=(0,1,0,1)
    elif o.name.startswith('小狗 · 弯曲蓬松尾巴'):o.color=(0,0,1,1)
s.world=world;s.view_layers[0].material_override=mask
s.cycles.samples=1;s.cycles.use_denoising=False;s.view_settings.view_transform='Standard';s.view_settings.exposure=0;s.render.filepath=dest
def render_mask():
    try:bpy.ops.render.render(write_still=True)
    finally:
        for o,color in original.items():o.color=color
        s.render.filepath,s.cycles.samples,s.cycles.use_denoising,s.view_settings.view_transform,s.view_settings.exposure,s.view_layers[0].material_override,s.world=settings
        bpy.data.materials.remove(mask);bpy.data.worlds.remove(world)
    return None
bpy.app.timers.register(render_mask,first_interval=1)
print('MASK_RENDER_SCHEDULED')
