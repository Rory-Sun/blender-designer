import * as THREE from 'three';
import {createPuppyMotion} from './puppy-motion.js';

export function createPuppy(source) {
 // This generated asset faces 42.3 degrees left of +Z. Bake its correction
 // before measuring paws and binding bones so mesh, rig and route share +Z.
 source.rotation.y+=THREE.MathUtils.degToRad(42.3);
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
  limbCenters.push(sum.clone());const upper=new THREE.Bone(),lower=new THREE.Bone();upper.name=`${front>0?'front':'hind'}_${side>0?'right':'left'}`;lower.name=upper.name+'_knee';upper.position.set(sum.x,.44,sum.z);const length1=front>0?.12:.235,length2=.44-length1;lower.position.set(0,-length1,0);root.add(upper);upper.add(lower);bones.push(upper,lower);const paw=new THREE.Bone();paw.name=upper.name+'_paw';paw.position.y=-length2;lower.add(paw);bones.push(paw);legs.push({upper,lower,paw,length1,length2,front:front>0,rest:new THREE.Vector3(sum.x,0,sum.z)});
 }
 const tail=new THREE.Bone();tail.name='tail';tail.position.set(0,.47,-.23);root.add(tail);bones.push(tail);
 const spine=new THREE.Bone(),head=new THREE.Bone(),tailTip=new THREE.Bone();spine.name='spine';head.name='head';tailTip.name='tail_tip';spine.position.set(0,.48,0);head.position.set(0,.59,.19);tailTip.position.set(0,.10,-.12);root.add(spine,head);tail.add(tailTip);bones.push(spine,head,tailTip);const skeleton=new THREE.Skeleton(bones);group.add(root);
 source.traverse(o=>{if(!o.isMesh)return;
  const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.translate(-center.x,-bounds.min.y,-center.z);g.scale(scale,scale,scale);
  const p=g.attributes.position,indices=[],weights=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);let closest=0,dist=Infinity;
   limbCenters.forEach((v,j)=>{const d=(x-v.x)**2+(z-v.z)**2;if(d<dist){dist=d;closest=j;}});
   const legWeight=(1-THREE.MathUtils.smoothstep(y,.30,.48))*(1-THREE.MathUtils.smoothstep(Math.sqrt(dist),.065,.145)*THREE.MathUtils.smoothstep(y,.10,.28)),kneeWeight=1-THREE.MathUtils.smoothstep(y,closest<2?.28:.13,closest<2?.36:.29),tailWeight=THREE.MathUtils.smoothstep(-z,.23,.39)*THREE.MathUtils.smoothstep(y,.40,.57);
   const pawWeight=1-THREE.MathUtils.smoothstep(y,.045,.105),headWeight=THREE.MathUtils.smoothstep(y,.50,.68)*THREE.MathUtils.smoothstep(z,.03,.19);
   if(tailWeight>.01){const tipWeight=THREE.MathUtils.smoothstep(-z,.33,.52)*.65;indices.push(bones.indexOf(spine),bones.indexOf(tail),bones.indexOf(tailTip),0);weights.push(1-tailWeight,tailWeight*(1-tipWeight),tailWeight*tipWeight,0);}
   else if(headWeight>.01){indices.push(bones.indexOf(spine),bones.indexOf(head),0,0);weights.push(1-headWeight,headWeight,0,0);}
   else{indices.push(bones.indexOf(spine),1+closest*3,2+closest*3,3+closest*3);weights.push(1-legWeight,legWeight*(1-kneeWeight),legWeight*kneeWeight*(1-pawWeight),legWeight*kneeWeight*pawWeight);}

  }
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const material=o.material.clone();material.roughness=.85;material.metalness=0;material.envMapIntensity=.3;material.color.set(0xffffff);
  const mesh=new THREE.SkinnedMesh(g,material);mesh.name='Weighted puppy mesh';mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.region='puppy';group.add(mesh);group.updateMatrixWorld(true);mesh.bind(skeleton);mesh.frustumCulled=false;
 });
 group.position.set(-2.18,.29,5.2);group.rotation.y=-.6;
 const motion=createPuppyMotion({group,root,legs,spine,head,tail,tailTip});
 return {group,update:motion.update,setRunning:motion.setRunning,get running(){return motion.running;},get moving(){return motion.moving;},get diagnostics(){return motion.diagnostics;},get joints(){return bones.map(b=>({name:b.name,rotation:b.rotation.toArray().slice(0,3)}));}};
}
