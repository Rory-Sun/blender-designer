import * as THREE from 'three';
import {isVillageYard} from './village-layout.js';

export function random(seed=73){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const river=y=>2.1+1.1*Math.sin(y*.16-.3);
export const riverWidth=y=>1.7+.25*Math.cos(y*.22);
export const pathX=y=>river(y)-riverWidth(y)-1.8-.35*Math.sin(y*.38);
export function hillHeight(x,z){
 const north=THREE.MathUtils.smoothstep(-z,32,100),side=THREE.MathUtils.smoothstep(Math.abs(x),28,75);
 const n=Math.sin(x*.073+z*.051)*4+Math.sin(x*.18-z*.13)*2.3+Math.sin(x*.37+z*.29)*.7;
 return -.7+Math.max(north*(17+n),side*(10+n*.8));
}
export function windMaterial(material,time,strength,kind='grass'){
 material.onBeforeCompile=shader=>{
  shader.uniforms.uWindTime=time;shader.uniforms.uWindStrength=strength;
  shader.vertexShader='uniform float uWindTime;uniform float uWindStrength;\n'+shader.vertexShader;
  const leaf=kind==='leaf';
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
    vec3 root=instanceMatrix[3].xyz;
    float phase=root.x*.62+root.z*.42;
    float bend=${leaf?'0.28 + uv.y * 0.30':'pow(clamp(position.y,0.,1.4),1.6)'};
    float envelope=.35+.65*pow(.5+.5*sin(uWindTime*.48-root.z*.21+root.x*.16),2.);
    float gust=(sin(uWindTime*1.35+phase)*.65+sin(uWindTime*2.18+phase*1.7)*.35)*envelope;
    transformed.x+=gust*bend*uWindStrength*${leaf?'.13':'.17'};
    transformed.z+=sin(uWindTime+phase*.73)*bend*uWindStrength*.055;
   #endif`);
 };
 material.customProgramCacheKey=()=>`countryside-wind-${kind}`;
 return material;
}
class GeometryBuilder{
 constructor(){this.p=[];this.n=[];this.uv=[];this.i=[];}
 vertex(p,n,uv){this.p.push(...p);this.n.push(...n);this.uv.push(...uv);return this.p.length/3-1;}
 triangle(a,b,c){this.i.push(a,b,c);}
 curvedLeaf(x,y,z,angle,length,width,rise,segments=7){
  const dx=Math.cos(angle),dz=Math.sin(angle),nx=-dz,nz=dx,ids=[];
  for(let j=0;j<=segments;j++){const t=j/segments,w=width*Math.pow(Math.sin(Math.PI*t),.7),cy=y+rise*Math.sin(t*Math.PI*.86)-length*.20*t*t,cx=x+dx*length*t,cz=z+dz*length*t;
   ids.push(this.vertex([cx-nx*w,cy-.004,cz-nz*w],[nx*.3,.9,nz*.3],[0,t]),this.vertex([cx,cy+.004,cz],[0,1,0],[.5,t]),this.vertex([cx+nx*w,cy-.004,cz+nz*w],[-nx*.3,.9,-nz*.3],[1,t]));
  }
  for(let j=0;j<segments;j++)for(let k=0;k<2;k++){const a=ids[j*3+k],b=ids[j*3+k+1],c=ids[(j+1)*3+k],d=ids[(j+1)*3+k+1];this.triangle(a,b,c);this.triangle(b,d,c);}
 }
 grain(x,y,z,angle){
  const b=this.p.length/3,dx=Math.cos(angle),dz=Math.sin(angle);
  for(const [px,py,pz] of [[0,.023,0],[0,-.023,0],[.009,0,0],[-.009,0,0],[0,0,.007],[0,0,-.007]])this.vertex([x+px*dx-pz*dz,y+py,z+px*dz+pz*dx],[px*30,py*30,pz*30],[.5,.5]);
  for(const [a,c,d] of [[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]])this.triangle(b+a,b+c,b+d);
 }
 blade(x,z,h,angle,width,lean){
  const dx=Math.cos(angle),dz=Math.sin(angle),nx=-dz,nz=dx;
  const normal=[nx*.25,.20,nz*.25];const len=Math.hypot(...normal);for(let j=0;j<3;j++)normal[j]/=len;
  const ids=[];
  for(let row=0;row<5;row++){const f=row/4,spread=width*Math.pow(1-f,.7),bend=lean*f*f;ids.push(this.vertex([x+dx*bend-nx*spread,h*f,z+dz*bend-nz*spread],normal,[0,f]));ids.push(this.vertex([x+dx*bend+nx*spread,h*f,z+dz*bend+nz*spread],normal,[1,f]));}
  for(let j=0;j<4;j++){const a=ids[j*2],b=ids[j*2+1],c=ids[j*2+2],d=ids[j*2+3];this.triangle(a,b,c);this.triangle(b,d,c);}
  const tip=this.vertex([x+dx*lean*1.45,h*1.12,z+dz*lean*1.45],normal,[.5,1]);this.triangle(ids[8],ids[9],tip);
 }
 oval(x,y,z,rx,ry,rz){
  const n=4,rings=2,start=this.p.length/3;
  for(let j=0;j<=rings;j++){const a=Math.PI*j/rings;for(let k=0;k<n;k++){const b=k/n*Math.PI*2;this.vertex([x+rx*Math.sin(a)*Math.cos(b),y+ry*Math.cos(a),z+rz*Math.sin(a)*Math.sin(b)],[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)],[k/n,j/rings]);}}
  for(let j=0;j<rings;j++)for(let k=0;k<n;k++){const a=start+j*n+k,b=start+j*n+(k+1)%n,c=start+(j+1)*n+k,d=start+(j+1)*n+(k+1)%n;this.triangle(a,c,b);this.triangle(b,c,d);}
 }
 cylinder(start,end,r1,r2,n=6){
  const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),delta=b.clone().sub(a),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize()),length=delta.length(),base=this.p.length/3;
  for(let row=0;row<2;row++)for(let k=0;k<n;k++){const ang=k/n*Math.PI*2,r=row?r2:r1,p=new THREE.Vector3(Math.cos(ang)*r,row*length,Math.sin(ang)*r).applyQuaternion(q).add(a),normal=new THREE.Vector3(Math.cos(ang),0,Math.sin(ang)).applyQuaternion(q);this.vertex(p.toArray(),normal.toArray(),[k/n,length*row]);}
  for(let k=0;k<n;k++){const a=base+k,b=base+(k+1)%n,c=base+n+k,d=base+n+(k+1)%n;this.triangle(a,c,b);this.triangle(b,c,d);}
 }
 finish(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));g.setIndex(this.i);g.computeBoundingSphere();return g;}
}
function instance(geometry,material,placements,name,group,{shadow=false,colors=true}={}){
 const mesh=new THREE.InstancedMesh(geometry,material,placements.length),dummy=new THREE.Object3D(),c=new THREE.Color();
 placements.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx||0,p.ry||0,p.rz||0);const s=p.s||1;dummy.scale.set(p.sx||s,p.sy||s,p.sz||s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(colors){c.setHSL(p.h??.22,p.sat??.35,p.l??.65);mesh.setColorAt(i,c);}});
 mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.name=name;mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);return mesh;
}
export async function createVegetation({scene,materials,leafTexture,time,wind,mobile=false}){
 const rand=random(112),group=new THREE.Group();group.name='Wind-animated botanical instances';scene.add(group);
 const r=(a,b)=>a+(b-a)*rand(),grassPositions=[],ricePositions=[],treeCards=[],bushCards=[];
 const grassBuilder=new GeometryBuilder();for(let i=0;i<8;i++)grassBuilder.curvedLeaf(r(-.055,.055),0,r(-.055,.055),r(0,6.28),r(.22,.38),r(.005,.010),r(.27,.45),7);
 const grassMat=windMaterial(new THREE.MeshStandardMaterial({color:0x899c60,roughness:.94,side:THREE.DoubleSide}),time,wind);
 for(let i=0;i<(mobile?9500:18500);i++){
  const y=r(-17,29),side=rand()<.55?-1:1,dist=r(.43,side<0?9:7),x=river(y)+side*(riverWidth(y)+dist);
  if(isVillageYard(x,-y))continue;
  if(side<0&&Math.abs(x-pathX(y))<.63+.055*Math.sin(y*2.1))continue;
  if(y>7.5&&y<26.5&&side<0&&x<.15)continue;
  if(Math.abs(y-5)<1.25&&Math.abs(x-river(5))<5.3)continue;
  const patch=.5+.26*Math.sin(x*1.8+Math.sin(y*.8))+.24*Math.sin(y*2.1-x*.7);
  if(rand()>patch*.83+.12)continue;
  if(y<7&&y>-15&&rand()<.90)continue;
  const dry=rand()<.20,edge=THREE.MathUtils.smoothstep(Math.abs(x-pathX(y)),.70,1.35);
  grassPositions.push({x,y:.255,z:-y,ry:r(0,6.28),s:r(.65,1.3)*(.70+.30*edge),h:dry?r(.11,.16):r(.20,.25),sat:r(.17,.34),l:r(.48,.72)});
 }
 const grassGeometry=grassBuilder.finish();grassGeometry.computeVertexNormals();
 instance(grassGeometry,grassMat,grassPositions,'Bank grasses',group);
 const rb=new GeometryBuilder(),seeds=new GeometryBuilder();
 for(let stem=0;stem<3;stem++){
  const a=stem*2.39,h=r(.69,.95),dx=Math.cos(a),dz=Math.sin(a),x=dx*.055,z=dz*.055;
  rb.cylinder([x,0,z],[x+dx*.075,h,z+dz*.075],.006,.003,4);
  for(let k=0;k<3;k++)rb.curvedLeaf(x+dx*.03,h*(.25+k*.19),z+dz*.03,a+k*2.5,r(.30,.49),r(.012,.018),r(.16,.25));
  let previous=[x+dx*.075,h,z+dz*.075];
  for(let k=0;k<7;k++){
   const t=(k+1)/7,cx=x+dx*(.075+t*.26),cy=h+.08*Math.sin(t*Math.PI)-.18*t*t,cz=z+dz*(.075+t*.26);
   rb.cylinder(previous,[cx,cy,cz],.0023,.0015,3);previous=[cx,cy,cz];
   for(const side of [-1,1]){
    const branch=a+side*.90,spread=.055*(1-t*.55),ex=cx+Math.cos(branch)*spread,ez=cz+Math.sin(branch)*spread;
    rb.cylinder([cx,cy,cz],[ex,cy-.04,ez],.0012,.0007,3);
    seeds.grain(ex,cy-.055,ez,branch);
    if(k<5)seeds.grain((cx+ex)/2,cy-.029,(cz+ez)/2,branch);
   }
  }
 }
 for(const [row,ys] of [[8,11.2],[11.8,15.2],[15.8,19],[19.6,22.7],[23.3,26.1]].entries()){
  for(let x=-18;x<.05;x+=mobile?.48:.37)for(let y=ys[0];y<ys[1];y+=mobile?.49:.39){if((x>-9.52&&x<-9.03)||isVillageYard(x,-y))continue;const patch=.5+.5*Math.sin(x*.57+y*.41),lodged=Math.sin(x*.93-y*.72)>.88;
   if(rand()<.025)continue;
   ricePositions.push({x:x+r(-.09,.09),y:.29+row*.06,z:-y+r(-.08,.08),ry:r(0,6.28),rx:lodged?.11:0,rz:lodged?-.13:0,s:r(.86,1.12)*(lodged?.86:1),h:.18+patch*.045,sat:r(.24,.40),l:.66+patch*.13});}
 }
 const riceMat=windMaterial(new THREE.MeshStandardMaterial({color:0x879c38,roughness:.69,side:THREE.DoubleSide}),time,wind);
 const seedMat=windMaterial(new THREE.MeshStandardMaterial({color:0xc0a663,roughness:.85}),time,wind);
 const closeRice=ricePositions.filter(p=>p.z>-15.6&&p.x>-11.5),farRice=ricePositions.filter(p=>p.z<=-15.6||p.x<=-11.5);
 instance(rb.finish(),riceMat,closeRice,'Detailed curved rice leaves',group,{shadow:!mobile});instance(seeds.finish(),seedMat,closeRice,'Branched drooping rice panicles',group,{shadow:false});
 const farLeaves=new GeometryBuilder(),farSeeds=new GeometryBuilder();
 for(let i=0;i<3;i++){const a=i*2.39,h=.76+i*.065;farLeaves.curvedLeaf(0,h*.25,0,a,.40,.018,.38,3);farLeaves.curvedLeaf(0,h*.48,0,a+2,.32,.015,.25,3);farLeaves.blade(0,0,h,a,.005,.09);for(let k=0;k<3;k++)farSeeds.grain(Math.cos(a)*(.10+k*.045),h-k*.042,Math.sin(a)*(.10+k*.045),a);}
 instance(farLeaves.finish(),riceMat,farRice,'Distant rice leaf silhouettes',group);instance(farSeeds.finish(),seedMat,farRice,'Distant golden panicles',group);
 const trunks=new GeometryBuilder();
 const trees=[[-12,9,1.1],[-11,-3,1.15],[11,4,1.2],[12,-14,1.4],[-19,-15,1.2],[-16,-26,1.4],[20,-22,1.4],[22,13,1.3],[-20,22,1.3]];
 for(let i=0;i<70;i++)trees.push([r(-32,33),r(-64,-30),r(.85,1.5)]);
 for(let i=0;i<22;i++)trees.push([rand()<.5?r(-40,-25):r(26,42),r(-20,35),r(1.0,1.8)]);
 for(const [x,z,s] of trees){
  const floor=Math.max(.21,hillHeight(x,z)),top=4.8*s;
  trunks.cylinder([x,floor,z],[x+.18*s,floor+top,z-.12*s],.15*s,.034*s,8);
  for(let k=0;k<7;k++){const a=k*2.4,radius=r(1.25,2.3)*s,sy=floor+(1.8+k*.35)*s,end=[x+Math.cos(a)*radius,floor+(3.5+k*.21)*s,z+Math.sin(a)*radius];trunks.cylinder([x,sy,z],end,.07*s,.012*s,5);}
  for(let i=0;i<(mobile?100:170);i++){
   const theta=r(0,6.28),v=r(-1,1),rr=Math.sqrt(1-v*v),rad=Math.pow(rand(),.35),px=x+rr*Math.cos(theta)*2.35*s*rad,pz=z+rr*Math.sin(theta)*2.15*s*rad,py=floor+4.35*s+v*1.65*s;
   treeCards.push({x:px,y:py,z:pz,rx:r(-1.7,1.7),ry:r(0,6.28),rz:r(-1.2,1.2),s:r(.56,.98)*s,h:r(.19,.25),sat:r(.13,.32),l:r(.53,.80)});
  }
 }
 const trunkMesh=new THREE.Mesh(trunks.finish(),materials.bark);trunkMesh.name='Branching tree trunks';trunkMesh.castShadow=true;trunkMesh.receiveShadow=true;group.add(trunkMesh);
 leafTexture.colorSpace=THREE.SRGBColorSpace;
 const lm=windMaterial(new THREE.MeshStandardMaterial({map:leafTexture,color:0xd9e3b7,alphaTest:.45,side:THREE.DoubleSide,roughness:.78,emissive:0x24350c,emissiveIntensity:.08}),time,wind,'leaf');
 instance(new THREE.PlaneGeometry(1,1,1,1),lm,treeCards,'Camphor leaves',group,{shadow:true});
 for(let i=0;i<(mobile?280:480);i++){
  const by=r(-15,28),side=rand()<.4?-1:1,x=river(by)+side*(riverWidth(by)+r(.3,1.1));
  if(isVillageYard(x,-by))continue;
  if(Math.abs(x-pathX(by))<.8||Math.abs(by-5)<1.2||Math.sin(by*1.7)+Math.sin(x*3.1)<.05)continue;
  const height=r(.38,.65);for(let leaf=0;leaf<9;leaf++)bushCards.push({x:x+r(-.15,.15),y:height+r(-.10,.12),z:-by+r(-.17,.17),rx:r(-1.5,1.5),ry:r(0,6.28),rz:r(-1,1),s:r(.17,.28),h:r(.20,.26),sat:r(.16,.30),l:r(.57,.80)});
 }
 instance(new THREE.PlaneGeometry(1,1),lm,bushCards,'Waterside leafy shrubs',group,{shadow:!mobile});
 // Actual flower geometry, kept separate from grasses so each petal catches light.
 const stemB=new GeometryBuilder(),flowerB=new GeometryBuilder();stemB.cylinder([0,0,0],[.02,.65,0],.006,.003,4);
 for(let k=0;k<7;k++){const a=k/7*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a),nx=-dz,nz=dx;const p0=flowerB.vertex([dx*.012,.65,dz*.012],[0,1,0],[.5,0]),p1=flowerB.vertex([dx*.064+nx*.034,.67,dz*.064+nz*.034],[0,1,0],[0,.7]),p2=flowerB.vertex([dx*.108,.66,dz*.108],[0,1,0],[.5,1]),p3=flowerB.vertex([dx*.064-nx*.034,.67,dz*.064-nz*.034],[0,1,0],[1,.7]);flowerB.triangle(p0,p1,p2);flowerB.triangle(p0,p2,p3);}
 flowerB.oval(0,.66,0,.022,.012,.022);
 const flowerPositions=[],flowerStemPositions=[];
 for(let i=0;i<(mobile?90:170);i++){const by=r(-16,5),x=pathX(by)-r(.78,4.6),s=r(.25,.48);const p={x,y:.255,z:-by,ry:r(0,6.28),s,h:rand()<.72?r(.88,.98):r(.10,.15),sat:r(.22,.62),l:r(.57,.87)};flowerPositions.push(p);flowerStemPositions.push({...p,h:.23,sat:.4,l:.5});}
 const stemMat=windMaterial(new THREE.MeshStandardMaterial({color:0x68843d,roughness:.9}),time,wind);
 const flowerMat=windMaterial(new THREE.MeshStandardMaterial({color:0xffffff,roughness:.73,side:THREE.DoubleSide}),time,wind);
 instance(stemB.finish(),stemMat,flowerStemPositions,'Cosmos stems',group);instance(flowerB.finish(),flowerMat,flowerPositions,'Pink white and yellow cosmos',group);
 
 const forestTexture=await new THREE.TextureLoader().loadAsync('./assets/tree.png');forestTexture.colorSpace=THREE.SRGBColorSpace;
 const forestMat=new THREE.MeshBasicMaterial({map:forestTexture,alphaTest:.5,side:THREE.DoubleSide,color:0x72876a});
 // Mid-distance trees have solid, irregular crowns so orbiting does not expose
 // a wall of identical flat cutouts. Only the farthest haze uses image cards.
 const crownGeometry=new THREE.SphereGeometry(1,mobile?10:16,mobile?7:10),cp=crownGeometry.attributes.position;
 for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),f=1+.10*Math.sin(x*8.2+y*4.7)*Math.sin(z*7.3-y*3.2);cp.setXYZ(i,x*f,y*f,z*f);}
 crownGeometry.computeVertexNormals();
 const crowns=[],woodlandStems=[],woodlandCount=mobile?150:300;
 for(let i=0;i<woodlandCount;i++){
  const x=r(-67,67),z=r(-91,-43);if(Math.sin(x*.20+z*.11)+Math.sin(z*.26-x*.08)>1.45)continue;
  const floor=hillHeight(x,z),height=r(4.3,8.5),width=height*r(.24,.36),hue=r(.21,.28),light=r(.30,.46);
  woodlandStems.push({x,y:floor+height*.35,z,sx:.07+height*.018,sy:height*.70,sz:.07+height*.018,h:.10,sat:.14,l:.33});
  for(let k=0;k<5;k++){const a=k*2.4,spread=k===4?.12:width*.62;crowns.push({x:x+Math.cos(a)*spread,y:floor+height*(k===4?.84:.65)+r(-.18,.18),z:z+Math.sin(a)*spread,ry:r(0,6.28),sx:width*r(.68,.95),sy:height*r(.20,.29),sz:width*r(.66,.94),h:hue,sat:r(.16,.29),l:light+r(-.035,.035)});}
 }
 const canopyTexture=leafTexture.clone();canopyTexture.wrapS=canopyTexture.wrapT=THREE.RepeatWrapping;canopyTexture.repeat.set(2,2);
 const crownMat=new THREE.MeshStandardMaterial({map:canopyTexture,color:0x81956b,alphaTest:.42,side:THREE.DoubleSide,roughness:1});
 instance(crownGeometry,crownMat,crowns,'Volumetric woodland crowns',group);
 instance(new THREE.CylinderGeometry(1,1,1,5),materials.bark,woodlandStems,'Woodland stems',group);
 const forest=[];
 for(let i=0;i<1100;i++){const x=r(-92,92),z=r(-155,-88),h=hillHeight(x,z),height=r(4.0,8.0);forest.push({x,y:h+height*.48,z,ry:r(0,Math.PI),sx:height*r(.58,.90),sy:height,sz:1,h:r(.23,.28),sat:.13,l:r(.57,.85)});}
 instance(new THREE.PlaneGeometry(1,1),forestMat,forest,'Distant wooded slopes',group);

 return {group,counts:{grass:grassPositions.length,rice:ricePositions.length,trees:trees.length,woodlandTrees:woodlandStems.length,leafClusters:treeCards.length,bushes:bushCards.length,flowers:flowerPositions.length}};
}
