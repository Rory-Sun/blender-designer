import * as THREE from 'three';

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
    float gust=sin(uWindTime*1.35+phase)*.65+sin(uWindTime*2.18+phase*1.7)*.35;
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
  for(let row=0;row<3;row++){const f=row/2,spread=width*(1-f*.75),bend=lean*f*f;ids.push(this.vertex([x+dx*bend-nx*spread,h*f,z+dz*bend-nz*spread],normal,[0,f]));ids.push(this.vertex([x+dx*bend+nx*spread,h*f,z+dz*bend+nz*spread],normal,[1,f]));}
  for(let j=0;j<2;j++){const a=ids[j*2],b=ids[j*2+1],c=ids[j*2+2],d=ids[j*2+3];this.triangle(a,b,c);this.triangle(b,d,c);}
  const tip=this.vertex([x+dx*lean*1.45,h*1.12,z+dz*lean*1.45],normal,[.5,1]);this.triangle(ids[4],ids[5],tip);
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
 const grassBuilder=new GeometryBuilder();for(let i=0;i<5;i++)grassBuilder.blade(r(-.035,.035),r(-.035,.035),r(.25,.5),r(0,6.28),r(.012,.022),r(.12,.22));
 const grassMat=windMaterial(new THREE.MeshStandardMaterial({color:0x7e983e,roughness:.94,side:THREE.DoubleSide}),time,wind);
 for(let i=0;i<(mobile?6500:11500);i++){
  const y=r(-17,29),side=rand()<.55?-1:1,dist=r(.43,side<0?9:7),x=river(y)+side*(riverWidth(y)+dist);
  if(side<0&&Math.abs(x-pathX(y))<.70)continue;
  if(y>7.5&&y<26.5&&side<0&&x<.15)continue;
  if(Math.abs(y-5)<1.25&&Math.abs(x-river(5))<5.3)continue;
  grassPositions.push({x,y:.255,z:-y,ry:r(0,6.28),s:r(.75,1.35),h:r(.20,.26),sat:r(.26,.50),l:r(.47,.78)});
 }
 instance(grassBuilder.finish(),grassMat,grassPositions,'Bank grasses',group);
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
  for(let x=-18;x<.05;x+=mobile?.48:.37)for(let y=ys[0];y<ys[1];y+=mobile?.49:.39){if(x>-9.52&&x<-9.03)continue;ricePositions.push({x:x+r(-.065,.065),y:.29+row*.06,z:-y+r(-.065,.065),ry:r(0,6.28),s:r(.84,1.17),h:r(.19,.24),sat:r(.20,.36),l:r(.64,.88)});}
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
 for(let i=0;i<(mobile?1700:3000);i++){
  const by=r(-15,28),side=rand()<.4?-1:1,x=river(by)+side*(riverWidth(by)+r(.3,1.1));
  if(Math.abs(x-pathX(by))<.8||Math.abs(by-5)<1.2)continue;
  bushCards.push({x,y:r(.36,.95),z:-by,rx:r(-1.5,1.5),ry:r(0,6.28),rz:r(-1,1),s:r(.22,.52),h:r(.20,.27),sat:r(.16,.32),l:r(.6,.9)});
 }
 instance(new THREE.PlaneGeometry(1,1),lm,bushCards,'Waterside leafy shrubs',group,{shadow:!mobile});
 // Actual flower geometry, kept separate from grasses so each petal catches light.
 const stemB=new GeometryBuilder(),flowerB=new GeometryBuilder();stemB.cylinder([0,0,0],[.02,.65,0],.006,.003,4);
 for(let k=0;k<7;k++){const a=k/7*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a),nx=-dz,nz=dx;const p0=flowerB.vertex([dx*.012,.65,dz*.012],[0,1,0],[.5,0]),p1=flowerB.vertex([dx*.064+nx*.034,.67,dz*.064+nz*.034],[0,1,0],[0,.7]),p2=flowerB.vertex([dx*.108,.66,dz*.108],[0,1,0],[.5,1]),p3=flowerB.vertex([dx*.064-nx*.034,.67,dz*.064-nz*.034],[0,1,0],[1,.7]);flowerB.triangle(p0,p1,p2);flowerB.triangle(p0,p2,p3);}
 flowerB.oval(0,.66,0,.022,.012,.022);
 const flowerPositions=[],flowerStemPositions=[];
 for(let i=0;i<(mobile?180:320);i++){const by=r(-16,5),x=pathX(by)-r(.78,4.6),s=r(.32,.70);const p={x,y:.255,z:-by,ry:r(0,6.28),s,h:rand()<.72?r(.88,.98):r(.10,.15),sat:r(.22,.62),l:r(.57,.87)};flowerPositions.push(p);flowerStemPositions.push({...p,h:.23,sat:.4,l:.5});}
 const stemMat=windMaterial(new THREE.MeshStandardMaterial({color:0x68843d,roughness:.9}),time,wind);
 const flowerMat=windMaterial(new THREE.MeshStandardMaterial({color:0xffffff,roughness:.73,side:THREE.DoubleSide}),time,wind);
 instance(stemB.finish(),stemMat,flowerStemPositions,'Cosmos stems',group);instance(flowerB.finish(),flowerMat,flowerPositions,'Pink white and yellow cosmos',group);
 
 const forestTexture=await new THREE.TextureLoader().loadAsync('./assets/tree.png');forestTexture.colorSpace=THREE.SRGBColorSpace;
 const forestMat=new THREE.MeshBasicMaterial({map:forestTexture,alphaTest:.5,side:THREE.DoubleSide,color:0x72876a});
 const forest=[];
 for(let i=0;i<1700;i++){const x=r(-92,92),z=r(-140,-36),h=hillHeight(x,z),height=r(4.0,8.0);forest.push({x,y:h+height*.48,z,ry:r(0,Math.PI),sx:height*.8,sy:height,sz:1,h:r(.23,.28),sat:.13,l:r(.57,.85)});}
 instance(new THREE.PlaneGeometry(1,1),forestMat,forest,'Distant wooded slopes',group);

 return {group,counts:{grass:grassPositions.length,rice:ricePositions.length,trees:trees.length,leafClusters:treeCards.length,bushes:bushCards.length,flowers:flowerPositions.length}};
}
