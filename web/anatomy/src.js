import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $=id=>document.getElementById(id);
const systems=[['circulatory','循环系统','#da9774'],['respiratory','呼吸系统','#89b9d7'],['digestive','消化系统','#d8b080'],['urinary','泌尿系统','#ae8c97'],['skeletal','骨骼结构','#8ba2bb'],['nervous','神经系统','#bdb18f'],['muscular','肌肉系统','#a8797e']];
const enabled=new Set(systems.filter(s=>s[0]!=='muscular').map(s=>s[0]));
const states={sleep:{label:'睡眠',heart:58,breath:12,text:'身体处于休息状态，心脏与呼吸仍持续工作。此处以较慢节律演示。',time:120},meal:{label:'进食',heart:78,breath:17,text:'食物经食管进入胃，消化道通过蠕动混合并推进内容物。暖色脉冲用于提示消化系统。',time:450},daily:{label:'日常活动',heart:72,breath:16,text:'循环与呼吸协同，为身体输送氧气和营养，并运走代谢产生的废物。',time:540},exercise:{label:'运动',heart:118,breath:26,text:'活动时需氧量增加。本演示加快心脏与肺的节律，表现心肺协同响应。',time:1050}};
const content={
 heart:['心脏通过有节律的收缩与舒张，将血液泵向肺和全身。血液运输氧气、营养及代谢产物。','模型保留心房、心室及部分瓣膜结构。使用“单独观察”或转到侧面，可以更清楚地观察外形。','心脏网格围绕自身中心轻微收缩，节律随生活状态变化。动画是机制示意，不是心肌力学仿真。'],
 lungLeft:['左肺参与气体交换：氧气进入血液，二氧化碳从血液排出。','左肺位于胸腔左侧，模型保留其肺叶轮廓与心脏邻近空间。','吸气时胸腔扩大，肺随之扩张。当前通过小幅网格形变示意呼吸节律。'],
 lungRight:['右肺与左肺一起完成呼吸气体交换，为血液提供氧气。','右肺模型由上、中、下肺叶构成。切换呼吸系统可以观察其空间关系。','动画节律由当前生活状态的呼吸预设驱动，运动时频率更快。'],
 liver:['肝脏产生胆汁，参与食物中脂肪的消化，并处理吸收后的营养物质。','肝脏位于腹腔上部，以人体自身的右侧为主。模型保留真实解剖外形。','进食状态下，暖色光效提示消化相关器官参与活动，不代表器官真实发光。'],
 stomach:['胃接收食管送来的食物，将食物与消化液混合，再逐步送入小肠。','胃位于腹腔上部偏左，连接食管与十二指肠。','消化过程比心跳缓慢。进食时以渐变高亮示意活动，不把一次进食压缩成即时完成的消化。'],
 intestine:['小肠继续分解食物，并吸收大部分营养物质。','小肠由十二指肠、空肠和回肠组成，模型呈现腹腔内盘曲的真实路径。','进食时的暖色脉冲用于提示消化与吸收过程；尚未模拟内容物运输和具体吸收速率。'],
 colon:['大肠吸收水分，并参与粪便的形成与储存。','大肠位于小肠周围，可观察升结肠、横结肠、降结肠和直肠等部分。','消化道通过肌肉运动推进内容物。本版以系统活动高亮呈现，非精确的运输仿真。'],
 esophagus:['食管将吞咽后的食物从咽部运送到胃。','它沿胸腔向下延伸，并穿过膈肌与胃相连。','食管通过蠕动推进食物。本版保留结构路径，进食时高亮关联。'],
 kidneyLeft:['肾脏过滤血液，排出废物和多余水分，并参与维持体内平衡。','左肾位于腹部后方。建议切换背面或单独观察，避免被前方消化器官遮挡。','肾脏持续工作；本版呈现其位置和结构，尚未模拟肾单位中的过滤与重吸收。'],
 kidneyRight:['肾脏过滤血液，排出废物和多余水分，并参与维持体内平衡。','右肾位于腹部后方。切换背面，可观察双肾与脊柱的空间关系。','肾脏持续工作；时间轴不代表真实尿量，首版未进行肾功能数值计算。'],
 brain:['脑整合身体传入的信息，参与运动、感知和多种身体功能的调节。','精细网格保留脑表面沟回及部分内部结构，支持聚焦观察。','本版不推算神经放电或认知状态。脑的高亮用于定位和选择。'],
 arteries:['动脉把血液从心脏输送出去，连接肺循环与体循环。','模型保留主动脉及多处分支，沿真实解剖曲线导出为网格。','暖色用于区分动脉网格，亮度节律用于提示循环持续运行，不代表血液的精确流速。'],
 veins:['静脉将血液送回心脏，是循环网络的一部分。','冷蓝色显示静脉结构。颜色是可视化编码，不代表组织本来的颜色。','当前呈现解剖网络与节律光效，尚未计算压力、流量或血液颗粒路径。'],
 urinaryTract:['尿液由肾脏形成，经输尿管进入膀胱储存，再经尿道排出。','本组包含源模型中的尿路结构，可结合双肾一起观察。','本版不计算储尿量或排尿时间。'],
 accessory:['胰腺和胆道参与消化液的产生与输送，协助食物的分解。','这些结构位于上腹部，与肝脏、胃和小肠相邻。','进食模式下以高亮提示消化协同。'],
 nerves:['脊髓与周围神经连接中枢神经系统和身体各处。','细长网格呈现主要神经的分布与走行。','光效用于结构辨识，未模拟具体神经信号。'],
 muscles:['肌肉收缩产生运动，并参与维持姿势。','该图层展示源文件中的全身肌群，开启后会遮挡部分内脏；可关闭其他系统单独查看。','运动状态展示心肺响应；首版尚未加入全身骨骼绑定与动作。']
};
let selected='heart',tab='overview',minute=540,playing=false,motion=!matchMedia('(prefers-reduced-motion: reduce)').matches,isolate=false,currentState='daily',loaded=false;
let renderer,composer,controls,camera,scene,atlas,fullBounds,focusTween=null;
const meshes=new Map(),wireOverlays=[],labels=[],clock=new THREE.Clock();
let heartPhase=0,breathPhase=0,elapsed=0;

function systemUI(){
 $('system-list').innerHTML=`<label class="system-row all-row"><span class="dot" style="--dot:#dfb38b"></span>全部系统<input aria-label="全部系统" type="checkbox" id="all-systems"></label>`+systems.map(([id,label,color])=>`<label class="system-row"><span class="dot" style="--dot:${color}"></span>${label}<input type="checkbox" data-system="${id}" aria-label="${label}" ${enabled.has(id)?'checked':''}></label>`).join('');
 $('all-systems').indeterminate=enabled.size>0&&enabled.size<systems.length;
 $('all-systems').checked=enabled.size===systems.length;
 document.querySelectorAll('[data-system]').forEach(input=>input.onchange=()=>{input.checked?enabled.add(input.dataset.system):enabled.delete(input.dataset.system);isolate=false;updateVisibility();systemUI();});
 $('all-systems').onchange=e=>{enabled.clear();if(e.target.checked)systems.forEach(s=>enabled.add(s[0]));isolate=false;updateVisibility();systemUI();};
}
function stateAt(m){const h=m/60;return h<7||h>=23?'sleep':(h>=7&&h<8)||(h>=12&&h<13)||(h>=18&&h<19)?'meal':h>=17&&h<18?'exercise':'daily';}
function syncTime(){
 const m=Math.floor(minute),state=stateAt(m);currentState=state;
 $('time-label').textContent=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
 $('time').value=m;
 $('state-name').textContent=states[state].label;$('heart-rate').textContent=states[state].heart;$('breath-rate').textContent=states[state].breath;$('state-description').textContent=states[state].text;
 document.querySelectorAll('[data-event]').forEach(b=>{b.classList.toggle('active',b.dataset.event===state);b.setAttribute('aria-pressed',String(b.dataset.event===state));});
 $('playback-note').textContent=playing?'一天约 120 秒 · 器官节律独立演示':'拖动时间轴，探索一天的身体变化';
}
function setPlaying(value){playing=value;$('play').setAttribute('aria-label',value?'暂停一天':'播放一天');$('play').setAttribute('aria-pressed',String(value));$('play').innerHTML=value?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5H10V19H6ZM14 5H18V19H14Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5L19 12L8 19Z"/></svg>';syncTime();}
function describe(){
 const m=meshes.get(selected);if(!m)return;
 const d=m.userData; $('organ-name').textContent=d.label;$('organ-en').textContent=d.english;$('selection-label').textContent=d.label;
 $('organ-dot').style.background=systems.find(s=>s[0]===d.system)?.[2]||'#dfb38b';
 const texts=content[selected]||['骨骼支撑身体、保护器官，并与肌肉和关节配合完成运动。','精细网格来自 Blender 解剖源模型，保留真实骨骼表面形态与相对位置。','本版骨骼保持静止，作为观察内部器官的空间参照。'];
 $('description').textContent=texts[['overview','structure','function'].indexOf(tab)];
 $('organ-picker').value=selected;
}
function choose(id){if(!meshes.has(id))return;selected=id;enabled.add(meshes.get(id).userData.system);updateVisibility();systemUI();describe();}
function updateVisibility(){
 if(!loaded)return;
 for(const [id,m] of meshes){m.visible=m.userData.system==='shell'?!isolate&&Number($('opacity').value)<100:(!isolate?enabled.has(m.userData.system):id===selected);}
 $('isolate').setAttribute('aria-pressed',String(isolate));$('isolate').textContent=isolate?'返回系统视图':'单独观察';
 if(!isolate&&!meshes.get(selected)?.visible){const alternative=[...meshes].find(([id,m])=>id!=='body'&&m.visible);if(alternative){selected=alternative[0];describe();}else{selected='';$('organ-name').textContent='选择身体系统';$('organ-en').textContent='EXPLORE ANATOMY';$('description').textContent='开启左侧的身体系统，或从结构列表选择一个器官。';$('selection-label').textContent='选择一个身体系统';$('organ-picker').selectedIndex=-1;}}
 $('focus').disabled=!selected;$('isolate').disabled=!selected;
 labels.forEach(l=>l.el.hidden=!meshes.get(l.id)?.visible||isolate);
}
function fit(bounds,direction='front',instant=false){
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const vfov=THREE.MathUtils.degToRad(camera.fov);const distance=Math.max(size.y/(2*Math.tan(vfov/2)),size.x/(2*Math.tan(vfov/2)*camera.aspect),size.z)*1.24;
 const dir=direction==='back'?new THREE.Vector3(0,.03,-1):direction==='side'?new THREE.Vector3(1,.03,0):new THREE.Vector3(0,.025,1);
 const position=center.clone().addScaledVector(dir,Math.max(.35,distance));
 if(instant){camera.position.copy(position);controls.target.copy(center);controls.update();}else{focusTween={from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),target:center,start:performance.now()};}
}
function organBounds(){const m=meshes.get(selected);return m?new THREE.Box3().setFromObject(m):fullBounds;}
// Stacked translucent layers (skull, ribs, lungs) turn into haze when every facing surface adds the same alpha. Fade camera-facing areas and keep silhouettes so bone reads as an X-ray outline.
function xray(mat,facingAlpha){mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
float facing=abs(dot(normalize(normal),normalize(vViewPosition)));gl_FragColor.a*=mix(1.9,${facingAlpha},pow(facing,.75));`);};}
function shellMaterial(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,blending:THREE.AdditiveBlending,uniforms:{alpha:{value:.24},color:{value:new THREE.Color('#669ecf')}},vertexShader:`varying vec3 vNormal;varying vec3 vView;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform float alpha;uniform vec3 color;varying vec3 vNormal;varying vec3 vView;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),2.8);gl_FragColor=vec4(color*(.5+rim*1.7),alpha*(.035+rim*.965));}`});}
function configureMesh(m){
 const id=m.userData.id||m.name;m.userData.id=id;
 const sys=m.userData.system;if(!sys)return;
 meshes.set(id,m);m.userData.restScale=m.scale.clone();
 if(sys==='shell'){m.material=shellMaterial();m.renderOrder=4;return;}
 const palettes={heart:'#ca794a',arteries:'#b87452',veins:'#397ab5',brain:'#bc9477',lungLeft:'#998478',lungRight:'#998478',liver:'#aa6538',stomach:'#d3a374',intestine:'#b99063',colon:'#b58860',kidneyLeft:'#b47964',kidneyRight:'#b47964'};
 const color=palettes[id]||(sys==='skeletal'?'#7590ac':sys==='muscular'?'#8d5d59':sys==='nervous'?'#aa997f':'#b18965');
 const opacity=sys==='skeletal'?.34:sys==='muscular'?.55:sys==='respiratory'?.5:1;
 m.material=new THREE.MeshStandardMaterial({color,roughness:.43,metalness:.18,emissive:color,emissiveIntensity:id==='heart'?.38:sys==='circulatory'?.45:.08,transparent:opacity<1,opacity,depthWrite:opacity===1,side:opacity<1?THREE.FrontSide:THREE.DoubleSide});
 if(opacity<1)xray(m.material,sys==='skeletal'?.28:.5);
 m.userData.baseEmission=m.material.emissiveIntensity;m.renderOrder=opacity<1?2:0;
 if(['heart','lungLeft','lungRight','brain','liver','stomach','intestine'].includes(id)){
   const wire=new THREE.Mesh(m.geometry,new THREE.MeshBasicMaterial({color:id==='brain'?'#cba886':'#edb786',wireframe:true,transparent:true,opacity:.045,depthWrite:false,blending:THREE.AdditiveBlending}));m.add(wire);wireOverlays.push(wire);
 }
}
function addFloor(){
 const min=fullBounds.min.y,center=fullBounds.getCenter(new THREE.Vector3());
 for(const radius of [.28,.40,.58]){const points=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*radius+center.x,min-.015,Math.sin(a)*radius+center.z));}const circle=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#3b6e8e',transparent:true,opacity:.32}));scene.add(circle);}
}
function addLabels(){
 for(const [id,label,side] of [['brain','脑',1],['heart','心脏',1],['lungRight','肺',-1],['liver','肝脏',-1],['stomach','胃',1],['intestine','肠',1]]){
  if(!meshes.has(id))continue;const mesh=meshes.get(id);mesh.geometry.computeBoundingBox();const anchor=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());const el=document.createElement('button');el.className=`anatomy-label side-${side}`;el.textContent=label;el.setAttribute('aria-label',`选择${label}`);el.onclick=()=>choose(id);$('canvas-host').append(el);labels.push({id,el,side,anchor});
 }
}
function resize(){
 if(!renderer)return;const host=$('canvas-host'),w=host.clientWidth,h=host.clientHeight;if(!w||!h)return; // Hidden or unlaid-out host would create zero-size render targets.
 camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);composer.setSize(w,h);
 if(loaded)fit(fullBounds,'front',true);
}
async function init(){
 try{
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.01,30);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x090e14,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
 $('canvas-host').append(renderer.domElement);renderer.domElement.setAttribute('aria-label','人体三维模型，使用左侧选择结构或拖动旋转');
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.18;controls.maxDistance=7;controls.maxPolarAngle=Math.PI*.95;controls.addEventListener('start',()=>focusTween=null);
 scene.add(new THREE.HemisphereLight(0xc4dfff,0x27180f,2.5));
 const key=new THREE.DirectionalLight(0xf7dbc2,3.2);key.position.set(-2,3,3);scene.add(key);const rim=new THREE.DirectionalLight(0x639fe7,4);rim.position.set(2,2,-2);scene.add(rim);
 // Composer default target has no MSAA; thin vessels and bone edges alias without a multisampled target.
 composer=new EffectComposer(renderer,new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4}));composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(800,800),.22,.5,.72));composer.addPass(new OutputPass());
 resize();new ResizeObserver(resize).observe($('canvas-host'));
 const gltf=await new GLTFLoader().loadAsync('assets/human-atlas.glb',e=>{$('loading-progress').textContent=e.total?`${Math.round(e.loaded/e.total*100)}% · 加载精细网格`:`已读取 ${(e.loaded/1048576).toFixed(1)} MB`;});
 atlas=gltf.scene;scene.add(atlas);atlas.traverse(o=>{if(o.isMesh)configureMesh(o);});
 if(!meshes.has('body')||!meshes.has('heart'))throw new Error('模型缺少必要的身体或心脏结构');
 fullBounds=new THREE.Box3().setFromObject(meshes.get('body'));
 addFloor();addLabels();loaded=true;updateVisibility();fit(fullBounds,'front',true);
 $('organ-picker').innerHTML=[...meshes].filter(([id])=>id!=='body').map(([id,m])=>`<option value="${id}">${m.userData.label}</option>`).join('');
 $('loader').hidden=true;describe();$('asset-note').textContent=`Blender 精细解剖模型 · ${meshes.size-1} 组可选结构`;
 $('opacity').dispatchEvent(new Event('input'));
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down={x:0,y:0};
 function pick(e){const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects([...meshes.values()].filter(m=>m.visible&&m.userData.id!=='body'),false)[0];}
 renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
 renderer.domElement.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){const hit=pick(e);if(hit)choose(hit.object.userData.id);}});
 renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons){$('tooltip').hidden=true;return;}const hit=pick(e);$('tooltip').hidden=!hit;renderer.domElement.style.cursor=hit?'pointer':'grab';if(hit){const rect=renderer.domElement.getBoundingClientRect();$('tooltip').textContent=hit.object.userData.label;$('tooltip').style.left=`${Math.min(e.clientX-rect.left+14,rect.width-150)}px`;$('tooltip').style.top=`${e.clientY-rect.top+12}px`;}});
 renderer.domElement.addEventListener('pointerleave',()=>$('tooltip').hidden=true);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loader').hidden=false;$('loader').innerHTML='<strong>三维显示已暂停</strong><span>请刷新页面重新载入模型。</span>';});
 animate();
 }catch(error){console.error(error);$('loader').innerHTML='<strong>模型暂时无法载入</strong><span>请确认通过本地服务打开，并重新加载。</span><button class="secondary" id="retry">重新加载</button>';$('retry').onclick=()=>location.reload();}
}
function animate(){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.06);
 if(playing){minute=(minute+dt*12)%1440;syncTime();}
 if(motion){elapsed+=dt;heartPhase+=dt*states[currentState].heart/60*Math.PI*2;breathPhase+=dt*states[currentState].breath/60*Math.PI*2;}
 for(const [id,m] of meshes){
  if(id==='body')continue;
  const heartbeat=Math.pow(Math.max(0,Math.sin(heartPhase)),4);
  if(id==='heart')m.scale.copy(m.userData.restScale).multiplyScalar(1-heartbeat*.035);
  if(id==='lungLeft'||id==='lungRight')m.scale.copy(m.userData.restScale).multiplyScalar(1+Math.sin(breathPhase)*.018);
  let em=m.userData.baseEmission+(selected===id?.16:0);
  if(id==='heart')em+=heartbeat*.32;
  if(m.userData.system==='digestive'&&currentState==='meal')em+=.16+.10*Math.sin(elapsed*1.3);
  m.material.emissiveIntensity=em;
 }
 if(focusTween){const p=Math.min(1,(performance.now()-focusTween.start)/700),s=1-Math.pow(1-p,3);camera.position.lerpVectors(focusTween.from,focusTween.to,s);controls.target.lerpVectors(focusTween.targetFrom,focusTween.target,s);if(p===1)focusTween=null;}
 controls.update();
 const host=$('canvas-host'),rect={w:host.clientWidth,h:host.clientHeight};
 for(const l of labels){const m=meshes.get(l.id);if(!m.visible||isolate){l.el.hidden=true;continue;}const center=m.localToWorld(l.anchor.clone()).project(camera);const x=(center.x*.5+.5)*rect.w,y=(-center.y*.5+.5)*rect.h;l.el.hidden=center.z>1||x<40||x>rect.w-40||y<95||y>rect.h-85;if(!l.el.hidden){l.el.style.left=`${x+l.side*70}px`;l.el.style.top=`${y}px`;l.el.classList.toggle('selected',selected===l.id);}}
 composer.render();
}
systemUI();syncTime();
document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{minute=states[b.dataset.event].time;syncTime();});
$('play').onclick=()=>setPlaying(!playing);$('time').oninput=e=>{minute=Number(e.target.value);syncTime();};
$('opacity').oninput=e=>{const v=Number(e.target.value);$('opacity-value').textContent=`${v}%`;const body=meshes.get('body');if(body){body.material.uniforms.alpha.value=(1-v/100)*2;body.visible=!isolate&&v<100;}};
$('organ-picker').onchange=e=>choose(e.target.value);
$('focus').onclick=()=>{if(loaded)fit(organBounds());};$('isolate').onclick=()=>{if(!loaded)return;isolate=!isolate;updateVisibility();fit(isolate?organBounds():fullBounds);};
$('reset').onclick=()=>{if(!loaded)return;isolate=false;updateVisibility();fit(fullBounds);};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(loaded)fit(isolate?organBounds():fullBounds,b.dataset.view);});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));$('description').setAttribute('aria-labelledby',b.id);describe();});
document.querySelectorAll('[data-tab]').forEach((b,i)=>b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')],next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;tabs[next].focus();tabs[next].click();}}));
function syncMotion(){$('motion').textContent=motion?'暂停器官动画':'播放器官动画';$('motion').setAttribute('aria-pressed',String(motion));}
$('motion').onclick=()=>{motion=!motion;syncMotion();};syncMotion();
$('credits-open').onclick=()=>$('credits').showModal();$('credits-close').onclick=()=>$('credits').close();
document.addEventListener('visibilitychange',()=>{clock.getDelta();});
// Read-only diagnostic state used by browser smoke checks.
window.atlasStatus=()=>({loaded,selected,minute,state:currentState,playing,motion,isolate,visible:[...meshes].filter(([,m])=>m.visible).map(([id])=>id),meshCount:meshes.size,camera:camera?.position.toArray(),triangles:renderer?.info.render.triangles});
init();
