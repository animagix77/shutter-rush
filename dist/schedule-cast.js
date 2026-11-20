// Judge Dean LLC
import * as THREE from 'three';
import { DAY_EVENTS } from './day-timeline.js';
const bride='The bride',groom='The groom',maid='Maid of honor',best='Best man';
const florist='The florist',baker='The baker',steward='The maître d’',aunt='The bride’s aunt',sax='The saxophonist';
// The performers are the same articulated people used in the ceremony and replay.
const calls={
  makeup:[bride,florist], boutonniere:[groom,best], firstlook:[bride,groom], party:[bride,groom,maid,best],
  letters:[bride], guestbook:[maid], processional:[bride,best], vows:[bride,groom], exchange:[bride,groom],
  signing:[bride], confetti:[bride,groom], cocktails:[steward], canapes:[steward], lake:[bride,groom],
  entrance:[bride,groom], dinner:[baker], firstdance:[bride,groom], lastdance:[aunt,sax],
  sparklers:[bride,groom,maid,best,aunt,sax]
};
const PI=Math.PI;
function raise(a,n,shoulder,elbow,spread=0){
  const arm=a.arms[n];arm.sh.rotation.x=shoulder;arm.sh.rotation.z=spread;arm.elbow.rotation.x=elbow;
}
function setPose(a,x,z,yaw){
  a.root.position.set(x,0,z);a.root.rotation.y=yaw;
  a.body.position.y=0;a.body.rotation.set(0,0,0);
  a.head.rotation.set(0,0,0);
  for(let i=0;i<2;i++){
    raise(a,i,-.04,-.22,(i?1:-1)*.07);
    const leg=a.dayLegs?.[i]??a.legs[i];
    if(leg){
      leg.hip.position.y=.873;leg.hip.rotation.x=-.06;leg.knee.rotation.x=.12;leg.ankle.rotation.x=-.06;
    }
  }
}
function pace(a,t,gait){
  for(const [i,leg] of (a.dayLegs??a.legs).entries())gait(leg,t*1.25+i*.5,-.012);
  a.body.position.y+=.012*Math.cos(t*13);
}
function poseCast(e,t,actors,gait){
  const s=t-e.peak,u=THREE.MathUtils.clamp((t-e.start)/(e.end-e.start),0,1);
  const action=Math.exp(-s*s/14);
  const {x,z}=e;
  let a=actors[0],b=actors[1];
  switch(e.id){
    case 'makeup':
      setPose(a,x+.40,z+.1,.22);setPose(b,x+.99,z+.22,-1.66);
      a.head.rotation.y=.32;b.body.rotation.x=.13;
      raise(b,0,-1.72,-.75-.13*Math.sin(t*3),-.18);break;
    case 'boutonniere':
      setPose(a,x-.25,z,-.05);setPose(b,x+.39,z+.19,-1.48);
      a.head.rotation.x=.38;raise(b,0,-1.38,-.73,.10);raise(b,1,-1.26,-.64,-.08);break;
    case 'firstlook':
      setPose(a,x-.52,z-.08,1.23);setPose(b,x+.52,z+.02,1.66-3.15*THREE.MathUtils.smoothstep(s,-4,0));
      a.head.rotation.z=.11;raise(b,0,-.72,-1.47,-.23);raise(a,1,-.84,-1.29,.27);break;
    case 'party':
      actors.forEach((p,i)=>{
        const slots=[-.47,.43,-1.43,1.39];setPose(p,x+slots[i],z+(i>1?-.18:.05),-.11*slots[i]);
        p.head.rotation.z=Math.sin(t*.7+i)*.045;
        if(i>1)raise(p,i===2?0:1,-1.90-action*.40,-.42,(i===2?-1:1)*.42);
      });break;
    case 'letters':case 'vows':
      setPose(a,x-.24,z-.17,.20);a.head.rotation.x=.23+.19*Math.cos(t*.52);
      raise(a,0,-.77,-1.14,-.14);raise(a,1,-.74,-1.0,.18);
      if(b){setPose(b,x+.68,z-.1,-.95);b.head.rotation.y=-.32;}
      break;
    case 'guestbook':case 'signing':
      setPose(a,x-.20,z-.52,.22);a.body.rotation.x=.24;a.head.rotation.x=.50;
      raise(a,1,-.62,-.68+.12*Math.cos(t*3),-.19);break;
    case 'processional':case 'confetti':case 'entrance':
      actors.forEach((p,i)=>{
        const travel=e.id==='processional'?2.6-5.2*u:e.id==='confetti'?-1.7+3.4*u:-1.2+2.4*u;
        setPose(p,x+(i? .36:-.36),z+travel,e.id==='processional'?PI:0);pace(p,t+i*.15,gait);
        raise(p,i?0:1,-.63,-.95,(i?-1:1)*.23);
        if(e.id==='entrance')raise(p,i?1:0,-1.72-.45*action,-.46,(i?1:-1)*.51);
      });break;
    case 'exchange':
      setPose(a,x-.39,z-.12,.97);setPose(b,x+.38,z-.10,-.97);
      raise(a,1,-1.02,-.74,.10);raise(b,0,-1.0,-.84,-.06);
      a.head.rotation.x=b.head.rotation.x=.39;break;
    case 'cocktails':
      setPose(a,x-.63,z-.22,.72);raise(a,1,-1.33,-.86,.21);a.head.rotation.x=.34;break;
    case 'canapes':
      setPose(a,x+.64*Math.sin(s*.26)-.2,z+.34*Math.cos(s*.26)-.36,.03);
      raise(a,0,-.78,-1.34,-.13);raise(a,1,-.82,-1.21,.12);break;
    case 'lake':
      setPose(a,x-.37,z,.07);setPose(b,x+.31,z+.02,-.23);a.head.rotation.z=.11;b.head.rotation.z=-.09;
      raise(b,0,-.63,-1.38,-.60);break;
    case 'dinner':
      setPose(a,x-.38,z-.54,.44);a.head.rotation.x=.24;raise(a,1,-.88-.6*action,-.92,.22);break;
    case 'firstdance':case 'lastdance':{
      const rot=Math.sin(s*.31)*.37+(e.id==='firstdance'?s*.32:.37);
      actors.forEach((p,i)=>{
        const ang=rot+i*PI;
        setPose(p,x+.44*Math.sin(ang),z+.44*Math.cos(ang),ang+PI);
        p.body.position.y=.025*Math.sin(t*2.6);raise(p,0,-1.15,-.68,-.23);raise(p,1,-.96,-.95,.30);
        if(e.id==='lastdance'){p.body.rotation.x=.56*action;raise(p,i,-.66,-.42,(i?1:-1)*.69);}
        else p.head.rotation.z=(i?-1:1)*(.04+.13*action);
      });break;
    }
    case 'sparklers':
      actors.forEach((p,i)=>{
        if(i<2){setPose(p,x+(i?.33:-.33),z-1.25+2.5*u,0);pace(p,t,gait);raise(p,i,-1.84,-.46,(i?1:-1)*.35);}
        else {const side=i%2?1:-1;setPose(p,x+side*1.33,z+(i<4?-.85:.89),side*-1.47);raise(p,side>0?0:1,-2.14,-.24,side*.18);}
      });break;
  }
}
export function createScheduleCast(people,subjects,gait){
  const roster=Object.fromEntries(people.map(a=>[a.root.name,a]));
  const byName=Object.fromEntries(subjects.map(a=>[a.name,a]));
  const performing=DAY_EVENTS.filter(e=>calls[e.id]).map(e=>({event:e,actors:calls[e.id].map(n=>roster[n])}));
  const principals={...calls,makeup:[bride],boutonniere:[groom],vows:[bride],sparklers:[bride,groom]};
  const eventSubjects=Object.fromEntries(Object.entries(principals).map(([id,names])=>[id,names.map(n=>byName[n])]));
  return {
    update(t){
      // Allow performers to take their marks just before the shutter window.
      for(const {event,actors} of performing)if(t>=event.start-1&&t<=event.end+1)poseCast(event,t,actors,gait);
    },
    subjects:id=>eventSubjects[id]??[]
  };
}
