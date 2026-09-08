import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {random} from './vegetation.js';

// Geometry, rather than a painted facade, gives the eaves and openings depth.
export function createVillage(scene, materials) {
 const rand=random(619), batches=new Map(), tiles=[], dummy=new THREE.Object3D();
 const timber=materials.wood.clone();timber.color.set(0x80705c);
 const lime=materials.plaster.clone();lime.color.set(0xe8e1ca);lime.normalScale.set(.22,.22);
 const clay=materials.earthwall.clone();clay.color.set(0xcbb688);clay.normalScale.set(.25,.25);
 for(const mat of [lime,clay]){mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,diffuse,0.63);');};mat.customProgramCacheKey=()=> 'weathered-limewash';}
 const slate=new THREE.MeshStandardMaterial({color:0x3e4849,roughness:.92});
 const brick=materials.stone.clone();brick.color.set(0x88887a);
 const glass=new THREE.MeshStandardMaterial({color:0x0a1210,roughness:.37,metalness:.05,envMapIntensity:.12});
 const dark=new THREE.MeshStandardMaterial({color:0x101713,roughness:1});
 const metal=new THREE.MeshStandardMaterial({color:0x373b32,roughness:.7,metalness:.6});
 function add(g,m,x=0,y=0,z=0,rx=0,ry=0,rz=0){dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(1,1,1);dummy.updateMatrix();g.applyMatrix4(dummy.matrix);const a=batches.get(m)||[];a.push(g);batches.set(m,a);}
 function box(x,y,z,w,h,d,m,rx=0,ry=0,rz=0){add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);}
 function beam(a,b,r,m=timber){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),g=new THREE.CylinderGeometry(r,r*1.07,p.distanceTo(q),6);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize()));add(g,m,...p.add(new THREE.Vector3(...b)).multiplyScalar(.5).toArray());}
 function frame(cx,cy,z,w,h,door=false){
  box(cx,cy,z-.13,w,h,.10,door?dark:glass);
  box(cx-w/2-.045,cy,z,.085,h+.17,.15,timber);box(cx+w/2+.045,cy,z,.085,h+.17,.15,timber);
  box(cx,cy+h/2+.045,z,w+.18,.09,.17,timber);box(cx,cy-h/2-.04,z+.015,w+.24,.08,.23,brick);
  if(door){
   for(let i=0;i<7;i++)box(cx-w*.5+(i+.5)*w/7,cy,z-.05,w/7-.011,h-.025,.055,timber);
   box(cx,cy+h*.25,z,w-.04,.055,.05,timber);box(cx,cy-h*.25,z,w-.04,.055,.05,timber);
   add(new THREE.TorusGeometry(.037,.008,5,10),metal,cx+.07,cy-.08,z+.045);
   box(cx,cy-h/2-.12,z+.30,w+.4,.16,.63,brick);
  }else{
   box(cx,cy,z,.033,h,.07,timber);box(cx,cy,z,w,.035,.07,timber);
   for(const side of [-1,1]){
    const sx=cx+side*(w*.5+.18);box(sx,cy,z+.04,.25,h,.06,timber,0,side*.22,0);
    for(let j=0;j<5;j++)box(sx,cy-h*.4+j*h*.2,z+.09,.23,.018,.026,metal);
   }
  }
 }
 const houses=[[5.4,-24,4.5,3.5,2.9,0],[10.5,-26,4.6,4,3.85,1],[15.5,-25.6,4.5,3.7,2.8,1],[1.2,-28,3.5,3.2,2.75,2],[-3.6,-29,4.1,3,2.4,1],[-8,-30,3.6,3.1,2.5,0],[-12.5,-31,3.7,3,2.35,1]];
 houses.forEach(([x,z,w,d,h,type],houseIndex)=>{
  const base=.52,top=base+h,front=z+d/2,back=z-d/2,wall=type===0?clay:type===2?timber:lime,rise=d*.29;
  // Separate stone footing courses and irregular joints remain visible close up.
  box(x,.32,z,w+.12,.42,d+.12,brick);
  for(let row=0;row<2;row++)for(let col=0;col<Math.ceil(w/.46);col++){const bx=x-w/2+(col+.5)*.46-(row%2)*.20;box(bx,.19+row*.17,front+.075,.43,.15,.14,brick);}
  box(x,base+h/2,back,w,h,.22,wall);box(x-w/2+.10,base+h/2,z,.20,h,d,wall);box(x+w/2-.1,base+h/2,z,.20,h,d,wall);
  const openings=[{x:x-.12,y:base+.91,w:.87,h:1.82,door:true},{x:x-w*.32,y:base+1.55,w:.68,h:.82},{x:x+w*.31,y:base+1.55,w:.73,h:.82}];
  if(h>3.3)for(const dx of [-w*.28,w*.28])openings.push({x:x+dx,y:base+2.95,w:.75,h:.75});
  const xs=[x-w/2,x+w/2,...openings.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])].sort((a,b)=>a-b),ys=[base,top,...openings.flatMap(o=>[o.y-o.h/2,o.y+o.h/2])].sort((a,b)=>a-b);
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
   const cx=(xs[i]+xs[i+1])/2,cy=(ys[j]+ys[j+1])/2;
   if(!openings.some(o=>Math.abs(cx-o.x)<o.w/2-.001&&Math.abs(cy-o.y)<o.h/2-.001))box(cx,cy,front-.07,xs[i+1]-xs[i],ys[j+1]-ys[j],.22,wall);
  }
  for(const o of openings)frame(o.x,o.y,front+.06,o.w,o.h,o.door);
  for(const side of [-1,1]){
   const shape=new THREE.Shape();shape.moveTo(-d/2,0);shape.lineTo(d/2,0);shape.lineTo(0,rise);shape.closePath();const g=new THREE.ShapeGeometry(shape);g.rotateY(Math.PI/2);add(g,wall,x+side*(w/2-.015),top,z);
  }
  const overhang=.40,span=d/2+overhang,pitch=Math.atan2(rise+.08,span),slope=Math.hypot(span,rise+.08);
  for(const side of [-1,1]){
   box(x,top+rise/2-.015,z+side*span/2,w+.62,.065,slope,slate,side*pitch,0,0);
   box(x,top-.045,z+side*span,w+.74,.15,.14,timber);
   for(let tx=-w/2-.19;tx<w/2+.25;tx+=.25)for(let along=.12;along<slope+.08;along+=.285){
    tiles.push({x:x+tx,y:top+rise-along*Math.sin(pitch)+.055,z:z+side*along*Math.cos(pitch),rx:Math.PI/2+side*pitch,shade:.65+rand()*.25});
   }
   for(let tx=-w/2;tx<=w/2;tx+=.38)beam([x+tx,top-.09,z+side*(d/2-.12)],[x+tx,top-.15,z+side*(span+.08)],.045);
  }
  for(let rx=-w/2-.30;rx<w/2+.25;rx+=.31){const g=new THREE.CylinderGeometry(.145,.145,.32,7,1,true,Math.PI/2,Math.PI);g.rotateZ(Math.PI/2);add(g,slate,x+rx,top+rise+.06,z);}
  // Small exposed rafter ends, doorway canopy and supported veranda.
  if(houseIndex<3){
   box(x,2.60,front+.59,w*.56,.065,1.2,slate,.13);
   for(let tx=-w*.28+.10;tx<w*.28;tx+=.25)for(let row=0;row<4;row++)tiles.push({x:x+tx,y:2.71-row*.037,z:front+.15+row*.285,rx:Math.PI/2+.13,shade:.70+rand()*.17});
   for(const dx of [-w*.25,w*.25]){box(x+dx,1.5,front+1.05,.10,2.2,.10,timber);beam([x+dx,2.27,front+1.04],[x+dx,2.64,front+.59],.035);}
   box(x,.32,front+.62,w*.62,.22,1.32,brick);
  }
  if(houseIndex===1||houseIndex===4){box(x+w*.23,top+rise+.30,z-.45,.36,.9,.42,brick);box(x+w*.23,top+rise+.78,z-.45,.45,.09,.50,slate);}
  // Uneven small patches around the foundation, instead of giant wall stains.
  for(let i=0;i<12;i++){const px=x-w*.46+rand()*w*.92;box(px,base+.07+rand()*.17,front+.047,.09+rand()*.24,.08+rand()*.14,.008,clay);}
  for(const dx of [-w*.44,w*.44])box(x+dx,top-.17,front+.045,.085,.28,.08,timber);
 });
 const group=new THREE.Group();group.name='Detailed vernacular village';group.userData.region='village';
 for(const [mat,gs] of batches){const g=mergeGeometries(gs,false);for(const part of gs)part.dispose();if(!g)continue;
  // Consistent meter-scale texture coordinates on every face.
  const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){if(Math.abs(n.getY(i))>.5)uv.setXY(i,p.getX(i)*.65,p.getZ(i)*.65);else if(Math.abs(n.getX(i))>.5)uv.setXY(i,p.getZ(i)*.65,p.getY(i)*.65);else uv.setXY(i,p.getX(i)*.65,p.getY(i)*.65);}
  const mesh=new THREE.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.region='village';group.add(mesh);
 }
 const tileGeometry=new THREE.CylinderGeometry(.133,.122,.35,6,1,true,Math.PI/2,Math.PI);tileGeometry.scale(1,1,.43);
 const tileMesh=new THREE.InstancedMesh(tileGeometry,slate,tiles.length),color=new THREE.Color();
 tiles.forEach((t,i)=>{dummy.position.set(t.x,t.y,t.z);dummy.rotation.set(t.rx,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();tileMesh.setMatrixAt(i,dummy.matrix);tileMesh.setColorAt(i,color.setRGB(t.shade,t.shade*1.01,t.shade*.98));});
 tileMesh.castShadow=true;tileMesh.receiveShadow=true;tileMesh.userData.region='village';tileMesh.name='Overlapping curved clay roof tiles';tileMesh.computeBoundingSphere();group.add(tileMesh);
 scene.add(group);return {group,counts:{houses:houses.length,roofTiles:tiles.length}};
}
