// Judge Dean LLC
import * as THREE from 'three';
import * as C from './vendor/cannon-es.js';

const FIXED = 1 / 120, SAMPLE = 1 / 12;
const SCENERY = 1, PROP = 2, MOVER = 4;
const UP = new C.Vec3(0, 1, 0);
const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

function shapeFor(shape) {
  if (shape.type === 'sphere') return new C.Sphere(shape.radius);
  if (shape.type === 'cylinder') return new C.Cylinder(shape.radius, shape.radius, shape.height, 12);
  return new C.Box(new C.Vec3(...shape.half));
}

// Nearby wall, floor and furniture shapes share a static body. The broad phase
// can discard entire estate blocks before testing individual pieces of scenery.
function estateBodies(scene, venue) {
  const groups = new Map();
  const ground = new C.Body({collisionFilterGroup:SCENERY, collisionFilterMask:PROP});
  ground.addShape(new C.Plane());
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  function add(x,y,z,shape,quat) {
    const cx = Math.floor(x / 12) * 12 + 6, cz = Math.floor(z / 12) * 12 + 6;
    const key = cx + ',' + cz;
    if (!groups.has(key)) groups.set(key,new C.Body({
      position:new C.Vec3(cx, 0, cz), collisionFilterGroup:SCENERY, collisionFilterMask:PROP
    }));
    groups.get(key).addShape(shape,new C.Vec3(x-cx,y,z-cz),quat);
  }
  const unit = new THREE.Vector3(), pos = new THREE.Vector3(), rot = new THREE.Quaternion();
  const matrix = new THREE.Matrix4();
  const solidCenters = new Set();
  const pointKey = (x,z) => Math.round(x*10) + ',' + Math.round(z*10);
  for (const proxy of venue.occluders || []) {
    proxy.updateWorldMatrix(true,false);
    proxy.matrixWorld.decompose(pos,rot,unit);
    const {width=1,height=1,depth=1} = proxy.geometry.parameters;
    const half = new C.Vec3(unit.x*width/2,unit.y*height/2,unit.z*depth/2);
    add(pos.x,pos.y,pos.z,new C.Box(half),new C.Quaternion(rot.x,rot.y,rot.z,rot.w));
    if (pos.y-half.y < 1.2) solidCenters.add(pointKey(pos.x,pos.z));
  }
  for (const {x,z,r} of venue.colliders || []) {
    if (!solidCenters.has(pointKey(x,z))) add(x,.5,z,new C.Cylinder(r,r,1,8));
  }
  // The venue draws rugs, platforms and the pier in batches. Use the same
  // floor elevations without turning individual tiles and inlays into bodies.
  scene.traverse(mesh => {
    if (!mesh.isInstancedMesh || mesh.geometry.type !== 'BoxGeometry') return;
    for (let i=0; i<mesh.count; i++) {
      mesh.getMatrixAt(i,matrix);
      matrix.premultiply(mesh.matrixWorld).decompose(pos,rot,unit);
      if (unit.x<1.6 || unit.z<1.6 || unit.y>.2 || unit.y<.008 || pos.y<0 || pos.y>.15) continue;
      if (Math.abs(rot.x)+Math.abs(rot.z)>.02) continue;
      const top = pos.y + unit.y/2;
      add(pos.x,top-.17,pos.z,new C.Box(new C.Vec3(unit.x/2,.17,unit.z/2)),
        new C.Quaternion(rot.x,rot.y,rot.z,rot.w));
    }
  });
  return [ground,...groups.values()];
}

function makeMover(shape,height) {
  const body = new C.Body({
    type:C.Body.KINEMATIC,shape,allowSleep:false,
    collisionFilterGroup:MOVER,collisionFilterMask:0
  });
  return {body,height,enabled:false};
}

function placeMover(slot,pose,fraction,validSegment) {
  const body = slot.body;
  if (!pose || pose.active === false) {
    body.collisionFilterMask=0;
    body.velocity.setZero();
    body.angularVelocity.setZero();
    slot.enabled=false;
    return;
  }
  const x0 = validSegment ? (pose.fromX ?? pose.x) : pose.x;
  const z0 = validSegment ? (pose.fromZ ?? pose.z) : pose.z;
  const a0 = validSegment ? (pose.fromYaw ?? pose.yaw ?? 0) : (pose.yaw ?? 0);
  if (!slot.enabled || !validSegment) {
    body.position.set(x0,slot.height,z0);
    body.quaternion.setFromAxisAngle(UP,a0);
    body.aabbNeedsUpdate=true;
    slot.yaw=a0;
  }
  const yaw = a0 + angleDelta(a0,pose.yaw ?? a0)*fraction;
  const x = x0+(pose.x-x0)*fraction, z = z0+(pose.z-z0)*fraction;
  body.velocity.set((x-body.position.x)/FIXED,0,(z-body.position.z)/FIXED);
  body.angularVelocity.set(0,angleDelta(slot.yaw,yaw)/FIXED,0);
  // Set exact previous yaw before integration to avoid accumulating drift.
  body.quaternion.setFromAxisAngle(UP,slot.yaw);
  body.collisionFilterMask=PROP;
  slot.enabled=true;
  slot.yaw=yaw;
}

export function createPropPhysics(scene,venue,fixtures,onImpact=()=>{}) {
  const statics=estateBodies(scene,venue);
  const foot=makeMover(new C.Cylinder(.25,.25,1.4,10),.71);
  const cart=makeMover(new C.Box(new C.Vec3(.69,.50,1.21)),.57);
  const echo=makeMover(new C.Cylinder(.25,.25,1.4,10),.71);
  const propMaterial=new C.Material(), moverMaterial=new C.Material();
  for (const slot of [foot,cart,echo]) slot.body.material=moverMaterial;
  const entries=[], hits=new Map(), tracks=[];
  const active=new Set();
  let world, carry=0, nextSound=0, lastRecord=-Infinity;
  const center=new THREE.Vector3();
  const handRay=new THREE.Raycaster(), wallRay=new THREE.Raycaster();
  const handOrigin=new THREE.Vector3(), handDirection=new THREE.Vector3(), intersections=[];
  const relative=new C.Vec3(), spin=new C.Vec3();

  function entryFor(spec,mass,owner=null) {
    const object=spec.object;
    object.updateWorldMatrix(true,true);
    const box=new THREE.Box3().setFromObject(object);
    // A bouquet can extend well above its ceramic base. Optical queries must
    // consider its entire visible silhouette including flower heads and stems.
    box.getCenter(center);
    const radius=box.isEmpty()?0:center.distanceTo(box.max)+center.distanceTo(object.position);
    const body=new C.Body({
      mass,material:propMaterial,shape:shapeFor(spec.shape),allowSleep:true,sleepTimeLimit:.4,sleepSpeedLimit:.22,
      linearDamping:.11,angularDamping:.26,collisionFilterGroup:PROP,collisionFilterMask:SCENERY|PROP|MOVER
    });
    const e={spec,object,body,owner,mass,radius:Math.max(radius,body.boundingRadius),
      start:object.position.clone(),rotation:object.quaternion.clone(),pieces:[],index:entries.length,quietUntil:0};
    entries.push(e);
    tracks.push([]);
    if (!owner) {
      body.addEventListener('collide',({contact})=>{
        const speed=contact.getImpactVelocityAlongNormal();
        if (speed>1.65 && speed>(hits.get(e) || 0)) hits.set(e,speed);
      });
    }
    return e;
  }
  for (const spec of fixtures) {
    const e=entryFor(spec,spec.mass ?? 2);
    for (const part of spec.fragments || []) {
      e.pieces.push(entryFor(part,part.mass ?? e.mass/spec.fragments.length,e));
    }
  }

  function syncObject(e) {
    e.object.position.copy(e.body.position);
    e.object.quaternion.copy(e.body.quaternion);
    e.object.updateMatrixWorld(true);
  }
  function activate(e) {
    active.add(e);
    e.body.updateInertiaWorld(true);
    world.addBody(e.body);
    e.body.wakeUp();
    e.body.timeLastSleepy=world.time;
    e.object.visible=true;
    syncObject(e);
  }
  function deactivate(e) {
    active.delete(e);
    world.removeBody(e.body);
    e.object.visible=false;
  }
  function reset() {
    if (world) for (const b of [...world.bodies]) world.removeBody(b);
    world=new C.World({gravity:new C.Vec3(0,-9.81,0),allowSleep:true});
    world.broadphase=new C.SAPBroadphase(world);
    world.broadphase.useBoundingBoxes=true;
    world.solver.iterations=10;
    world.defaultContactMaterial.friction=.49;
    world.defaultContactMaterial.restitution=.11;
    // A photographer or bumper has more give than masonry. When a chair
    // gets pinned in a corner, the wall constraint should win the squeeze.
    world.addContactMaterial(new C.ContactMaterial(propMaterial,moverMaterial,{
      friction:.36,restitution:.10,contactEquationStiffness:7000,contactEquationRelaxation:3
    }));
    for (const b of statics) world.addBody(b);
    for (const slot of [foot,cart,echo]) {
      slot.enabled=false;
      slot.body.collisionFilterMask=0;
      slot.body.position.setZero(); slot.body.quaternion.set(0,0,0,1); slot.body.aabbNeedsUpdate=true;
      slot.body.velocity.setZero();
      slot.body.angularVelocity.setZero();
      world.addBody(slot.body);
    }
    carry=0; nextSound=0; lastRecord=-Infinity;
    active.clear(); hits.clear();
    for (const e of entries) {
      const b=e.body;
      b.position.copy(e.start); b.quaternion.copy(e.rotation);
      b.velocity.setZero(); b.angularVelocity.setZero(); b.force.setZero(); b.torque.setZero();
      b.vlambda.setZero(); b.wlambda.setZero(); b.aabbNeedsUpdate=true;
      e.object.position.copy(e.start); e.object.quaternion.copy(e.rotation);
      e.quietUntil=0; e.object.visible=false;
      tracks[e.index].length=0;
      if (!e.owner) activate(e);
    }
  }

  function fracture(e) {
    const parent=e.body;
    deactivate(e);
    for (const [i,piece] of e.pieces.entries()) {
      const b=piece.body;
      relative.set(...piece.spec.offset);
      parent.quaternion.vmult(relative,relative);
      parent.position.vadd(relative,b.position);
      b.quaternion.copy(parent.quaternion);
      parent.angularVelocity.cross(relative,spin);
      parent.velocity.vadd(spin,b.velocity);
      // Particles get their parent point's velocity, with a small separating
      // impulse so the newly exposed broken faces become visible.
      const azimuth=(i+1)*2.39996;
      b.velocity.x+=Math.sin(azimuth)*.55;
      b.velocity.y+=.38+.11*(i%3);
      b.velocity.z+=Math.cos(azimuth)*.55;
      if (b.velocity.lengthSquared()>100) b.velocity.scale(10/b.velocity.length(),b.velocity);
      b.angularVelocity.set(parent.angularVelocity.x*.4+Math.cos(azimuth)*2,
        parent.angularVelocity.y*.4+Math.sin(azimuth)*2,parent.angularVelocity.z*.4+(i%2?1:-1)*1.7);
      b.aabbNeedsUpdate=true;
      activate(piece);
    }
  }

  let frameSound=null;
  function processHits() {
    for (const [e,speed] of hits) {
      if (!active.has(e)) continue;
      const broken=Boolean(e.pieces.length && speed>=e.spec.breakSpeed);
      const audible=world.time>=e.quietUntil && (broken || world.time>=nextSound);
      if (audible && (!frameSound || (broken && !frameSound.broken) ||
          (broken===frameSound.broken && speed>frameSound.strength))) {
        const {x,y,z}=e.body.position;
        frameSound={id:e.spec.id,kind:e.spec.kind,x,y,z,broken,strength:speed};
      }
      if (broken) fracture(e);
      e.quietUntil=world.time+.14;
    }
    hits.clear();
  }

  function step(dt,mover,echoMover) {
    if (!(dt>0)) return;
    dt=Math.min(dt,.15);
    const before=carry;
    carry+=dt;
    const count=Math.floor((carry+1e-10)/FIXED);
    carry=Math.max(0,carry-count*FIXED);
    const moving=pose=>pose && Math.hypot((pose.fromX ?? pose.x)-pose.x,(pose.fromZ ?? pose.z)-pose.z)<=dt*23+.45;
    const playerSegment=moving(mover), echoSegment=moving(echoMover);
    const cartPose=mover?.kind==='cart'?mover:mover?.parkedCart;
    frameSound=null;
    for (let i=0; i<count; i++) {
      const fraction=Math.min(1,((i+1)*FIXED-before)/dt);
      placeMover(foot,mover?.kind==='foot'?mover:null,fraction,playerSegment);
      placeMover(cart,cartPose,fraction,mover?.kind==='cart' && playerSegment);
      placeMover(echo,echoMover,fraction,echoSegment);
      world.step(FIXED);
      processHits();
    }
    for (const e of active) {
      const b=e.body, o=e.object;
      if (!o.position.equals(b.position) || o.quaternion.x!==b.quaternion.x || o.quaternion.y!==b.quaternion.y ||
          o.quaternion.z!==b.quaternion.z || o.quaternion.w!==b.quaternion.w) syncObject(e);
    }
    if (frameSound) {nextSound=world.time+.085; onImpact(frameSound);}
  }

  function intersect(e,raycaster) {
    const ray=raycaster.ray;
    center.copy(e.object.position);
    if (ray.distanceSqToPoint(center)>e.radius*e.radius ||
        (Number.isFinite(raycaster.far) && center.distanceToSquared(ray.origin)>(raycaster.far+e.radius)**2)) return null;
    intersections.length=0;
    raycaster.intersectObject(e.object,true,intersections);
    return intersections[0] || null;
  }
  function occludes(raycaster) {
    // During visual rewind, visibility and matrixWorld are restored from tape.
    for (const e of entries) if (e.object.visible && intersect(e,raycaster)) return true;
    return false;
  }
  function pushTarget(camera) {
    camera.getWorldPosition(handOrigin);
    camera.getWorldDirection(handDirection);
    handRay.far=2.45;
    let best=null,target=null;
    // A second chest-height contact models reaching below the sightline.
    for (const drop of [0,.48,.9]) {
      handRay.ray.origin.copy(handOrigin); handRay.ray.origin.y-=drop;
      handRay.ray.direction.copy(handDirection);
      for (const e of active) {
        const hit=intersect(e,handRay);
        if (hit && (!best || hit.distance<best.distance)) {best=hit;target=e;}
      }
      if (best) break;
    }
    if (!target) return false;
    wallRay.ray.origin.copy(handOrigin);
    wallRay.ray.direction.subVectors(best.point,handOrigin);
    wallRay.far=wallRay.ray.direction.length()-.025;
    wallRay.ray.direction.normalize();
    for (const proxy of venue.occluders || []) {
      intersections.length=0;
      wallRay.intersectObject(proxy,false,intersections);
      if (intersections.length) return false;
    }
    return {target,point:best.point};
  }
  function canPush(camera) { return Boolean(pushTarget(camera)); }
  function push(camera) {
    const hit=pushTarget(camera);
    if (!hit) return false;
    const {target,point}=hit;
    const b=target.body;
    // Apply at hand height, slightly above the centre, so an upright chair
    // pivots onto its feet and can topple. Downward aim still lifts loose props.
    const dv=Math.min(5.0,8.5/Math.sqrt(Math.max(1,b.mass)));
    const horizontal=Math.hypot(handDirection.x,handDirection.z);
    const x=horizontal>.04?handDirection.x/horizontal:0,z=horizontal>.04?handDirection.z/horizontal:0;
    const impulse=new C.Vec3(x*dv*b.mass,(.65+Math.max(0,handDirection.y))*b.mass,z*dv*b.mass);
    relative.set(point.x-b.position.x,Math.max(.08,Math.min(.33,point.y-b.position.y)),point.z-b.position.z);
    if (relative.lengthSquared()>.17) relative.scale(.41/relative.length(),relative);
    b.wakeUp();
    b.applyImpulse(impulse,relative);
    return true;
  }

  // Each prop owns a sparse track. Sleeping props occupy a single sample,
  // even when the take runs for the full 30 seconds.
  function record(t) {
    if (t<0 || t>30.1 || (t-lastRecord<SAMPLE-1e-6 && t<30)) return;
    for (const e of entries) {
      const track=tracks[e.index], last=track.at(-1), shown=active.has(e);
      if (last && last.shown===shown &&
          (!shown || (last.p.distanceToSquared(e.object.position)<1e-8 && 1-Math.abs(last.q.dot(e.object.quaternion))<1e-7))) continue;
      if (last && lastRecord-last.t>SAMPLE*.6) track.push({...last,t:lastRecord});
      track.push({t,shown,p:e.object.position.clone(),q:e.object.quaternion.clone()});
    }
    lastRecord=t;
  }
  function rewindTo(t) {
    for (const e of entries) {
      const track=tracks[e.index];
      if (!track.length) continue;
      let lo=0,hi=track.length-1;
      while (lo<hi) {
        const mid=Math.ceil((lo+hi)/2);
        if (track[mid].t<=t) lo=mid; else hi=mid-1;
      }
      const a=track[lo],b=track[lo+1];
      e.object.visible=a.shown;
      if (!a.shown) continue;
      if (b?.shown) {
        const f=THREE.MathUtils.clamp((t-a.t)/(b.t-a.t),0,1);
        e.object.position.lerpVectors(a.p,b.p,f);
        e.object.quaternion.slerpQuaternions(a.q,b.q,f);
      } else {
        e.object.position.copy(a.p); e.object.quaternion.copy(a.q);
      }
      e.object.updateMatrixWorld(true);
    }
  }
  reset();
  return {reset,step,push,canPush,occludes,record,rewindTo};
}
