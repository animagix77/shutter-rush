// Recorded photographer for the second bouquet take · Judge Dean LLC
import * as THREE from 'three';

const takeLength = 30;
const samplesPerSecond = 30;
const tau = Math.PI * 2;
const { clamp, lerp } = THREE.MathUtils;
const up = new THREE.Vector3(0, 1, 0);
const vec = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const keyedAt = (list, t, read) => {
  let lo = 0, hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (read(list[mid]) <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
};
const angle = (a,b,u) => a + Math.atan2(Math.sin(b-a),Math.cos(b-a))*u;

function interpolate(a,b,t) {
  if (!b || t <= a.t) return {...a};
  if (t >= b.t) return {...b};
  const u = (t-a.t)/(b.t-a.t);
  return {
    t, x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u),z:lerp(a.z,b.z,u),
    footX:lerp(a.footX,b.footX,u),footZ:lerp(a.footZ,b.footZ,u),
    yaw:angle(a.yaw,b.yaw,u),pitch:lerp(a.pitch,b.pitch,u),roll:lerp(a.roll,b.roll,u),
    nudge:lerp(a.nudge,b.nudge,u),aim:lerp(a.aim,b.aim,u),kit:a.kit,portrait:a.portrait,
    focal:a.kit===b.kit ? lerp(a.focal,b.focal,u) : a.focal,
    service:a.serviceKind===b.serviceKind && b.service>=a.service ? lerp(a.service,b.service,u) : a.service,
    serviceKind:a.serviceKind, distance:lerp(a.distance,b.distance,u),
    vx:lerp(a.vx,b.vx,u), vz:lerp(a.vz,b.vz,u)
  };
}

// Bake pieces of each rigid body part together. The photographer needs only one
// material/draw per joint despite all of the straps, controls, and stitching.
const cloth = new THREE.MeshStandardMaterial({vertexColors:true, roughness:.76, flatShading:true});
function sculpture(parent, name, build) {
  const positions=[],normals=[],colors=[], matrix=new THREE.Matrix4(), q=new THREE.Quaternion();
  function piece(geometry,color,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
    q.setFromEuler(new THREE.Euler(rx,ry,rz));
    matrix.compose(vec(x,y,z),q,vec(sx,sy,sz));geometry.applyMatrix4(matrix);
    const p=geometry.attributes.position,n=geometry.attributes.normal,c=new THREE.Color(color);
    const indices=geometry.index;
    for(let i=0, count=indices?.count??p.count;i<count;i++){
      const k=indices?indices.getX(i):i;
      positions.push(p.getX(k),p.getY(k),p.getZ(k));normals.push(n.getX(k),n.getY(k),n.getZ(k));colors.push(c.r,c.g,c.b);
    }
    geometry.dispose();
  }
  const box=(c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>piece(new THREE.BoxGeometry(w,h,d),c,x,y,z,1,1,1,rx,ry,rz);
  const oval=(c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>piece(new THREE.SphereGeometry(1,12,8),c,x,y,z,w,h,d,rx,ry,rz);
  const cylinder=(c,x,y,z,top,bottom,h,rx=0,ry=0,rz=0,n=16)=>piece(new THREE.CylinderGeometry(top,bottom,h,n),c,x,y,z,1,1,1,rx,ry,rz);
  build({box,oval,cylinder});
  const g=new THREE.BufferGeometry();
  for(const [key,data] of [['position',positions],['normal',normals],['color',colors]])g.setAttribute(key,new THREE.Float32BufferAttribute(data,3));
  g.computeBoundingSphere();
  const m=new THREE.Mesh(g,cloth);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}

const palette={vest:0x495449,coat:0x344443,pants:0x394047,skin:0xa86f53,cap:0x374940,black:0x232722,
  belt:0x443d31,copper:0xca722f,orange:0xef843f,leather:0x675943,silver:0xb9b8ab,ivory:0xeee0c7};

function makeBadge(parent,front) {
  if (typeof document==='undefined') return;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=100;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.fillStyle='#292e26';ctx.fillRect(0,0,256,100);
  ctx.strokeStyle='#d59458';ctx.lineWidth=3;ctx.strokeRect(4,4,248,92);
  ctx.textAlign='center';ctx.fillStyle='#fff1d3';ctx.font='bold 44px sans-serif';ctx.fillText('TAKE 01',128,53);
  ctx.fillStyle='#ffb574';ctx.font='bold 19px sans-serif';ctx.fillText('PHOTO CREW',128,80);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshStandardMaterial({map:texture,roughness:.9});
  const badge=new THREE.Mesh(new THREE.PlaneGeometry(front?.114:.225,front?.045:.088),material);
  badge.position.set(front?-.095:0,front?.394:.426,front?-.148:.171);
  if(front)badge.rotation.y=Math.PI;
  parent.add(badge);
}

function bodyModel(torso) {
  const p=palette;
  sculpture(torso,'Field jacket, harness and pocketed vest',({box,oval,cylinder})=>{
    oval(p.pants,0,0,.014,.167,.118,.122);
    oval(p.coat,0,.292,0,.214,.273,.127);
    oval(p.vest,0,.261,-.006,.207,.236,.137);
    cylinder(p.skin,0,.526,0,.060,.068,.10);
    for(const s of [-1,1]){
      box(p.leather,s*.156,.316,-.094,.051,.361,.046,-.12,0,s*.12);
      box(p.orange,s*.161,.469,-.092,.044,.083,.036,-.24,0,s*.15);
      box(p.belt,s*.165,.232,-.125,.070,.104,.055,0,s*.32,s*.04);
      box(p.leather,s*.081,.157,-.136,.089,.108,.063,0,s*.14,0);
      box(p.copper,s*.081,.18,-.174,.081,.023,.017,0,s*.14,0);
      box(p.belt,s*.174,.005,.036,.072,.133,.14,0,s*.14,s*.035);
      box(p.orange,s*.211,.042,.026,.013,.022,.092,0,0,s*.035);
    }
    oval(p.belt,0,.042,.012,.184,.043,.130);
    box(p.silver,0,.046,-.119,.066,.041,.018);
    box(p.cap,0,.291,.115,.254,.335,.093,-.07);
    box(p.leather,0,.194,.168,.230,.129,.043,-.07);
    for(const s of [-1,1]) box(p.orange,s*.087,.271,.173,.014,.22,.014,-.07);
  });
  makeBadge(torso,false);makeBadge(torso,true);
  const head=new THREE.Group();torso.add(head);
  sculpture(head,'Face and working cap',({box,oval})=>{
    oval(p.skin,0,.04,-.003,.100,.135,.095);
    oval(0x3e332c,0,.075,.046,.102,.115,.072);
    oval(p.skin,0,.027,-.095,.020,.024,.024);
    for (const s of [-1,1]){
      oval(p.skin,s*.1,.045,0,.019,.032,.022);
      oval(0x292822,s*.041,.056,-.09,.008,.007,.006);
      box(0x4c3b30,s*.041,.074,-.088,.042,.008,.006,0,0,s*.06);
    }
    oval(p.cap,0,.134,.004,.113,.073,.112);
    oval(p.cap,0,.113,-.099,.108,.014,.067,-.12);
    box(p.orange,0,.151,-.092,.044,.024,.009,-.20);
    box(0x4d403a,0,-.012,-.078,.043,.004,.007);
  });return head;
}

function cameraModel(torso,kit) {
  const p=palette,tele=kit==='tele',g=new THREE.Group();g.name=tele?'Replay telephoto':'Replay wide camera';
  torso.add(g);
  sculpture(g,'Camera body and optics',({box,cylinder})=>{
    box(tele?p.black:0x636b66,0,0,0,.166,.112,.076);
    box(p.black,.073,-.005,-.011,.044,.111,.094);
    box(p.black,-.018,.062,0,.066,.034,.053);
    box(0x314343,-.014,0,.041,.095,.064,.007);
    cylinder(p.silver,.054,.062,.007,.020,.020,.012);
    for(const x of [.051,.074])box(p.silver,x,.012,.043,.007,.007,.006);
    if(tele){
      box(0x2d3332,0,.102,-.011,.038,.060,.043);
      box(p.black,0,.143,-.013,.090,.041,.068);
      box(p.ivory,0,.145,-.049,.073,.022,.006);
    }
    cylinder(p.black,-.015,.004,-.065,.049,.046,.069,Math.PI/2);
    cylinder(tele?p.ivory:p.black,-.015,.004,-.115,.057,.049,.094,Math.PI/2);
    cylinder(p.orange,-.015,.004,-.092,.051,.051,.008,Math.PI/2);
  });
  const barrel=sculpture(g,tele?'Extending lens barrel':'Wide lens hood',({cylinder})=>{
    const b=(col,z,rad,len)=>cylinder(col,-.015,.004,z,rad,rad,len,Math.PI/2,0,0,24);
    if(tele){
      b(p.ivory,-.164,.051,.11);b(p.black,-.207,.056,.032);
      b(p.ivory,-.254,.057,.093);b(0x343a38,-.286,.062,.03);
      b(0x263942,-.303,.052,.006);
    }else{b(0x303736,-.153,.063,.041);b(0x243b46,-.176,.054,.006);}
  });
  const flash=new THREE.Mesh(new THREE.OctahedronGeometry(1),new THREE.MeshBasicMaterial({color:0xfff5cf,toneMapped:false}));
  flash.name='Recorded shutter flash';flash.position.set(0,tele?.145:.057,tele?-.06:-.046);
  flash.visible=false;g.add(flash);return {g,barrel,flash};
}
const unit=vec(), midpoint=vec(), outward=vec();
function placeLink(mesh,a,b) {
  unit.subVectors(b,a);
  mesh.position.addVectors(a,b).multiplyScalar(.5);
  mesh.scale.y=Math.max(.0001,unit.length());
  mesh.quaternion.setFromUnitVectors(up,unit.normalize());
}
// Bend toward the outward elbow/forward knee while retaining limb lengths.
function bend(a,b,side,l1,l2,result) {
  unit.subVectors(b,a);
  const length=Math.max(.0001,unit.length());unit.divideScalar(length);
  const d=clamp(length,Math.abs(l1-l2)+.00001,l1+l2);
  const along=(l1*l1-l2*l2+d*d)/(2*d);
  outward.copy(side).addScaledVector(unit,-side.dot(unit)).normalize();
  result.copy(a).addScaledVector(unit,along).addScaledVector(outward,Math.sqrt(Math.max(0,l1*l1-along*along)));
}
function limb(root,side,leg) {
  const p=palette;
  const upper=sculpture(root,leg?'Trouser leg':'Jacket sleeve',({cylinder,box,oval})=>{
    cylinder(leg?p.pants:p.coat,0,0,0,leg?.081:.057,leg?.105:.076,1,0,0,0,10);
    oval(leg?p.pants:p.coat,0,-.44,0,leg?.105:.078,.14,leg?.103:.074);
    oval(leg?p.pants:p.coat,0,.48,0,leg?.083:.059,.155,leg?.079:.056);
    if(leg)box(0x485053,side*.075,-.062,.012,.045,.40,.086);
    else cylinder(p.orange,0,.28,0,.062,.065,.095,0,0,0,10);
  });
  const lower=sculpture(root,leg?'Trouser cuff':'Rolled cuff and forearm',({cylinder,oval})=>{
    cylinder(leg?p.pants:p.skin,0,0,0,leg?.058:.035,leg?.079:.048,1,0,0,0,10);
    oval(leg?p.pants:p.coat,0,-.46,0,leg?.079:.052,.125,leg?.078:.050);
    cylinder(leg?p.black:p.coat,0,leg?.36:-.31,0,leg?.061:.051,leg?.063:.054,leg?.16:.37,0,0,0,10);
  });
  const end=sculpture(root,leg?'Boot':'Camera glove',({oval,box})=>{
    if(leg){
      oval(p.black,0,-.025,-.036,.068,.054,.124);
      box(0x212523,0,-.065,-.039,.128,.020,.201);
      for(const z of [-.046,-.077])box(p.leather,0,.007,z,.078,.009,.012);
    }else{
      oval(p.black,0,.006,.008,.042,.045,.051);
      oval(p.skin,side*.015,.014,-.030,.032,.024,.034);
    }
  });
  return {side,upper,lower,end,from:vec(),to:vec(),joint:vec(),hint:leg?vec(0,0,-1):vec(side,.05,.5)};
}
function poseLinks(item,a,b,lenA,lenB){
  bend(a,b,item.hint,lenA,lenB,item.joint);
  placeLink(item.upper,a,item.joint);placeLink(item.lower,item.joint,b);item.end.position.copy(b);
}
function buildPhotographer(scene) {
  const root=new THREE.Group(),torso=new THREE.Group();
  root.name='Take 1 photographer';root.visible=false;scene.add(root);root.add(torso);
  const head=bodyModel(torso);
  const legs=[limb(root,-1,true),limb(root,1,true)],arms=[limb(torso,-1,false),limb(torso,1,false)];
  const cams={wide:cameraModel(torso,'wide'),tele:cameraModel(torso,'tele')};
  return {root,torso,head,legs,arms,cams};
}

function articulate(model,p,flashStrength){
  const {root,torso,head,legs,arms,cams}=model;
  const crouch=clamp((1.65-p.y)/.66,0,1),speed=Math.hypot(p.vx,p.vz);
  const stride=Math.min(1,speed/2.3),travel=p.distance*6.7;
  const hipY=.895-.546*crouch;
  const cos=Math.cos(p.yaw),sin=Math.sin(p.yaw),den=Math.max(speed,.0001);
  const localDX=(cos*p.vx-sin*p.vz)/den,localDZ=(sin*p.vx+cos*p.vz)/den;
  root.position.set(p.x,0,p.z);root.rotation.y=p.yaw;
  torso.position.set(0,hipY,.07*crouch);
  torso.rotation.set(-.145*crouch-.034*stride,0,p.roll*.75);
  head.position.set(0,.665-.064*crouch,0);
  head.rotation.x=clamp(p.pitch,-.86,.90)*.70-torso.rotation.x*.55;
  for(const leg of legs){
    const wave=Math.sin(travel+(leg.side<0?0:Math.PI))*stride;
    const lift=Math.max(0,Math.cos(travel+(leg.side<0?0:Math.PI)))*stride;
    leg.from.set(leg.side*.106,hipY,.07*crouch);
    leg.to.set(leg.side*(.113+crouch*.032)+localDX*.245*wave,.077+lift*.090,.018+localDZ*.245*wave);
    poseLinks(leg,leg.from,leg.to,.423,.410);
    leg.end.rotation.x=wave*.14;
  }
  const cam=cams[p.kit], spare=cams[p.kit==='wide'?'tele':'wide'];
  const service=Math.sin(Math.PI*p.service),aim=p.aim*(1-service),portrait=p.portrait?1:0;
  cam.g.position.set(lerp(.045,.028,aim)+service*.048,
    lerp(.34,.737-.06*crouch,aim)-service*.09,
    lerp(-.283,-.161,aim)-service*.032);
  cam.g.rotation.set(p.pitch-torso.rotation.x+service*(p.serviceKind==='battery'?-.88:-.22),
    service*.44,portrait*Math.PI/2*(1-service)+p.roll*.23+service*.25,'YXZ');
  cam.g.scale.setScalar(1);cam.g.updateMatrix();
  spare.g.position.set(-.19,.062,.036);
  spare.g.rotation.set(-1.04,-.1,-.36+Math.sin(travel)*stride*.055);
  spare.g.scale.setScalar(.87);
  if(p.kit==='tele') cam.barrel.position.z=-.07*clamp((p.focal-85)/115,0,1);
  spare.flash.visible=false;
  cam.flash.visible=flashStrength>0;
  cam.flash.scale.set(.092*flashStrength,.083*flashStrength,.057*flashStrength);
  for(const arm of arms){
    const s=arm.side;
    arm.from.set(s*.199,.475,.006);
    if(s>0)arm.to.set(.072,-.012,.023);
    else arm.to.set(-.038,-.038,p.kit==='tele'?-.168:-.089);
    arm.to.applyMatrix4(cam.g.matrix);
    if(s<0 && service>.01){
      // The support hand follows the service door, then dips toward the wallet.
      midpoint.set(p.serviceKind==='battery'?.055:-.073,.196,-.249);
      const dip=Math.max(0,1-Math.abs(p.service-.50)/.23);
      midpoint.x-=dip*.216;midpoint.y-=dip*.13;
      arm.to.lerp(midpoint,service*.95);
    }
    if(s<0&&p.nudge>0){
      midpoint.set(-.16,.44,-.50);
      arm.to.lerp(midpoint,p.nudge);
    }
    poseLinks(arm,arm.from,arm.to,.268,.252);arm.end.quaternion.copy(cam.g.quaternion);
  }
}

/** A single fixed-duration track plus an endpoint preserves the first take at any render rate. */
export function buildReplay(scene){
  const model=buildPhotographer(scene);
  const frames=[], shutters=[];
  let last=null, gridIndex=0, previousShow=-1;
  const stamp=p=>p.t;
  function record(t,pose){
    if(!Number.isFinite(t)||!pose)return;
    t=clamp(t,0,takeLength);
    if(last&&t<last.t)return;
    const elapsed=last?t-last.t:0;
    const dx=last?pose.x-last.x:0,dz=last?pose.z-last.z:0;
    const current={t,footX:pose.footX??pose.x,footZ:pose.footZ??pose.z,x:pose.x,y:pose.y,z:pose.z,yaw:pose.yaw,pitch:pose.pitch,roll:pose.roll??0,
      nudge:clamp(pose.nudge??0,0,1),aim:clamp(pose.aim??0,0,1),kit:pose.kit==='wide'?'wide':'tele',portrait:Boolean(pose.portrait),
      focal:pose.focal??(pose.kit==='wide'?24:85),service:clamp(pose.service??0,0,1),serviceKind:pose.serviceKind??'card',
      distance:(last?.distance??0)+Math.hypot(dx,dz),vx:elapsed>0?dx/elapsed:0,vz:elapsed>0?dz/elapsed:0};
    while(gridIndex<=takeLength*samplesPerSecond && gridIndex/samplesPerSecond<=t+1e-8){
      const gridTime=gridIndex/samplesPerSecond;
      const saved=last?interpolate(last,current,gridTime):{...current};
      saved.t=gridTime;frames.push(saved);gridIndex++;
    }
    last=current;
  }
  function sample(t){
    if(!last)return null;
    const idx=Math.max(0,keyedAt(frames,t,stamp));
    return interpolate(frames[idx],frames[idx+1]??last,t);
  }
  function shot(t){
    // Bursts are capped at one exposure per 150 ms by gameplay.
    if(Number.isFinite(t)&&t>=0&&t<=takeLength&&shutters.length<256&&(!shutters.length||t>shutters.at(-1))) shutters.push(t);
  }
  function show(t,viewer){
    const p=sample(t);
    if(!p){model.root.visible=false;return false;}
    const idx=keyedAt(shutters,t,n=>n);
    const lastShot=idx<0?-Infinity:shutters[idx];
    const crossed=lastShot>previousShow&&lastShot<=t&&previousShow<=t;
    const age=t-lastShot;
    const flash=age<.11?Math.max(0,1-age/.11):crossed&&t-previousShow<.3?.48:0;
    articulate(model,p,flash);previousShow=t;
    model.root.userData.lastShutter=Number.isFinite(lastShot)?lastShot:null;
    model.root.visible=!viewer||Math.hypot(viewer.x-p.x,viewer.z-p.z)>.70;
    return crossed;
  }
  function hide(){model.root.visible=false;previousShow=-1;}
  function reset(){frames.length=shutters.length=0;last=null;gridIndex=0;hide();model.root.userData.lastShutter=null;}
  return {root:model.root,record,shot,sample,show,hide,reset};
}
