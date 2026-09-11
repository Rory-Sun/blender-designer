import * as THREE from 'three';
import {river,riverWidth,pathX,random} from './vegetation.js';

// Low relief geometry and continuous, meter-scale UVs for the walked path and banks.
export function createHabitat(scene,materials,mobile){
 const group=new THREE.Group();group.name='Worn footpath and damp creek margins';scene.add(group);
 for(const material of [materials.ground,materials.rock]){
  material.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 vBankPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n vBankPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader='varying vec3 vBankPosition;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float bankAlong=-vBankPosition.z;
    float bankCenter=2.1+1.1*sin(bankAlong*.16-.3);
    float bankLimit=2.9+.25*cos(bankAlong*.22);
    float bankWet=(1.-smoothstep(-.23,.20,vBankPosition.y))*(1.-smoothstep(bankLimit-.2,bankLimit,abs(vBankPosition.x-bankCenter)));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.105,.12,.068),.24);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.49,.56,.53),bankWet);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,.58,bankWet);');
  };material.customProgramCacheKey=()=> 'damp-bank-height-v2';
 }
 const noise=(x,z)=>Math.sin(x*3.7+z*1.9)*Math.sin(z*4.3-x*.8);
 function earth(base){const m=base.clone();m.color.set(0xebe4d6);m.normalScale.set(.28,.28);m.vertexColors=true;
  m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float earthValue=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(earthValue)*vec3(1.12,1.02,.86),.82);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.25,.205,.145),.23);`);};m.customProgramCacheKey=()=> 'muted-earth-v1';return m;}
 const soil=earth(materials.soil),bank=earth(materials.ground);
 function ribbon(rows,cols,point,material,name){const p=[],uv=[],colors=[],idx=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const q=point(j/rows,i/cols);p.push(q.x,q.y,q.z);uv.push(q.x*.65,q.z*.65);colors.push(...q.color);}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.receiveShadow=true;material.side=THREE.DoubleSide;group.add(mesh);}
 ribbon(280,18,(t,u)=>{const z=17-t*32.7,by=-z,offset=(u*2-1)*(.71+.045*Math.sin(z*2.7)+.025*Math.sin(z*7.1)),x=pathX(by)+offset;
  const tread=Math.exp(-Math.pow((Math.abs(offset)-.29)/.13,2)),edge=Math.pow(Math.abs(u*2-1),5),grain=noise(x,z);
  const shade=.78+.08*grain-.10*tread+.06*edge;
  return{x,y:.294-.012*tread+.011*grain*edge,z,color:[shade,shade*.94,shade*.80]};},soil,'Uneven compacted walking trail');
 for(const side of [-1,1])ribbon(300,14,(t,u)=>{const z=18-t*49,by=-z,rough=.07*Math.sin(z*3.2)+.035*Math.sin(z*7.3),x=river(by)+side*(riverWidth(by)+.04+u*(.84+rough));
  const height=-.34+.605*THREE.MathUtils.smoothstep(u,0,1)+noise(x,z)*.024*Math.sin(u*Math.PI),wet=THREE.MathUtils.smoothstep(u,.14,.74),shade=.32+.48*wet;
  return{x,y:height,z,color:[shade,shade*(.93+.08*wet),shade*.77]};},bank,'Eroded wet-to-dry bank');
 const rand=random(820),pebbles=[],dummy=new THREE.Object3D(),color=new THREE.Color();
 for(let i=0;i<(mobile?300:700);i++){const z=-15+rand()*31,by=-z,side=rand()<.5?-1:1,along=rand();if(Math.abs(by-5)<1.2)continue;
  const path=rand()<.55,x=path?pathX(by)+side*(.20+Math.sqrt(rand())*.50):river(by)+side*(riverWidth(by)+.12+along*.50),y=path?.296:-.315+.58*THREE.MathUtils.smoothstep((.08+along*.50)/.84,0,1);
  pebbles.push({x,y,z,s:.009+Math.pow(rand(),3)*.036});}
 const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),materials.stone.clone(),pebbles.length);rocks.material.color.set(0x9c978a);
 pebbles.forEach((p,i)=>{dummy.position.set(p.x,p.y+p.s*.28,p.z);dummy.rotation.set(rand(),rand()*6.28,rand());dummy.scale.set(p.s,p.s*.43,p.s*.78);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);rocks.setColorAt(i,color.setScalar(.65+rand()*.32));});rocks.receiveShadow=true;rocks.name='Scattered bank gravel';rocks.computeBoundingSphere();group.add(rocks);
 return{group,counts:{pebbles:pebbles.length}};
}
