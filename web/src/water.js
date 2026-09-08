import * as THREE from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {river,riverWidth} from './vegetation.js';
export function createCreek(scene,normalTexture,sunDirection,mobile){
 const p=[],uv=[],idx=[],rows=180,cols=14;
 for(let j=0;j<=rows;j++){const y=-24+j*70/rows;for(let i=0;i<=cols;i++){const f=i/cols;p.push(river(y)+(f*2-1)*(riverWidth(y)+.1),y,0);uv.push(f,j/rows);}}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,b,c,b,d,c);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(idx);geometry.computeVertexNormals();
 normalTexture.wrapS=normalTexture.wrapT=THREE.RepeatWrapping;
 const water=new Water(geometry,{textureWidth:mobile?256:512,textureHeight:mobile?256:512,waterNormals:normalTexture,sunDirection:sunDirection.clone(),sunColor:0xffe0aa,waterColor:0x3c6051,distortionScale:1.4,alpha:.94,fog:true});
 water.rotation.x=-Math.PI/2;water.position.y=-.305;water.name='Click the creek to create ripples';water.userData.region='water';water.material.transparent=true;
 water.material.uniforms.size.value=4.0;
 water.material.uniforms.uRipples={value:Array.from({length:5},()=>new THREE.Vector4(0,0,-100,0))};
 water.material.fragmentShader=water.material.fragmentShader.replace('uniform float size;','uniform float size;\nuniform vec4 uRipples[5];');
 water.material.fragmentShader=water.material.fragmentShader.replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',`vec3 surfaceNormal = normalize( noise.xzy * vec3( .55, 1.0, .55 ) );
 float ringLight=0.;
 for(int k=0;k<5;k++){
  float age=time-uRipples[k].z;vec2 delta=worldPosition.xz-uRipples[k].xy;float dist=length(delta);
  float envelope=exp(-pow((dist-age*1.4)*3.3,2.))*(1.-smoothstep(0.,3.8,age))*step(0.,age);
  float wave=sin(dist*17.-age*24.)*envelope;
  surfaceNormal.xz+=normalize(delta+vec2(.001))*.16*wave;
  ringLight+=max(0.,wave)*.035;
 }
 surfaceNormal=normalize(surfaceNormal);`);
 water.material.fragmentShader=water.material.fragmentShader.replace('vec3 outgoingLight = albedo;','vec3 outgoingLight = albedo + vec3(ringLight);');
 let next=0,total=0,reflectionFrame=0;const original=water.onBeforeRender;
 water.onBeforeRender=function(...args){reflectionFrame++;if(reflectionFrame%(mobile?3:2)===1||reflectionFrame===1)original.apply(this,args);};
 scene.add(water);
 const foamGeometry=new THREE.PlaneGeometry(2.8,.85);foamGeometry.rotateX(-Math.PI/2);
 const foamMaterial=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`precision highp float;uniform float uTime;varying vec2 vUv;void main(){float s=sin(vUv.x*87.+sin(vUv.y*36.-uTime*5.)*2.)*sin(vUv.y*73.-uTime*6.);float a=smoothstep(.35,.95,s)*sin(vUv.y*3.14159)*.40;gl_FragColor=vec4(.84,.90,.81,a);}`});
 const foam=new THREE.Mesh(foamGeometry,foamMaterial);foam.position.set(river(3.85),-.26,-3.85);scene.add(foam);
 return {mesh:water,update(time){water.material.uniforms.time.value=time;foamMaterial.uniforms.uTime.value=time;},ripple(point,time){water.material.uniforms.uRipples.value[next].set(point.x,point.z,time,1);next=(next+1)%5;total++;},get total(){return total;}};
}
