// Judge Dean LLC
import { ESTATE_MAP } from './estate-layout.js';
import { buildEstateNavigation } from './estate-navigation.js';

const HALF_WIDTH = .69, HALF_LENGTH = 1.21;
const MAX_SPEED = 13.4, REVERSE_SPEED = 4.2, WHEELBASE = 1.61;
const START = {x:-59.5, z:76, yaw:0};
const parking = {
  'Bridal suite': [START.x,START.z], 'Tailor lodge': [-63.5,40],
  'Glasshouse': [-34,32], 'Vineyard overlook': [-62,19.5],
  'Olive garden': [-15.8,14.3], 'Ceremony garden': [0,11.4],
  'Arrival court': [3.2,19.9], 'Reception hall': [10,11],
  'Cocktail terrace': [39,28], 'Lake pier': [70,53],
  'Supper pavilion': [40.5,78], 'Sparkler lawn': [5,70.6], 'Timber chapel': [-24,28.9]
};
const stops = new Map(Object.entries(parking).map(([name,[x,z]]) => [name,{x,z}]));

function approach(current, target, amount) {
  return current + Math.sign(target-current) * Math.min(amount,Math.abs(target-current));
}
function localPoint(pose, lateral, lengthwise) {
  const c=Math.cos(pose.yaw), s=Math.sin(pose.yaw);
  return {x:pose.x+c*lateral+s*lengthwise, z:pose.z-s*lateral+c*lengthwise};
}
// Squared distance from a point to the oriented body, used for tires, tree
// trunks, guests, and the photographer walking around the parked cart.
function distanceToBody(x,z,c,s,px,pz) {
  const dx=px-x, dz=pz-z;
  const lateral=Math.max(0,Math.abs(dx*c-dz*s)-HALF_WIDTH);
  const lengthwise=Math.max(0,Math.abs(dx*s+dz*c)-HALF_LENGTH);
  return lateral*lateral+lengthwise*lengthwise;
}

// Reuse the estate's route solver with enough clearance to turn the entire
// cart. Vehicle guidance ends outside venues; the exact camera mark stays
// available to the photographer on foot.
function buildCartNavigation(venue) {
  const {minX,minZ,maxX,maxZ}=venue.bounds, scale=2;
  const cols=Math.round((maxX-minX)*scale)+1, rows=Math.round((maxZ-minZ)*scale)+1;
  const occupied=new Uint8Array(cols*rows), clearance=new Uint8Array(cols*rows);
  const indoors=ESTATE_MAP.areas.filter(a=>['building','glasshouse','pavilion'].includes(a.kind));
  const lake=ESTATE_MAP.water[0];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++) {
    const x=minX+i/scale,z=minZ+j/scale;
    const reservation = indoors.some(a=>Math.abs(x-a.x)<=a.w/2&&Math.abs(z-a.z)<=a.d/2) ||
      (Math.abs(x-lake.x)<=lake.w/2&&Math.abs(z-lake.z)<=lake.d/2);
    if(reservation||venue.blocks(x,z)||i===0||i===cols-1||j===0||j===rows-1) occupied[j*cols+i]=1;
  }
  // Inflate the sampled walls and decrease the free space around the circular
  // obstacles separately. No new wall is inserted into the shared foot map.
  const offsets=[];
  for(let dj=-3;dj<=3;dj++)for(let di=-3;di<=3;di++){
    if(di*di+dj*dj<=10)offsets.push([di,dj]);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    if(!occupied[j*cols+i])continue;
    for(const [di,dj] of offsets){
      const ii=i+di,jj=j+dj;
      if(ii>=0&&jj>=0&&ii<cols&&jj<rows)clearance[jj*cols+ii]=1;
    }
  }
  return buildEstateNavigation({
    bounds:venue.bounds,colliders:venue.colliders.map(c=>({...c,r:c.r+1.32})),
    blocks(x,z) {
      const i=Math.round((x-minX)*scale),j=Math.round((z-minZ)*scale);
      return i<0||j<0||i>=cols||j>=rows||Boolean(clearance[j*cols+i]);
    }
  });
}

export function createCartDriving(venue) {
  const state={...START,speed:0,steer:0,driving:false};
  const {minX,maxX,minZ,maxZ}=venue.bounds;
  let navigation=null;

  const reset=()=>Object.assign(state,START,{speed:0,steer:0,driving:false});
  function outside(x,z,r=0) {
    return x<minX+r||x>maxX-r||z<minZ+r||z>maxZ-r;
  }
  function canStand(x,z,guests=[]) {
    if(outside(x,z,.23)||venue.blocks(x,z))return false;
    for(const c of venue.colliders)if((x-c.x)**2+(z-c.z)**2<(c.r+.23)**2)return false;
    for(const guest of guests){
      if(!guest.object.visible)continue;
      const p=guest.object.position;
      if((x-p.x)**2+(z-p.z)**2<.46**2)return false;
    }
    return true;
  }
  function clearPassage(from,to,guests=[]) {
    const steps=Math.max(1,Math.ceil(Math.hypot(from.x-to.x,from.z-to.z)/.16));
    for(let i=1;i<=steps;i++){
      const f=i/steps;
      if(!canStand(from.x+(to.x-from.x)*f,from.z+(to.z-from.z)*f,guests))return false;
    }
    return true;
  }
  function near(player) {
    if(state.driving || (player.x-state.x)**2+(player.z-state.z)**2>2.65**2)return false;
    return clearPassage(player,state);
  }
  function board(player) {
    if(!near(player))return false;
    state.driving=true;state.speed=0;state.steer=0;seat(player);
    return true;
  }
  function exit(player,guests=[]) {
    if(!state.driving)return false;
    state.speed=0;
    // First try the driver-side opening, then the passenger side and the ends.
    // Trace the whole step out so a vehicle parked beside a wall never lets
    // the player pass through the wall by selecting the other side of it.
    for(const [x,z] of [[-1.20,.08],[1.20,.08],[-1.2,.76],[1.2,.76],[-1.2,-.75],[1.2,-.75],[0,1.76],[0,-1.76]]){
      const sill=localPoint(state,x*.49,z*.58), candidate=localPoint(state,x,z);
      if(!clearPassage(sill,candidate,guests))continue;
      state.driving=false;state.steer=0;
      player.x=candidate.x;player.z=candidate.z;player.y=1.65;
      return true;
    }
    return false;
  }
  function seat(out) {
    const point=localPoint(state,-.32,.06);
    out.x=point.x;out.y=1.53;out.z=point.z;
    return out;
  }
  function blocksFoot(x,z) {
    return !state.driving&&distanceToBody(state.x,state.z,Math.cos(state.yaw),Math.sin(state.yaw),x,z)<.23**2;
  }
  function clearFootprint(x,z,yaw,guests) {
    const c=Math.cos(yaw),s=Math.sin(yaw);
    // Venue.blocks already includes a .23m pedestrian radius. A lattice of
    // body points spaced at most .35m apart detects even narrow railing posts.
    for(let row=-4;row<=4;row++)for(let col=-2;col<=2;col++){
      const lx=col*(HALF_WIDTH-.09)/2,lz=row*(HALF_LENGTH-.09)/4;
      const wx=x+c*lx+s*lz,wz=z-s*lx+c*lz;
      if(outside(wx,wz,.12)||venue.blocks(wx,wz))return false;
    }
    for(const obj of venue.colliders){
      if(Math.abs(obj.x-x)>obj.r+1.48||Math.abs(obj.z-z)>obj.r+1.48)continue;
      if(distanceToBody(x,z,c,s,obj.x,obj.z)<(obj.r+.03)**2)return false;
    }
    for(const guest of guests){
      if(!guest.object.visible)continue;
      const p=guest.object.position;
      if(Math.abs(p.x-x)>1.85||Math.abs(p.z-z)>1.85)continue;
      const after=distanceToBody(x,z,c,s,p.x,p.z);
      if(after>=.33**2)continue;
      // Scripted guests can walk up to an already parked cart. Allow backing
      // away from them, while a move further into their space stays blocked.
      const before=distanceToBody(state.x,state.z,Math.cos(state.yaw),Math.sin(state.yaw),p.x,p.z);
      if(after>before+1e-8)continue;
      if(before===0 && after===0 &&
          (x-p.x)**2+(z-p.z)**2>(state.x-p.x)**2+(state.z-p.z)**2+1e-8)continue;
      return false;
    }
    return true;
  }
  function step(dt,{throttle=0,steering=0,brake=false},guests=[]) {
    if(!state.driving||!(dt>0))return;
    const elapsed=Math.min(.3,dt), count=Math.ceil(elapsed*90), h=elapsed/count;
    throttle=Math.max(-1,Math.min(1,throttle));steering=Math.max(-1,Math.min(1,steering));
    for(let i=0;i<count;i++){
      state.steer=approach(state.steer,steering,h*(steering?3.8:5.6));
      const target=brake?0:throttle*(throttle<0?REVERSE_SPEED:MAX_SPEED);
      let acceleration=throttle<0?4.4:6.8;
      if(brake)acceleration=19;
      else if(!throttle)acceleration=2.25;
      else if(state.speed*throttle<0)acceleration=11.5;
      state.speed=approach(state.speed,target,h*acceleration);
      if(Math.abs(state.speed)<.002){state.speed=0;continue;}
      const angle=state.steer*(.63-.24*Math.min(1,Math.abs(state.speed)/MAX_SPEED));
      const turn=-state.speed*Math.tan(angle)/WHEELBASE*h;
      const mid=state.yaw+turn/2;
      const x=state.x-state.speed*Math.sin(mid)*h,z=state.z-state.speed*Math.cos(mid)*h;
      if(!clearFootprint(x,z,state.yaw+turn,guests)){state.speed=0;break;}
      state.x=x;state.z=z;
      state.yaw=Math.atan2(Math.sin(state.yaw+turn),Math.cos(state.yaw+turn));
    }
  }
  function parkingGoal(event) {return event ? stops.get(event.area)??null : null;}
  function parkingRoute(event) {
    const dest=parkingGoal(event);
    if(!dest)return [];
    navigation??=buildCartNavigation(venue);
    return navigation.route(state,dest);
  }
  return {state,reset,near,board,exit,step,seat,blocksFoot,parkingGoal,parkingRoute};
}
