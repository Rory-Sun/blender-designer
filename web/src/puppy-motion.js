import * as THREE from 'three';
import {pathX} from './vegetation.js';

const TAU=Math.PI*2;
const clamp=THREE.MathUtils.clamp;
const wrap=a=>THREE.MathUtils.euclideanModulo(a+Math.PI,TAU)-Math.PI;
const smooth=t=>t*t*t*(t*(t*6-15)+10);
const down=new THREE.Vector3(0,-1,0);

/** Distance-driven steps with fixed world-space contacts and two-bone IK. */
export function createPuppyMotion({group,root,legs,spine,head,tail,tailTip}){
 const ground=.29;
 const routePoint=(z,offset)=>new THREE.Vector3(pathX(-z)+offset,ground,z);
 const route=new THREE.CatmullRomCurve3([
  routePoint(5.2,0),routePoint(3,-.12),routePoint(.5,-.16),routePoint(-1.65,-.16),
  routePoint(-2.3,.02),routePoint(-2.25,.28),routePoint(-1.6,.42),
  routePoint(1,.38),routePoint(4,.34),routePoint(6.35,.30),routePoint(6.85,.10),routePoint(6.45,-.10)
 ],true,'centripetal');
 route.arcLengthDivisions=800;route.updateArcLengths();const routeLength=route.getLength();
 const contacts=legs.map(leg=>({
  planted:new THREE.Vector3(),target:new THREE.Vector3(),lift:new THREE.Vector3(),landing:new THREE.Vector3(),
  swinging:false,progress:0,lastStep:-10,phase:0,initialized:false,sole:new THREE.Vector3(),error:0
 }));
 const inverse=new THREE.Matrix4(),direction=new THREE.Vector3(),pole=new THREE.Vector3(),knee=new THREE.Vector3(),target=new THREE.Vector3(),upperQ=new THREE.Quaternion(),lowerQ=new THREE.Quaternion();
 let requested=false,lastTime=null,distance=0,speed=0,cycle=0,activity=0,yaw=group.rotation.y,turnRate=0,acceleration=0;
 let maxContactError=0,turning=false;
 const at=distance=>route.getPointAt(THREE.MathUtils.euclideanModulo(distance,routeLength)/routeLength);
 const tangent=distance=>route.getTangentAt(THREE.MathUtils.euclideanModulo(distance,routeLength)/routeLength);

 function solveLeg(leg,foot){
  target.copy(foot.target).applyMatrix4(inverse);
  direction.copy(target).sub(leg.upper.position);
  const reach=clamp(direction.length(),.08,leg.length1+leg.length2-.0015);
  direction.normalize();
  // A foreleg elbow points back; the hind stifle points forwards.
  pole.set(0,0,leg.front?-1:1).addScaledVector(direction,-direction.z*(leg.front?-1:1)).normalize();
  const along=(leg.length1**2-leg.length2**2+reach**2)/(2*reach);
  knee.copy(leg.upper.position).addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,leg.length1**2-along**2)));
  upperQ.setFromUnitVectors(down,knee.clone().sub(leg.upper.position).normalize());
  lowerQ.setFromUnitVectors(down,target.clone().sub(knee).normalize());
  leg.upper.quaternion.copy(upperQ);
  leg.lower.quaternion.copy(upperQ).invert().multiply(lowerQ);
  // Keep the paw horizontal through stance instead of rotating the whole paw
  // with the shin, which is a major source of the stiff toy-like appearance.
  const worldRootQ=new THREE.Quaternion();root.getWorldQuaternion(worldRootQ);
  const desiredPawQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
  if(foot.swinging)desiredPawQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.18*Math.sin(foot.progress*TAU)));
  leg.paw.quaternion.copy(worldRootQ.multiply(lowerQ)).invert().multiply(desiredPawQ);
 }

 function step(dt,time){
  const heading=tangent(distance),upcoming=tangent(distance+.34);
  const desiredYaw=Math.atan2(heading.x,heading.z);
  const curvature=wrap(Math.atan2(upcoming.x,upcoming.z)-desiredYaw)/.34;
  const yawError=wrap(desiredYaw-yaw);
  turning=Math.abs(curvature)>.8||Math.abs(yawError)>.4;
  const alignment=THREE.MathUtils.smoothstep(Math.PI-Math.abs(yawError),Math.PI-.95,Math.PI-.2);
  const cruise=Math.min(.96,Math.sqrt(.30/(Math.abs(curvature)+.12)));
  const goal=requested?cruise*(.10+.90*alignment):0;
  const previousSpeed=speed;
  speed+=clamp(goal-speed,-1.30*dt,.78*dt);
  acceleration=(speed-previousSpeed)/Math.max(dt,.0001);
  const travelled=(previousSpeed+speed)*.5*dt;
  distance+=travelled;
  const turn=clamp(yawError,-2.05*dt,2.05*dt);
  // Heading is bounded in radians/sec, including the initial turn to the path.
  if(requested||speed>.01)yaw+=turn;
  turnRate=THREE.MathUtils.lerp(turnRate,dt?turn/dt:0,1-Math.exp(-dt*8));
  if(travelled>0)group.position.copy(at(distance));
  group.rotation.y=yaw;
  activity=THREE.MathUtils.lerp(activity,requested?1:0,1-Math.exp(-dt*4));
  const stride=.23+.09*clamp(speed/.96,0,1);
  cycle+=(travelled+Math.abs((requested||speed>.01)?turn:0)*.115)/stride;
  if(!requested&&speed<.025&&activity>.025)cycle+=dt*.80;
  const phase=cycle*TAU,trot=THREE.MathUtils.smoothstep(speed,.28,.78);
  const duty=THREE.MathUtils.lerp(1,THREE.MathUtils.lerp(.74,.60,trot),activity);
  const offsets=[0,.51,THREE.MathUtils.lerp(.77,.50,trot),THREE.MathUtils.lerp(.27,.01,trot)];

  root.position.y=-.004+Math.sin(time*1.85)*.001+activity*.006*Math.cos(phase*2-.5);
  root.rotation.set(-acceleration*.012+activity*.015*Math.sin(phase*2-.6),activity*.014*Math.sin(phase),clamp(-turnRate*speed*.029,-.052,.052)+activity*.010*Math.sin(phase));
  spine.rotation.y=activity*.030*Math.sin(phase-.65);
  spine.rotation.x=activity*.010*Math.sin(phase*2-1.0);
  spine.rotation.z=-root.rotation.z*.24;
  head.rotation.set(-root.rotation.x*.6+.012*Math.sin(time*1.15)+activity*.025*Math.sin(phase*2-1.15),activity*clamp(yawError*.19,-.22,.22)+.018*Math.sin(time*.73),-root.rotation.z*.65);
  tail.rotation.set(.035*Math.sin(time*4.6-.8),.025*Math.sin(time*3.2),(.07+activity*.12)*Math.sin(time*5.4+.35*Math.sin(time*.8)));
  tailTip.rotation.z=(.04+activity*.10)*Math.sin(time*5.4-.85);
  group.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();
  const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const cadence=Math.max(.8,speed/stride);

  legs.forEach((leg,i)=>{
   const foot=contacts[i];
   const neutral=leg.rest.clone().applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(group.position);neutral.y=ground;
   if(!foot.initialized){foot.planted.copy(neutral);foot.target.copy(neutral);foot.landing.copy(neutral);foot.initialized=true;}
   foot.phase=THREE.MathUtils.euclideanModulo(cycle+offsets[i],1);
   const stepId=Math.floor(cycle+offsets[i]);
   const drift=neutral.distanceTo(foot.planted);
   const scheduled=activity>.025&&foot.phase>=duty&&foot.lastStep!==stepId;
   // Recovery steps must not override the diagonal trot on straight sections.
   const reposition=drift>(turning?.10:.16)&&(requested||speed>.01);
   if(!foot.swinging&&(scheduled||reposition)){
    foot.swinging=true;foot.progress=0;foot.lastStep=stepId;
    foot.lift.copy(foot.target);foot.lift.y=ground;
   }
   if(foot.swinging){
    const duration=clamp((1-duty)/cadence,.14,.26);
    foot.progress=Math.min(1,foot.progress+dt/duration);
    const u=foot.progress;
    const future=neutral.clone().addScaledVector(forward,speed*((1-u)*duration+stride*duty/(2*Math.max(speed,.12))));
    foot.landing.copy(future);
    foot.target.lerpVectors(foot.lift,foot.landing,smooth(u));
    foot.target.y=ground+Math.pow(Math.sin(Math.PI*u),1.5)*(leg.front?.025+.030*trot:.035+.035*trot);
    if(u>=1){foot.planted.copy(foot.landing);foot.planted.y=ground;foot.target.copy(foot.planted);foot.swinging=false;}
   }else foot.target.copy(foot.planted);

  });
  // Fit the supporting shoulders above their planted paws. The body no longer
  // stays permanently crouched just to make a long stride reachable.
  group.updateMatrixWorld(true);
  let correction=0;
  legs.forEach((leg,i)=>{
   if(contacts[i].swinging)return;
   const shoulder=leg.upper.getWorldPosition(new THREE.Vector3()),foot=contacts[i].target;
   const horizontal=(shoulder.x-foot.x)**2+(shoulder.z-foot.z)**2;
   const length=leg.length1+leg.length2-.002;
   const ceiling=foot.y+Math.sqrt(Math.max(.08,length*length-horizontal));
   correction=Math.min(correction,ceiling-shoulder.y);
  });
  root.position.y+=correction;
  group.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();
  legs.forEach((leg,i)=>solveLeg(leg,contacts[i]));
  group.updateMatrixWorld(true);
  contacts.forEach((foot,i)=>{legs[i].paw.getWorldPosition(foot.sole);foot.error=foot.sole.distanceTo(foot.target);if(!foot.swinging)maxContactError=Math.max(maxContactError,foot.error);});
 }

 function update(time){
  if(lastTime===null){lastTime=time;step(0,time);return;}
  if(time<lastTime){lastTime=time;return;}
  let remaining=Math.min(time-lastTime,1.0);const end=time;
  // Fixed small integration steps make contact transitions and turning stable
  // both at 60 fps and on a slower browser, without advancing while paused.
  while(remaining>1e-7){const dt=Math.min(remaining,1/90);step(dt,end-remaining+dt);remaining-=dt;}
  lastTime=time;
 }
 function setRunning(value,time){update(time);requested=!!value;return requested;}
 return {update,setRunning,get running(){return requested;},get moving(){return speed>.002||activity>.025;},get diagnostics(){return {speed,distance,activity,turning,heading:yaw,maxContactError,feet:contacts.map(f=>({swinging:f.swinging,target:f.target.toArray(),sole:f.sole.toArray(),contactError:f.error}))};}};
}
