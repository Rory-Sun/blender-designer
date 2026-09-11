import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {river,riverWidth,pathX,random,windMaterial} from './vegetation.js';
import {isVillageYard} from './village-layout.js';

// These are authored/scanned Poly Haven assets, instanced at their actual scale.
// Atlas UVs are preserved; display-grid translations in the source files are not.
export async function createNatureAssets({scene,land,time,wind,mobile}){
 const loader=new GLTFLoader(),names=['grass_medium_01','fern_02','rock_moss_set_01'];
 const loaded=await Promise.all(names.map(n=>loader.loadAsync(`./assets/nature/${n}/${n}.gltf`)));
 const masks=await Promise.all(names.slice(0,2).map(n=>new THREE.TextureLoader().loadAsync(`./assets/nature/${n}/textures/${n}_alpha_1k.jpg`)));for(const t of masks)t.flipY=false;
 const variants=loaded.map(g=>{const meshes=[];g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone();geometry.computeBoundingBox();const box=geometry.boundingBox,center=box.getCenter(new THREE.Vector3());geometry.translate(-center.x,-box.min.y,-center.z);const size=box.getSize(new THREE.Vector3());meshes.push({geometry,material:o.material.clone(),size,name:o.name});});return meshes;});
 const group=new THREE.Group();group.name='Scanned grasses ferns and mossy creek stones';scene.add(group);
 const rng=random(364),r=(a,b)=>a+rng()*(b-a),dummy=new THREE.Object3D(),c=new THREE.Color(),batches=new Map();
 function place(v,p,kind){const key=kind+v.name;let batch=batches.get(key);if(!batch){batch={v,kind,poses:[]};batches.set(key,batch);}batch.poses.push(p);}
 const grasses=variants[0].filter(v=>/small_|mid_|tall_/.test(v.name)&&v.geometry.index.count<3600),ferns=variants[1],rocks=[variants[2][2],variants[2][5],variants[2][0]];
 let grassCount=0,fernCount=0,rockCount=0;
 for(let i=0;i<(mobile?1800:3500);i++){
  const by=r(-15,7),side=rng()<.66?-1:1,x=river(by)+side*(riverWidth(by)+r(.88,side<0?8:4));
  if(isVillageYard(x,-by)||Math.abs(x-pathX(by))<.77||Math.abs(by-5)<1.2)continue;
  if(rng()>.56+.28*Math.sin(x*1.7+by*.8))continue;
  const v=grasses[Math.floor(rng()*grasses.length)];place(v,{x,y:.25,z:-by,s:r(.19,.32)/v.size.y,ry:r(0,6.28),shade:r(.76,1)},'grass');grassCount++;
 }
 for(let i=0;i<(mobile?22:40);i++){
  const by=r(-12,22),side=rng()<.48?-1:1,x=river(by)+side*(riverWidth(by)+r(.85,1.2));
  if(Math.abs(x-pathX(by))<.8||Math.abs(by-5)<1.4||isVillageYard(x,-by))continue;
  const v=ferns[i%ferns.length];place(v,{x,y:.255,z:-by,s:r(.32,.50),ry:r(0,6.28),shade:r(.75,.95)},'fern');fernCount++;
 }
 for(let i=0;i<(mobile?40:65);i++){
  const by=r(-14,25),side=rng()<.5?-1:1,d=r(-.12,.48);if(Math.abs(by-5)<1.0)continue;
  const x=river(by)+side*(riverWidth(by)+d),v=rocks[i%rocks.length],width=r(.27,.73),s=width/Math.max(v.size.x,v.size.z);
  place(v,{x,y:-.38+Math.max(0,d)*.40,z:-by,s,ry:r(0,6.28),shade:r(.74,.98)},'rock');rockCount++;
 }
 // A few partly submerged central stones interrupt the uninterrupted water strip.
 for(let i=0;i<7;i++){const by=-10+i*4.7,v=rocks[i%rocks.length],s=r(.18,.25);place(v,{x:river(by)+r(-.8,.8),y:-.49,z:-by,s,ry:r(0,6.28),shade:.72},'rock');rockCount++;}
 for(const {v,kind,poses} of batches.values()){
  const mat=v.material;mat.metalness=0;mat.roughness=kind==='rock'?.82:.92;mat.envMapIntensity=.28;
  if(kind!=='rock'){mat.alphaMap=masks[kind==='grass'?0:1];mat.side=THREE.DoubleSide;mat.alphaTest=Math.max(.35,mat.alphaTest);mat.transparent=false;windMaterial(mat,time,wind);}
  const mesh=new THREE.InstancedMesh(v.geometry,mat,poses.length);poses.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.ry,0);dummy.scale.setScalar(p.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,c.setScalar(p.shade));});mesh.name=`${kind}: ${v.name}`;mesh.castShadow=kind==='rock';mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
 }
 // Remove the old low-poly bank stones only after replacements have loaded.
 land.traverse(o=>{
  if(!o.isMesh)return;if(o.name==='terrain_rock'){o.visible=false;return;}
  if(o.name!=='terrain_ground')return;
  const g=o.geometry.clone(),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),by=-z,side=x<river(by)?-1:1,d=Math.abs(x-river(by))-riverWidth(by);
   if(d<-.02||d>1.2||y>.34)continue;
   const notch=.075*Math.sin(by*1.3)+.025*Math.sin(by*4.1),fade=1-THREE.MathUtils.smoothstep(d,.8,1.2);
   p.setX(i,x+side*notch*fade);
   const target=-.36+.625*THREE.MathUtils.smoothstep(d,0,.95)+.014*Math.sin(by*2.4+d*7)*Math.sin(Math.PI*Math.min(d,1));
   p.setY(i,THREE.MathUtils.lerp(y,target,fade));
  }g.computeVertexNormals();g.computeBoundingSphere();o.geometry=g;
 });
 return{group,counts:{grassClumps:grassCount,ferns:fernCount,stones:rockCount}};
}
