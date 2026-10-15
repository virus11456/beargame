import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const rounded=new RoundedBoxGeometry(1,1,1,2,.15);
const smooth=new THREE.SphereGeometry(1,12,8);
const materials=new Map();
function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.72}));return materials.get(color);}
function part(parent,color,x,y,z,w,h,d,geometry=rounded){const mesh=new THREE.Mesh(geometry,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
export function createHuman(color='#e18b47'){
 const g=new THREE.Group(),legs=[],arms=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.23,.57,0);g.add(leg);part(leg,'#30485c',0,-.16,0,.32,.42,.38);part(leg,'#203545',0,-.43,.08,.37,.22,.55);legs.push(leg);
  const arm=new THREE.Group();arm.position.set(side*.55,1.25,0);g.add(arm);part(arm,color,0,-.2,0,.28,.55,.36);part(arm,'#fff1d7',0,-.46,.04,.3,.15,.37);part(arm,'#465460',0,-.56,.08,.26,.2,.28);arms.push(arm);
 }
 part(g,color,0,.96,0,1,.92,.72);part(g,'#f7e7c8',0,.56,0,1.02,.13,.75);
 part(g,'#5e4136',0,1.04,.375,.055,.65,.025);for(const side of [-1,1])part(g,'#c16c36',side*.28,.78,.38,.23,.18,.04);
 part(g,color,0,1.73,-.07,.56,.56,.49,smooth);part(g,'#fff0d1',0,1.72,.2,.44,.44,.22,smooth);part(g,'#edbb91',0,1.72,.32,.33,.33,.13,smooth);
 for(const side of [-1,1])part(g,'#24394b',side*.12,1.78,.44,.04,.055,.035,smooth);
 part(g,color,0,2.05,-.02,.48,.18,.43,smooth);part(g,'#fff0d1',0,2.23,-.02,.13,.13,.13,smooth);
 part(g,'#eebc65',0,1.38,.1,1.04,.18,.78);part(g,'#eebc65',-.27,1.17,.43,.19,.42,.08);
 g.userData.limbs={legs,arms};g.userData.previous=new THREE.Vector3();return g;
}
export function animateHuman(g,time,dt){const previous=g.userData.previous;const moving=previous.distanceTo(g.position)>.005;const stride=moving?Math.sin(time*13)*.55:0;g.userData.limbs.legs.forEach((p,i)=>p.rotation.x=stride*(i?1:-1));g.userData.limbs.arms.forEach((p,i)=>p.rotation.x=-stride*(i?1:-1)*.7);previous.copy(g.position);}
export function food(parent,type,x,y,z,w=.5,h=.2,d=.45){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);part(g,type==='meal'?'#a95832':type==='cut'?'#ee9679':'#cc5c59',0,0,0,w,h,d);if(type==='meal'){for(const k of [-1,0,1]){const stripe=part(g,'#643f2e',k*w*.22,h*.49,0,w*.07,.015,d*.7);stripe.rotation.y=-.25;}}else part(g,'#ffe1bc',w*.12,h*.5,0,w*.2,.02,d*.27,smooth);return g;}
