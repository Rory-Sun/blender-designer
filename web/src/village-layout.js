// Shared footprints keep vegetation out of foundations and small front yards.
export const houses=[[5.4,-24,4.5,3.5,2.9,0],[10.5,-26.7,4.6,4,3.85,1],[15.5,-25.2,4.5,3.7,2.8,1],[1.2,-28.8,3.5,3.2,2.75,2],[-3.6,-29,4.1,3,2.4,1],[-8,-30,3.6,3.1,2.5,0],[-12.5,-31,3.7,3,2.35,1]];
export const houseAngles=[-.035,.025,-.070,.045,-.025,.060,-.045];
const plots=houses.map(([x,z,w,d],i)=>({x,z,w,d,c:Math.cos(houseAngles[i]),s:Math.sin(houseAngles[i])}));
export function isVillageYard(x,z){return plots.some(p=>{const dx=x-p.x,dz=z-p.z,lx=p.c*dx-p.s*dz,lz=p.s*dx+p.c*dz;return Math.abs(lx)<p.w/2+.38&&lz>-p.d/2-.22&&lz<p.d/2+1.35;});}
