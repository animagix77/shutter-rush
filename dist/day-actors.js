// Wedding-day blocking and character performances · Judge Dean LLC
import * as THREE from 'three';

const PI = Math.PI;
const {clamp, lerp, smoothstep} = THREE.MathUtils;

// Stage marks include travel through the garden gate, the center aisle, and the hall door.
// Four values specify a held pose. Between distinct marks actors turn into their path.
const BRIDE = 'The bride', GROOM = 'The groom', GRANDMA = 'Grandma';
const BEST = 'Best man', TOAST = 'The toastmaster', BAKER = 'The baker';
const STEWARD = 'The maître d’', UNCLE = 'A dinner guest';
const SAX = 'The saxophonist', AUNT = 'The bride’s aunt';
const subjectsByEvent = {
  veil:[BRIDE], rings:[BEST], kiss:[BRIDE,GROOM], portrait:[BRIDE,GROOM,GRANDMA],
  toast:[TOAST], cake:[BAKER,STEWARD], bouquet:[BRIDE,GRANDMA], dance:[SAX,AUNT], getaway:[BRIDE,GROOM]
};

const marks = {
  [BRIDE]: [
    [0,-16.9,11.6,.5],[7,-16.75,9.3,1.55],[16,-16.75,9.3,1.55],[23,-16.03,9.12,1.42],
    [31,-16.03,9.12,1.42],[38,-15.8,3,1.4],[46,-10.3,3,1.4],[52,-8.5,-2.7,1.4],
    [66,-.56,-4.05,.8],[75,-.56,-4.05,.8],[86,-.34,-4.04,1.48],[94,-.34,-4.04,1.48],
    [98,-8.9,-2.7,-1.3],[101,-13.8,1.6,-1.4],[103,-16.2,1.9,1.32],
    [125,-16.2,1.9,1.32],[132,-9.6,2,1.35],[139,-7.1,7.9,1.35],[149,.6,7.9,1.35],
    [162,.58,-2.65,2.9],[200,.58,-2.65,2.9],[207,-.52,-3.85,.26],[234,-.52,-3.85,.26],
    [250,-.1,10,.1],[264,.15,16.65,-2.60],[285,.15,16.65,-2.60],[290,.47,18.3,.1],[300,.54,21,.1]
  ],
  [GROOM]: [
    [0,.53,-4.08,-.82],[75,.53,-4.08,-.82],[86,.34,-4.03,-1.48],[94,.34,-4.03,-1.48],
    [98,-8.45,-3.3,-1.3],[101,-13.5,1.02,-1.4],[104,-16.35,1.24,1.35],
    [125,-16.35,1.24,1.35],[132,-9.9,1.27,1.35],[139,-6.6,7.3,1.35],[151,.1,7.5,1.35],
    [165,.15,-5.10,.24],[232,.15,-5.10,.24],[250,.55,9,.1],[264,.43,17.40,-2.6],
    [285,.43,17.40,-2.6],[290,.92,18.6,.1],[300,1.12,21.32,.1]
  ],
  [GRANDMA]: [
    [0,.73,.99,-2.77],[77,.73,.99,-2.77],[84,.88,7.55,-1.4],[94,-7.1,7.48,-1.3],
    [99,-10.6,2.95,-1.4],[103,-16.14,2.64,1.25],[125,-16.14,2.64,1.25],
    [136,-10.6,3.2,1.4],[145,-7.2,7.6,1.4],[155,.82,7.49,2.8],[171,.88,.99,-2.78],
    [200,.88,.99,-2.78],[208,.65,-1.18,-2.78],[236,.65,-1.18,-2.78],[248,.89,.98,-2.78]
  ],
  [BEST]: [
    [0,-3.2,15.1,.3],[39,-3.2,15.1,.3],[46,-1.9,15.7,1.1],[50,-1.4,15.51,1.54],
    [54,-.04,15.85,1.45],[59,1.7,16.2,1.65],[65,3.12,16.12,1.8],[70,.52,10.6,2.99],
    [75,.71,-3.38,1.1],[80,1.95,-3.18,-.54]
  ],
  [TOAST]: [[0,22.82,3.12,-1.3],[139,22.82,3.12,-1.3],[149,23,3,-1.45],[169,23,3,-1.45]],
  [UNCLE]: [
    [0,6.14,2.04,1.3],[34,6.14,2.04,1.3],[45,6.72,7.52,-1.4],
    [56,.9,7.55,3.0],[68,.94,-3.03,1.4],[77,2.85,-2.85,-1.7],
    [98,2.85,-2.85,-1.7],[102,-9.3,-2.7,-1.2],[106,-14.62,3.6,-2.0],
    [124,-14.62,3.6,-2],[127,-10.5,2.83,1.4],[131,-6.9,7.9,1.4],
    [135,7.6,7.9,1.4],[138,12.1,2.6,1.4],[140,16.0,2.68,1.45],
    [142,21.7,5.4,2.7],[163,21.7,5.4,2.7],[180,24.7,5.45,2.92]
  ],
  [BAKER]: [
    [0,28.5,1.75,1.55],[165,28.5,1.75,1.55],[170,30.9,-2.40,-1.58],
    [179,30.65,-2.63,-1.43],[184,28.9,-2.55,-1.48],[191,26.67,-2.42,-1.53],
    [197,25.75,-2.46,-1.55],[211,28.38,1.61,1.55]
  ],
  [STEWARD]: [
    [0,24.6,5,-2.48],[161,24.6,5,-2.48],[173,31.18,-1.64,-1.63],
    [178,31.12,-1.63,-1.63],[184,29.42,-1.92,-1.68],[194,26.32,-1.79,-1.62],
    [201,26.32,-1.79,-1.62],[211,24.6,5,-2.48]
  ]
};

const turns = (a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
function place(actor,t,track) {
  let i=1;
  while(i<track.length && t>=track[i][0])i++;
  const from=track[i-1],to=track[i]||from;
  const duration=to[0]-from[0],u=duration?clamp((t-from[0])/duration,0,1):0;
  const dx=to[1]-from[1],dz=to[2]-from[2],distance=Math.hypot(dx,dz);
  const facing=distance>.001?Math.atan2(dx,dz):to[3];
  const yaw=turns(turns(from[3],facing,smoothstep(u,0,.22)),to[3],smoothstep(u,.77,1));
  actor.root.position.set(lerp(from[1],to[1],u),0,lerp(from[2],to[2],u));
  actor.root.rotation.y=yaw;
  return duration?Math.min(2.3,distance/duration):0;
}

const envelope=(t,a,b,c,d)=>smoothstep(t,a,b)*(1-smoothstep(t,c,d));
function lift(actor,side,weight,shoulder,bend,spread) {
  const arm=actor.arms[side];
  arm.sh.rotation.x=lerp(arm.sh.rotation.x,shoulder,weight);
  arm.sh.rotation.z=lerp(arm.sh.rotation.z,spread,weight);
  arm.elbow.rotation.x=lerp(arm.elbow.rotation.x,bend,weight);
}
function throwPose(bride,grandma,t) {
  const draw=envelope(t,213,217.8,218.1,219.1);
  const release=envelope(t,218.1,219.6,220.3,222.1);
  const catchPose=envelope(t,220.2,222.6,223.5,225.6);
  bride.body.rotation.y+=.42*draw-.44*release;
  bride.body.rotation.x+=.22*draw-.13*release;
  lift(bride,1,draw,.90,-1.12,.32);
  lift(bride,1,release,-2.18,-.22,.18);
  grandma.head.rotation.x-=.58*catchPose;
  grandma.body.position.y+=.12*catchPose;
  for(let side=0;side<2;side++)lift(grandma,side,catchPose,-2.44,-.28,(side?1:-1)*.16);
  const proud=envelope(t,223.2,225,233.5,236);
  grandma.root.rotation.y+=1.15*proud;
  lift(grandma,1,proud,-1.57,-.96,.21);
}

// An uncle chooses the approach the photographer was using, then holds his tablet there
// for a few seconds. His feet and tablet both move, so circling him opens up the frame.
const interruptions=[
  {start:78,end:98,x:0,z:-4.03,angle:0,parkX:2.85,parkZ:-2.85},
  {start:106,end:124,x:-16.15,z:1.88,angle:1.42,parkX:-14.62,parkZ:3.6},
  {start:142,end:163,x:23,z:3,angle:-1.5,parkX:21.7,parkZ:5.4}
];
function makeTablet() {
  const outer=new THREE.Mesh(new THREE.BoxGeometry(.64,.42,.029),new THREE.MeshStandardMaterial({color:0x353a39,roughness:.38,metalness:.32}));
  outer.name='Uncle’s raised tablet';
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(.595,.373),new THREE.MeshStandardMaterial({color:0x8faeab,emissive:0x3e605d,emissiveIntensity:.38,roughness:.24}));
  panel.rotation.y=Math.PI;panel.position.z=-.016;outer.add(panel);
  const camera=new THREE.Mesh(new THREE.CircleGeometry(.017,10),new THREE.MeshStandardMaterial({color:0x18221f,roughness:.16}));
  camera.position.set(-.276,.161,.016);outer.add(camera);
  outer.visible=false;
  return outer;
}
export function makeDayActors(people,subjects,gait) {
  const cast=Object.fromEntries(people.map(actor=>[actor.root.name,actor]));
  const subjectsByName=Object.fromEntries(subjects.map(s=>[s.name,s]));
  const events=Object.fromEntries(Object.entries(subjectsByEvent).map(([id,names])=>[id,names.map(name=>subjectsByName[name])]));
  const bride=cast[BRIDE],groom=cast[GROOM],grandma=cast[GRANDMA],uncle=cast[UNCLE];
  const tablet=makeTablet();
  uncle.body.add(tablet);tablet.position.set(0,1.56,.32);
  const lanes=new Map();
  let lastTime=-1;
  function clear() {
    if(lastTime<0)return;
    lastTime=-1;lanes.clear();tablet.visible=false;
    for(const a of people){
      if(a.dayLegs){a.dayLegs.forEach(({hip})=>hip.visible=false);a.fixedLegs.visible=true;}
    }
  }
  function block(t,player) {
    const window=interruptions.find(w=>t>=w.start&&t<w.end);
    tablet.visible=Boolean(window);
    if(!window)return;
    const cycle=Math.floor((t-window.start)/7),age=(t-window.start)%7,key=window.start+cycle*7;
    if(!lanes.has(key)){
      const dx=(player?.x??window.x)-window.x,dz=(player?.z??window.z)-window.z;
      const lead=Math.hypot(dx,dz)>1?Math.atan2(dx,dz):window.angle;
      lanes.set(key,lead);
    }
    const angle=lanes.get(key),reach=1.42;
    // A short sidestep from his mark, a stationary hold, then a clear escape gap.
    const invade=envelope(age,0,1.35,4.65,6.5)*smoothstep(window.end-t,0,1.25);
    const x=lerp(window.parkX,window.x+Math.sin(angle)*reach,invade);
    const z=lerp(window.parkZ,window.z+Math.cos(angle)*reach,invade);
    uncle.root.position.set(x,0,z);uncle.root.rotation.y=Math.atan2(window.x-x,window.z-z);
    uncle.body.rotation.set(0,0,.025*Math.sin(t*3));uncle.head.rotation.set(.06,0,0);
    uncle.body.position.y=-.015;
    for(let side=0;side<2;side++){
      lift(uncle,side,1,-1.16,-1.28,(side?1:-1)*.075);
      if(age<1.35 || age>4.65)gait(uncle.legs[side],t*1.35+side*.5,-.015);
      else {
        const leg=uncle.legs[side];leg.hip.position.y=.858;
        leg.hip.rotation.x=-.12;leg.knee.rotation.x=.19;leg.ankle.rotation.x=-.07;
      }
    }
    tablet.rotation.set(-.08,0,.025*Math.sin(t*2));
  }
  function pose(t,player) {
    if(t<lastTime)lanes.clear();
    lastTime=t;
    for(const [name,track] of Object.entries(marks)) {
      const a=cast[name],speed=place(a,t,track);
      if(a.dayLegs){
        a.fixedLegs.visible=false;
        a.dayLegs.forEach(({hip})=>hip.visible=true);
        for(let n=0;n<2;n++) {
          const stepping=speed>.08;
          if(stepping){
            gait(a.dayLegs[n],t*(.95+Math.min(speed,2)*.38)+n*.5,0);
            a.arms[n].sh.rotation.x+=.31*Math.sin(t*7+n*PI);
          }else {
            const leg=a.dayLegs[n];leg.hip.position.y=.873;
            leg.hip.rotation.x=-.06;leg.knee.rotation.x=.12;leg.ankle.rotation.x=-.06;
          }
        }
      }
      if(speed>.08)a.body.position.y+=.018*Math.sin(t*6.2);
    }
    const veil=envelope(t,8,18,25,31),rings=envelope(t,39,47,60,65);
    bride.head.rotation.x-=.47*veil;bride.body.rotation.z-=.12*veil;
    lift(bride,1,veil,-2.18,-.30,.56);lift(bride,0,veil,-.83,-.57,-.33);
    const best=cast[BEST];best.body.rotation.x+=.42*rings;best.head.rotation.x+=.36*rings;
    lift(best,1,rings,-1.33,-.18,.18);lift(best,0,rings,-.90,-.47,-.35);

    const kiss=envelope(t,77,87,91,97);
    bride.root.position.x+=.14*kiss;groom.root.position.x-=.125*kiss;
    bride.body.rotation.x+=.064*kiss;groom.body.rotation.x+=.085*kiss;
    bride.head.rotation.z+=.23*kiss;groom.head.rotation.z-=.17*kiss;
    bride.head.rotation.y*=1-kiss;groom.head.rotation.y*=1-kiss;
    lift(bride,0,kiss,-1.13,-.67,-.18);lift(groom,1,kiss,-.98,-.64,.16);

    const portrait=envelope(t,103,108,121,125);
    for(const a of [bride,groom,grandma]){
      a.head.rotation.y*=1-.85*portrait;a.head.rotation.x*=1-.75*portrait;
    }
    const ears=envelope(t,109,114,119.5,123);
    lift(grandma,0,ears,-2.61,-.21,-.35);
    grandma.head.rotation.z+=.24*ears;groom.head.rotation.z-=.11*ears;

    const toast=envelope(t,139,151,158,165),speaker=cast[TOAST];
    lift(speaker,1,toast,-2.00,-.63,.38);lift(speaker,0,toast,-1.17,-.42,-.71);
    speaker.body.rotation.z-=.09*toast;speaker.head.rotation.x-=.19*toast;

    const chase=envelope(t,170,179,191,197);
    for(const a of [cast[BAKER],cast[STEWARD]]){
      a.body.rotation.x+=.37*chase;a.head.rotation.x+=.15*chase;
      lift(a,0,chase,-1.39,-.22,-.20);lift(a,1,chase,-1.31,-.31,.24);
    }
    throwPose(bride,grandma,t);
    const disco=envelope(t,211,216,235,240);
    if(disco>0){
      for(const [k,name] of [SAX,AUNT].entries()){
        const a=cast[name],beat=(t-214)*2.96+k*PI,spin=smoothstep(t,224,231);
        a.root.position.set(23+Math.sin(beat*.52)*(.62+k*.27),.11,
          2+(k?-.68:.68)+Math.sin(beat)*.22);
        a.root.rotation.y+=disco*(spin*PI*4+.42*Math.sin(beat));
        a.body.rotation.z+=.15*Math.cos(beat)*disco;
        const up=0.5+0.5*Math.cos(beat);
        lift(a,0,disco,-1.02-1.39*up,-.35,-.57);lift(a,1,disco,-2.2+1.20*up,-.42,.62);
      }
    }
    const wave=envelope(t,264,271,284,291);
    for(const [index,a] of [bride,groom].entries()){
      const side=index?1:0,beat=Math.sin(t*7.2+index);
      lift(a,side,wave,-2.29,-.75,(side?1:-1)*(.36+.24*beat));
      a.head.rotation.z+=.13*wave;
    }
    block(t,player);
  }
  return {pose,clear,occluders:[tablet],subjects:id=>events[id]||[]};
}
