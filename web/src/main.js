import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {createVegetation,hillHeight,random,river,riverWidth} from './vegetation.js';
import {createCreek} from './water.js';
import {NatureAudio} from './audio.js';
import {createVillage} from './village.js';
import {createPuppy} from './puppy.js';

const $=id=>document.getElementById(id),canvas=$('world'),stage=$('stage'),params=new URLSearchParams(location.search),mobile=innerWidth<720;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={ready:false,selected:'overview',light:'sunset',motion:!reduced.matches,audio:false,frames:0,fps:0,error:null,quality:mobile?'balanced':'high',is3D:true};
let renderer,controls,camera,scene,creek,puppy,puppyRig,village,nature,sun,hemi,sky,environmentTarget,pmrem,transition=null,lightTransition=null,last=0,elapsed=0,lastRender=0,raf=0,disposed=false;
const time={value:0},wind={value:.7},clock={frames:0,time:0},pickables=[],raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),v3=new THREE.Vector3(),audio=new NatureAudio();
const presets={
 overview:{position:[-5.7,2.85,12.8],target:[.5,1.2,-10.5]},
 bridge:{position:[-2.7,2.35,1.9],target:[2.63,.55,-5]},
 rice:{position:[-9.5,2.45,-3.0],target:[-5.2,.88,-14.8]},
 puppy:{position:[-2.9,1.65,8.6],target:[-2.18,.69,5.2]},
 village:{position:[2.5,2.9,-15.8],target:[6.8,2.25,-24.3]}
};
const details={overview:['溪畔秋日','拖动环绕 · 滚轮拉近 · 点击探索'],bridge:['溪上的石桥','石板上的苔痕，记录着日复一日的水声。'],rice:['风经过稻田','稻穗微微俯身，阳光落在叶尖。'],puppy:['溪边的小伙伴','让它沿小路跑一圈，跟随它看看沿途的风景。'],village:['山脚的农舍','灰瓦、土墙与树影，是山村熟悉的颜色。']};
const hotspotDefs=[{id:'bridge',label:'石桥',pos:new THREE.Vector3(2.6,1.25,-5)},{id:'puppy',label:'小狗',pos:new THREE.Vector3(-2.18,1.22,5.2)},{id:'village',label:'农舍',pos:new THREE.Vector3(5.3,3.55,-22.2)}];
const modes={sunset:{label:'暖夕',sun:0xffd69a,sky:0xb5c9ca,energy:3.4,hemi:.65,elevation:32,azimuth:315,exposure:.76,fog:.010},day:{label:'晴日',sun:0xfff3d6,sky:0xb4d1da,energy:3.2,hemi:.7,elevation:50,azimuth:330,exposure:.8,fog:.008},mist:{label:'晨雾',sun:0xf6e4bd,sky:0xc1ceca,energy:2.0,hemi:.7,elevation:18,azimuth:300,exposure:.85,fog:.020}};
const currentLight={...modes.sunset,sun:new THREE.Color(modes.sunset.sun),sky:new THREE.Color(modes.sunset.sky)};
function progress(value,label){const n=Math.max(Number($('progress').dataset.value||0),value);$('progress').dataset.value=n;$('progress').style.width=n+'%';$('loading-label').textContent=label;}
function textureSet(loader,prefix){return Promise.all(['color','normal','rough'].map(channel=>loader.loadAsync(`./assets/${prefix}-${channel}.jpg`)));}
function materialFrom(maps,options={}){const [map,normalMap,roughnessMap]=maps;map.colorSpace=THREE.SRGBColorSpace;for(const t of maps){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}return new THREE.MeshStandardMaterial({map,normalMap,roughnessMap,normalScale:new THREE.Vector2(.65,.65),roughness:.93,...options});}
function addMountains(material){
 const g=new THREE.PlaneGeometry(210,220,130,140);g.rotateX(-Math.PI/2);g.translate(0,0,-40);const p=g.attributes.position,colors=[];const c=new THREE.Color();
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=hillHeight(x,z);p.setY(i,h);g.attributes.uv.setXY(i,x*.13,z*.13);const f=(Math.sin(x*.34+z*.57)+1)*.5;c.setHSL(.25-f*.025,.18+f*.09,.27+f*.06);colors.push(c.r,c.g,c.b);}
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 const mat=material.clone();mat.vertexColors=true;mat.color.set(0xa4b380);const o=new THREE.Mesh(g,mat);o.name='Mountain valley terrain';o.receiveShadow=true;scene.add(o);
}
function setEnvironment(){if(!pmrem)return;const env=new THREE.Scene();env.add(sky.clone());const next=pmrem.fromScene(env,.025,.1,500);scene.environment=next.texture;if(environmentTarget)environmentTarget.dispose();environmentTarget=next;}
function lighting(force=false){
 const m=currentLight,phi=THREE.MathUtils.degToRad(90-m.elevation),theta=THREE.MathUtils.degToRad(m.azimuth),direction=new THREE.Vector3().setFromSphericalCoords(1,phi,theta);
 sun.position.copy(direction).multiplyScalar(70).add(new THREE.Vector3(0,0,-8));sun.color.copy(m.sun);sun.intensity=m.energy;hemi.intensity=m.hemi;scene.fog.color.copy(m.sky);scene.fog.density=m.fog;renderer.setClearColor(m.sky);renderer.toneMappingExposure=m.exposure;
 sky.material.uniforms.sunPosition.value.copy(direction);sky.material.uniforms.turbidity.value=state.light==='mist'?6:2.6;sky.material.uniforms.rayleigh.value=1.2;
 if(creek){creek.mesh.material.uniforms.sunDirection.value.copy(direction);creek.mesh.material.uniforms.sunColor.value.copy(m.sun);}
 renderer.shadowMap.needsUpdate=true;if(force)setEnvironment();
}
function setLight(next){if(!modes[next])return;state.light=next;const target=modes[next];$('light-label').textContent=target.label;$('lighting').setAttribute('aria-label','切换光照，当前'+target.label);lightTransition={start:performance.now(),from:{...currentLight,sun:currentLight.sun.clone(),sky:currentLight.sky.clone()},to:target};announce('光照已切换为'+target.label);}
function announce(text){$('live-status').textContent=text;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2300);}
function focus(id,{instant=false}={}){if(!presets[id]||!state.ready)return;state.selected=id;document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});document.querySelectorAll('.hotspot').forEach(b=>b.classList.toggle('selected',b.dataset.object===id));$('detail-title').textContent=details[id][0];$('detail-copy').textContent=details[id][1];$('detail').classList.toggle('visible',id!=='overview');$('dog-run').hidden=id!=='puppy';$('help').classList.toggle('muted',id!=='overview');
 const offset=id==='puppy'&&puppyRig?.running?puppy.position.clone().sub(new THREE.Vector3(-2.18,.29,5.2)):new THREE.Vector3();const p={position:new THREE.Vector3(...presets[id].position).add(offset).toArray(),target:new THREE.Vector3(...presets[id].target).add(offset).toArray()};if(instant||reduced.matches){camera.position.fromArray(p.position);controls.target.fromArray(p.target);controls.update();transition=null;}else transition={start:performance.now(),from:camera.position.clone(),targetFrom:controls.target.clone(),to:new THREE.Vector3(...p.position),targetTo:new THREE.Vector3(...p.target)};
 announce('已聚焦：'+details[id][0]);}
function updateHotspots(){
 for(const h of hotspotDefs){if(h.id==='puppy'&&puppy)h.pos.copy(puppy.position).add(new THREE.Vector3(0,1.0,0));const p=h.pos.clone().project(camera),el=h.element;const visible=p.z<1&&p.z>-1&&Math.abs(p.x)<.94&&Math.abs(p.y)<.83&&camera.position.distanceTo(h.pos)<75;el.hidden=!visible;if(visible){el.style.transform=`translate(${(p.x*.5+.5)*innerWidth}px,${(-p.y*.5+.5)*innerHeight}px) translate(-50%,-50%)`;}}
}
function setupInteraction(){
 for(const h of hotspotDefs){const b=document.createElement('button');b.type='button';b.className='hotspot';b.dataset.object=h.id;b.innerHTML=`<span class="hotspot-dot"></span><span class="hotspot-label">${h.label}</span>`;b.setAttribute('aria-label','探索'+h.label);b.addEventListener('click',()=>focus(h.id));$('hotspots').appendChild(b);h.element=b;}
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>focus(b.dataset.view)));
 $('reset').addEventListener('click',()=>focus('overview'));
 let down=null,hoverAt=0;
 function intersects(e){const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables,true);}
 canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6){down=null;return;}down=null;if(!state.ready)return;const hit=intersects(e)[0];if(!hit)return;let region=hit.object.userData.region;for(let o=hit.object;!region&&o.parent;o=o.parent)region=o.parent.userData.region;if(region==='water'){creek.ripple(hit.point,elapsed);audio.plop();toast('水面荡开了涟漪');announce('溪水泛起涟漪');}else if(region==='bridge'||region==='village'||region==='puppy'||region==='rice')focus(region);});
 canvas.addEventListener('pointermove',e=>{if(!state.ready||performance.now()-hoverAt<120)return;hoverAt=performance.now();canvas.style.cursor=intersects(e).length?'pointer':'grab';});
 controls.addEventListener('start',()=>{transition=null;document.body.classList.add('interacting');});controls.addEventListener('end',()=>document.body.classList.remove('interacting'));
 $('lighting').addEventListener('click',()=>{const keys=['sunset','day','mist'];setLight(keys[(keys.indexOf(state.light)+1)%keys.length]);});
 $('motion').addEventListener('click',()=>setMotion(!state.motion));$('dog-run').addEventListener('click',()=>runPuppy(!puppyRig.running));
 $('sound').addEventListener('click',async()=>{try{state.audio=await audio.toggle();$('sound').setAttribute('aria-pressed',String(state.audio));$('sound').setAttribute('aria-label',state.audio?'关闭自然声音':'开启自然声音');$('sound').classList.toggle('on',state.audio);toast(state.audio?'听见溪流与鸟鸣':'自然声音已关闭');}catch{toast('当前浏览器暂不支持声音');}});
 $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.body.classList.toggle('immersive');}syncFullscreen();});
 document.addEventListener('fullscreenchange',syncFullscreen);
 document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key.toLowerCase()==='r')focus('overview');if(['1','2','3','4'].includes(e.key))focus(['overview','bridge','rice','puppy'][Number(e.key)-1]);if(e.code==='Space'&&!e.repeat&&document.activeElement.tagName!=='BUTTON'){e.preventDefault();setMotion(!state.motion);}if(e.key==='Escape'){document.body.classList.remove('immersive');syncFullscreen();if(state.selected!=='overview')focus('overview');}});
}
function runPuppy(value){if(!puppyRig)return;puppyRig.setRunning(value,elapsed);renderer.shadowMap.needsUpdate=true;if(value)setMotion(true);$('dog-run').textContent=value?'让它歇一会':'让小狗跑起来';$('dog-run').setAttribute('aria-pressed',String(value));if(!value&&state.selected==='puppy')focus('puppy');announce(value?'小狗沿着溪边小路跑起来了':'小狗回到原处休息');}
function syncFullscreen(){const active=!!document.fullscreenElement||document.body.classList.contains('immersive');$('fullscreen').setAttribute('aria-pressed',String(active));$('fullscreen').setAttribute('aria-label',active?'退出全屏':'进入全屏');resize();}
function setMotion(value){state.motion=!!value;$('motion').setAttribute('aria-label',state.motion?'暂停自然动效':'播放自然动效');$('motion').setAttribute('aria-pressed',String(!state.motion));$('motion-icon').innerHTML=state.motion?'<path d="M8 5v14M16 5v14"/>':'<path d="m8 5 11 7-11 7Z"/>';announce(state.motion?'自然动效已播放':'自然动效已暂停，相机仍可操作');}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,state.quality==='balanced'?1:1.4));if(state.ready)updateHotspots();}
function animate(now){
 raf=requestAnimationFrame(animate);if(disposed||document.hidden)return;if(now-lastRender<1000/30)return;const dt=last?Math.min((now-last)/1000,.08):0;last=now;lastRender=now;if(state.motion)elapsed+=dt;time.value=elapsed;
 if(transition){const t=Math.min(1,(now-transition.start)/1500),e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;camera.position.lerpVectors(transition.from,transition.to,e);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,e);if(t===1)transition=null;}
 if(lightTransition){const t=Math.min(1,(now-lightTransition.start)/1600),e=t*t*(3-2*t),f=lightTransition.from,to=lightTransition.to;for(const k of ['energy','hemi','elevation','azimuth','exposure','fog'])currentLight[k]=THREE.MathUtils.lerp(f[k],to[k],e);currentLight.sun.lerpColors(f.sun,new THREE.Color(to.sun),e);currentLight.sky.lerpColors(f.sky,new THREE.Color(to.sky),e);lighting(t===1);if(t===1)lightTransition=null;}
 controls.update(dt);controls.target.y=THREE.MathUtils.clamp(controls.target.y,.45,12);camera.position.y=Math.max(.7,camera.position.y);
 if(creek)creek.update(elapsed);if(puppyRig){const before=puppy.position.clone();puppyRig.update(elapsed);if(puppyRig.running&&state.motion){renderer.shadowMap.needsUpdate=state.frames%3===0;if(state.selected==='puppy'&&!transition){const delta=puppy.position.clone().sub(before);camera.position.add(delta);controls.target.add(delta);}}}
 updateHotspots();renderer.render(scene,camera);state.frames++;clock.frames++;clock.time+=dt;if(clock.time>2){state.fps=Math.round(clock.frames/clock.time);clock.time=0;clock.frames=0;}
}
async function init(){
 try{
  progress(4,'沿着溪流，走进山野');
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  scene=new THREE.Scene();scene.environmentIntensity=.18;scene.fog=new THREE.FogExp2(0xb5c9ca,.01);
  camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.12,420);camera.position.fromArray(presets.overview.position);
  controls=new OrbitControls(camera,canvas);controls.target.fromArray(presets.overview.target);controls.enableDamping=!reduced.matches;controls.dampingFactor=.08;controls.rotateSpeed=.6;controls.zoomSpeed=.8;controls.enablePan=true;controls.minDistance=2;controls.maxDistance=66;controls.minPolarAngle=.12;controls.maxPolarAngle=1.52;controls.maxTargetRadius=44;controls.cursor.set(0,1,-9);controls.update();resize();
  hemi=new THREE.HemisphereLight(0xcbe0e4,0x5b6036,1.3);scene.add(hemi);
  sun=new THREE.DirectionalLight(0xffd69a,3.4);sun.target.position.set(0,0,-8);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:34,bottom:-34,near:1,far:150});sun.shadow.bias=-.00025;sun.shadow.normalBias=.05;sun.shadow.radius=2;
  sky=new Sky();sky.scale.setScalar(350);sky.material.uniforms.mieCoefficient.value=.004;sky.material.uniforms.mieDirectionalG.value=.78;scene.add(sky);pmrem=new THREE.PMREMGenerator(renderer);
  const loader=new THREE.TextureLoader(),gltfLoader=new GLTFLoader();let completed=0;const loaded=p=>p.then(v=>{completed++;progress(10+completed*5,'阳光正落在草木之间');return v;});
  const [stone,plaster,ground,soil,bark,roof,wood,leaf,normal,land,dog]=await Promise.all([textureSet(loader,'stone'),textureSet(loader,'plaster'),textureSet(loader,'ground'),textureSet(loader,'soil'),textureSet(loader,'bark'),textureSet(loader,'roof'),textureSet(loader,'wood'),loader.loadAsync('./assets/leaves.png'),loader.loadAsync('./assets/water-normal.jpg'),gltfLoader.loadAsync('./assets/countryside.glb'),gltfLoader.loadAsync('./assets/puppy-original.glb')].map(loaded));
  const materials={stone:materialFrom(stone,{color:0xc6c3aa}),plaster:materialFrom(plaster,{color:0xe9e1c7}),ground:materialFrom(ground,{color:0xaeb581}),soil:materialFrom(soil,{color:0xe0cba4}),bark:materialFrom(bark,{color:0xb7b399}),roof:materialFrom(roof,{color:0x9eaa9c}),wood:materialFrom(wood,{color:0x9a8870}),dark:new THREE.MeshStandardMaterial({color:0x182219,roughness:.95})};materials.earthwall=materials.plaster.clone();materials.earthwall.color.set(0xd5bc85);materials.rock=materials.stone.clone();materials.rock.color.set(0x969d88);
  scene.add(land.scene);land.scene.traverse(o=>{if(!o.isMesh)return;if(o.userData.region==='village'||o.name.startsWith('village_')){o.visible=false;return;}const key=o.userData.surface||o.name.split('_').at(-1);o.material=materials[key]||materials.stone;o.castShadow=key!=='ground'&&key!=='soil';o.receiveShadow=true;o.userData.region=o.userData.region||o.name.split('_')[0];if(['bridge','village'].includes(o.userData.region))pickables.push(o);});
  addMountains(materials.ground);
  progress(73,'草木随风，溪水有声');
  nature=await createVegetation({scene,materials,leafTexture:leaf,time,wind,mobile});
  village=createVillage(scene,materials);pickables.push(village.group);
  puppyRig=createPuppy(dog.scene);puppy=puppyRig.group;scene.add(puppy);pickables.push(puppy);
  lighting();const direction=sun.position.clone().sub(sun.target.position).normalize();creek=createCreek(scene,normal,direction,mobile);pickables.push(creek.mesh);
  const riceProxy=new THREE.Mesh(new THREE.BoxGeometry(18,1.0,18),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}));riceProxy.position.set(-9,.76,-17);riceProxy.userData.region='rice';scene.add(riceProxy);pickables.push(riceProxy);
  setEnvironment();setupInteraction();setMotion(state.motion);
  progress(92,'风景即将展开');await renderer.compileAsync(scene,camera);renderer.shadowMap.needsUpdate=true;
  state.ready=true;document.body.dataset.ready='true';updateHotspots();renderer.render(scene,camera);progress(100,'欢迎来到溪畔');$('loading').classList.add('complete');setTimeout(()=>$('loading').hidden=true,550);announce('三维场景已就绪。拖动环绕，滚轮拉近，点击物体探索。');
  raf=requestAnimationFrame(animate);
 }catch(error){state.error=String(error.message||error);console.error('Countryside initialization failed',error);$('loading').classList.add('error');$('loading-label').textContent='暂时没能展开三维风景';$('load-error').hidden=false;$('retry').addEventListener('click',()=>location.reload());}
}
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)audio.suspend();else audio.resume();});reduced.addEventListener('change',e=>{if(e.matches)setMotion(false);if(controls)controls.enableDamping=!e.matches;});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();state.ready=false;toast('画面正在恢复，请稍候');});canvas.addEventListener('webglcontextrestored',()=>location.reload());
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);audio.suspend();});
window.exhibit=Object.freeze({getState:()=>({...state,camera:camera?.position.toArray(),target:controls?.target.toArray(),ripples:creek?.total||0,nature:nature?.counts,village:village?.counts,puppy:puppyRig?{running:puppyRig.running,position:puppy.position.toArray(),joints:puppyRig.joints}:null,renderInfo:renderer?{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}:null}),focus,setLight,setMotion,runPuppy,project:id=>{const h=hotspotDefs.find(h=>h.id===id);if(!h||!camera)return null;const p=h.pos.clone().project(camera);return{x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight};}});
init();
