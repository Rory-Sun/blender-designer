import * as THREE from 'three';
import {pathX} from './vegetation.js';

export function createPuppy(source) {
 source.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(source),center=bounds.getCenter(new THREE.Vector3()),height=.84,scale=height/bounds.getSize(new THREE.Vector3()).y;
 const group=new THREE.Group();group.name='Puppy with four articulated legs';group.userData.region='puppy';
 const root=new THREE.Bone();root.name='body';const bones=[root],legs=[];
 const limbCenters=[];
 // Estimate four paw positions from the actual generated mesh, keeping the rig
 // matched to this asset instead of stretching it to a generic skeleton.
 const samples=[];
 source.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);v.set((v.x-center.x)*scale,(v.y-bounds.min.y)*scale,(v.z-center.z)*scale);if(v.y<.13)samples.push(v.clone());}});
 for(const [side,front] of [[-1,1],[1,1],[-1,-1],[1,-1]]){
  const points=samples.filter(v=>v.x*side>0&&v.z*front>0),sum=new THREE.Vector3();for(const p of points)sum.add(p);if(points.length)sum.divideScalar(points.length);else sum.set(side*.115,0,front*.20);
  limbCenters.push(sum.clone());const upper=new THREE.Bone(),lower=new THREE.Bone();upper.name=`${front>0?'front':'hind'}_${side>0?'right':'left'}`;lower.name=upper.name+'_knee';upper.position.set(sum.x,.44,sum.z);lower.position.set(0,-.235,0);root.add(upper);upper.add(lower);bones.push(upper,lower);legs.push({upper,lower});
 }
 const tail=new THREE.Bone();tail.name='tail';tail.position.set(0,.47,-.23);root.add(tail);bones.push(tail);
 const skeleton=new THREE.Skeleton(bones);group.add(root);
 source.traverse(o=>{if(!o.isMesh)return;
  const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.translate(-center.x,-bounds.min.y,-center.z);g.scale(scale,scale,scale);
  const p=g.attributes.position,indices=[],weights=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);let closest=0,dist=Infinity;
   limbCenters.forEach((v,j)=>{const d=(x-v.x)**2+(z-v.z)**2;if(d<dist){dist=d;closest=j;}});
   const legWeight=1-THREE.MathUtils.smoothstep(y,.34,.50),kneeWeight=1-THREE.MathUtils.smoothstep(y,.13,.29),tailWeight=THREE.MathUtils.smoothstep(-z,.23,.39)*THREE.MathUtils.smoothstep(y,.40,.57);
   if(tailWeight>.01){indices.push(0,9,0,0);weights.push(1-tailWeight,tailWeight,0,0);}else{indices.push(0,1+closest*2,2+closest*2,0);weights.push(1-legWeight,legWeight*(1-kneeWeight),legWeight*kneeWeight,0);}
  }
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const material=o.material.clone();material.roughness=.85;material.metalness=0;material.envMapIntensity=.3;material.color.set(0xe0bf8d);
  const mesh=new THREE.SkinnedMesh(g,material);mesh.name='Weighted puppy mesh';mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.region='puppy';group.add(mesh);group.updateMatrixWorld(true);mesh.bind(skeleton);mesh.frustumCulled=false;
 });
 group.position.set(-2.18,.29,5.2);group.rotation.y=-.6;
 let running=false,start=0;
 const pathPoint=t=>{const z=5.2-7.5*Math.sin(t*.38);return new THREE.Vector3(pathX(-z)+.22*(1-Math.cos(t*.38)),.29,z);};
 function update(time){
  if(running){const t=time-start,p=pathPoint(t),ahead=pathPoint(t+.035),direction=ahead.sub(p);group.position.copy(p);group.rotation.y=Math.atan2(direction.x,direction.z);const cycle=t*10;
   legs.forEach(({upper,lower},i)=>{const phase=cycle+([0,Math.PI,Math.PI,0][i]);upper.rotation.x=Math.sin(phase)*.48;lower.rotation.x=-Math.max(0,Math.cos(phase))*.64;});
   root.position.y=.019+Math.abs(Math.sin(cycle))*.014;root.rotation.x=Math.sin(cycle*2)*.018;tail.rotation.z=Math.sin(t*7)*.22;
  }else{legs.forEach(({upper,lower})=>{upper.rotation.x=0;lower.rotation.x=0;});root.position.y=Math.sin(time*2.1)*.0018;root.rotation.x=0;tail.rotation.z=Math.sin(time*2.2)*.09;}
 }
 function setRunning(value,time){running=!!value;if(running)start=time;else{group.position.set(-2.18,.29,5.2);group.rotation.y=-.6;}update(time);return running;}
 return {group,update,setRunning,get running(){return running;},get joints(){return bones.map(b=>({name:b.name,rotation:b.rotation.toArray().slice(0,3)}));}};
}
