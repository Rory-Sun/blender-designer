import * as THREE from 'three';
import {Water} from 'three/addons/objects/Water.js';
import {river,riverWidth} from './vegetation.js';
export function createCreek(scene,normalTexture,sunDirection,mobile){
 const p=[],uv=[],idx=[],rows=180,cols=14;
 for(let j=0;j<=rows;j++){const y=-24+j*70/rows;for(let i=0;i<=cols;i++){const f=i/cols;p.push(river(y)+(f*2-1)*(riverWidth(y)+.1),y,0);uv.push(f,j/rows);}}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,b,c,b,d,c);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(idx);geometry.computeVertexNormals();
 normalTexture.wrapS=normalTexture.wrapT=THREE.RepeatWrapping;
 const water=new Water(geometry,{textureWidth:mobile?256:512,textureHeight:mobile?256:512,waterNormals:normalTexture,sunDirection:sunDirection.clone(),sunColor:0xffe0aa,waterColor:0x294d43,distortionScale:.65,alpha:.94,fog:true});
 water.rotation.x=-Math.PI/2;water.position.y=-.305;water.name='Click the creek to create ripples';water.userData.region='water';water.material.transparent=true;
 water.material.uniforms.size.value=12.0;
 water.material.uniforms.uRipples={value:Array.from({length:5},()=>new THREE.Vector4(0,0,-100,0))};
 water.material.fragmentShader=water.material.fragmentShader.replace('uniform float size;','uniform float size;\nuniform vec4 uRipples[5];');
 water.material.fragmentShader=water.material.fragmentShader.replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',`vec3 surfaceNormal = normalize( noise.xzy * vec3( .24, 1.0, .24 ) );
 float ringLight=0.;
 for(int k=0;k<5;k++){
  float age=time-uRipples[k].z;vec2 delta=worldPosition.xz-uRipples[k].xy;float dist=length(delta);
  float envelope=exp(-pow((dist-age*1.4)*3.3,2.))*(1.-smoothstep(0.,3.8,age))*step(0.,age);
  float wave=sin(dist*17.-age*24.)*envelope;
  surfaceNormal.xz+=normalize(delta+vec2(.001))*.16*wave;
  ringLight+=max(0.,wave)*.035;
 }
 surfaceNormal=normalize(surfaceNormal);`);
 // Estimated channel depth varies across the stream; shallows transmit the
 // existing riverbed while deeper water absorbs more light. Fresnel retains
 // stronger reflections at grazing angles instead of painting the water blue.
 water.material.fragmentShader=water.material.fragmentShader
  .replace('vec4 noise = getNoise( worldPosition.xz * size );',`float along=-worldPosition.z;
   float center=2.1+1.1*sin(along*.16-.3);
   float halfWidth=1.8+.25*cos(along*.22);
   float bankDistance=clamp(abs(worldPosition.x-center)/halfWidth,0.,1.);
   float channelDepth=.07+.66*pow(1.-bankDistance,1.4)*(.86+.14*sin(along*.57));
   vec4 noise = getNoise((worldPosition.xz+vec2(.015,-.075)*time)*size);`)
  .replace('100.0, 2.0, 0.5','140.0, .65, 0.5')
  .replace('max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor','max( 0.0, dot( surfaceNormal, eyeDirection ) ) * mix(vec3(.16,.145,.092),waterColor,smoothstep(.05,.58,channelDepth))')
  .replace('gl_FragColor = vec4( outgoingLight, alpha );','float transmissionAlpha=mix(.30,.86,1.-exp(-channelDepth*4.0));\n gl_FragColor = vec4(outgoingLight,min(alpha,transmissionAlpha+reflectance*.28));');
 water.material.fragmentShader=water.material.fragmentShader.replace('vec3 outgoingLight = albedo;','vec3 outgoingLight = albedo + vec3(ringLight);');
 let next=0,total=0,reflectionFrame=0;const original=water.onBeforeRender;
 water.onBeforeRender=function(...args){reflectionFrame++;if(reflectionFrame%(mobile?3:2)===1||reflectionFrame===1)original.apply(this,args);};
 scene.add(water);
 const foamGeometry=new THREE.PlaneGeometry(2.8,.85);foamGeometry.rotateX(-Math.PI/2);
 const foamMaterial=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`precision highp float;uniform float uTime;varying vec2 vUv;void main(){float s=sin(vUv.x*87.+sin(vUv.y*36.-uTime*5.)*2.)*sin(vUv.y*73.-uTime*6.);float edge=smoothstep(0.,.18,vUv.x)*(1.-smoothstep(.82,1.,vUv.x));float a=smoothstep(.62,.98,s)*sin(vUv.y*3.14159)*edge*.17;gl_FragColor=vec4(.84,.90,.81,a);}`});
 const foam=new THREE.Mesh(foamGeometry,foamMaterial);foam.position.set(river(3.85),-.26,-3.85);scene.add(foam);
 return {mesh:water,update(time){water.material.uniforms.time.value=time;foamMaterial.uniforms.uTime.value=time;},ripple(point,time){water.material.uniforms.uRipples.value[next].set(point.x,point.z,time,1);next=(next+1)%5;total++;},get total(){return total;}};
}
