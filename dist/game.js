// Judge Dean LLC
import * as THREE from 'three';
import { lenses, composeFrame } from './optics.js';

import { serviceEvents, serviceDuration } from './service.js';
import { buildChapelSolo } from './chapel-solo.js';
import { buildWeddingWeather, rainAt, underRoof } from './wedding-weather.js';
import { createWeddingSound, soundPerspective } from './wedding-sound.js';
import { STORM_DURATION, STORM_CALLS, stormDayTime } from './day-timeline.js';
import { playServiceCue } from './service-audio.js';
import { makeWeddingCover } from './keepsake.js';

import { buildReplay } from './replay.js';
import { TAKE_SECONDS, TOSS_RELEASE, TOSS_CATCH, tossCue } from './bouquet-event.js';
import { newTakePhotos, keepExposure, presentPair } from './take-photos.js';
import { DAY_EVENTS, DAY_DURATION, legacyDayTime, buildDayProps } from './wedding-day.js';
import { getDayDispatch, updateDayHud, renderDayAlbum, renderDayItinerary, resetDayUi } from './day-ui.js';

import { createCartDriving } from './cart-driving.js';
import { buildPhysicsProps } from './physics-props.js';
import { createPropPhysics } from './prop-physics.js';
import { createGolfCartModel } from './golf-cart-model.js';
import { updateCartHud } from './cart-ui.js';
import { buildEstateNavigation } from './estate-navigation.js';
import { updateEstateMap, hideEstateMap, renderEstateAtlas } from './estate-map-ui.js';

const $ = id => document.getElementById(id);
const world = $('world'), view = $('view'), panel = $('panel'), panelBody = $('panelBody');
const clamp = THREE.MathUtils.clamp;
const capacity = 36, duration = DAY_DURATION, batteryLife = 85;
const keepers = new Map();
const goalTitle = 'The full wedding day';
const propAssignments = new Set(['veil','rings','cake','bouquet','getaway']);
let renderer, scene, camera, sensor, rigScene, rigCamera, rig, venue, party, dayProps, navigation, liveTarget;
let mode='ready', currentPanel='', ready=false, remaining=duration, exposures=0, score=0;
const opensAtChapel=new URLSearchParams(location.search).get('assignment')==='storm';
let chapel,weather,soundscape;
let assignment=opensAtChapel?'storm':'day', take=1, rewindTime=0, resumeMode='play', replay;
const rewindLength=2.4;
let rolls=[newTakePhotos(),newTakePhotos()];
const isToss=()=>assignment==='toss';
const isStorm=()=>assignment==='storm';
const calls=()=>isStorm()?STORM_CALLS:DAY_EVENTS;
const runLength=()=>isToss()?TAKE_SECONDS:isStorm()?STORM_DURATION:duration;
remaining=runLength();
const soloCall=DAY_EVENTS.find(e=>e.id==='solo'),cakeCall=DAY_EVENTS.find(e=>e.id==='cake');
const takeTime=()=>TAKE_SECONDS-remaining;
const running=()=>mode==='play'||mode==='rewind';
const freshBody = () => ({card:capacity,battery:batteryLife,serial:{card:1,battery:1}});
const supplies={wide:freshBody(),tele:freshBody()};
let kit='tele', portrait=false, changingKit=null, touchCrouched=false;
const zoomStops=[85,105,135,170,200];
let zoomIndex=0, teleFocal=85, wheelDistance=0, lastWheelAt=0;
const focalLength=()=>kit==='tele'?teleFocal:lenses.wide.focal;
const kitName=(body,focal)=>Math.round(focal)+' mm · '+(body==='tele'?'Telephoto':'Wide angle');
let coverChoice=null, coverPreview=null;
let opticalYaw=0, opticalPitch=0, lean=0, step=0, strideDistance=.5, footSide=-1;
const velocity=new THREE.Vector2(), guide=$('captureGuide'), reticle=view.querySelector('.reticle');
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const isCrouched=()=>touchCrouched||keys.has('KeyC');
let simTime=0, lastFrame=0, liveDue=0, nextShot=0, recoil=0, reload=null, messageUntil=0, shadowDue=0;
let yaw=0, pitch=0, lookTarget=0, aimed=false, held=false, keyboardHeld=false, queuedShot=false, movement=0;
let drag=null, mouseSample=null, edgeX=0, edgeY=0, lastPointerType='', ownedLock=false;
let redraw=true;
let blackoutUntil=0, lastExposure=-Infinity;
let muted=false, audio=null, panelOpener=null;
const keys=new Set(), moments=new Set(), photographed=new Set(), samples=[], highlights=new Map();
const stick={x:0,y:0,id:null}, player = new THREE.Vector3(0,1.65,6.2);
const projected = new THREE.Vector3(), head = new THREE.Vector3(), ray = new THREE.Raycaster(), rayDirection=new THREE.Vector3();
const echoMarker=$('echoMarker'), echoPoint=new THREE.Vector3(), echoDirection=new THREE.Vector3();
const echoRay=new THREE.Raycaster();
let checkEchoAt=0,echoClear=false;
const photoCanvas=document.createElement('canvas'), photoContext=photoCanvas.getContext('2d');
const coarse=()=>matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints>0;
const elapsed=()=>runLength()-remaining;
const weddingTime=()=>isStorm()?stormDayTime(elapsed()):elapsed();
let dayHudDue=0, lastPin=null;
let propPhysics, lastPropSound=-Infinity, nextNudge=0, lastNudge=-Infinity, echoNudgeIndex=0;
let nextReachCheck=0;
const takeSteps=[];let echoStepIndex=0;
const takeNudges=[], echoHand=new THREE.PerspectiveCamera();
let cart, cartModel, motor, driverLook=0, lastDriverLook=0, touchBrake=false;
const cartCenter=new THREE.Vector3();
const driving=()=>Boolean(!isToss()&&cart?.state.driving);
const fmt=(n,width)=>String(n).padStart(width,'0');
function icon(name){return '<svg aria-hidden="true"><use href="#'+name+'"/></svg>';}
function beep(hz,seconds,gain=.035,type='sine',end=hz){
  if(!audio||muted||audio.state!=='running')return;
  const at=audio.currentTime, osc=audio.createOscillator(), volume=audio.createGain();
  osc.type=type;osc.frequency.setValueAtTime(hz,at);osc.frequency.exponentialRampToValueAtTime(end,at+seconds);
  volume.gain.setValueAtTime(gain,at);volume.gain.exponentialRampToValueAtTime(.0001,at+seconds);
  osc.connect(volume);volume.connect(audio.destination);osc.start(at);osc.stop(at+seconds);
}
function propImpact({kind,x,y,z,strength,broken}){
  if(mode!=='play')return;
  const distance=Math.hypot(player.x-x,player.y-y,player.z-z);
  if(distance>23||!broken&&simTime-lastPropSound<.09)return;
  lastPropSound=simTime;
  const gain=clamp(strength*.008,.008,.085)/(1+.17*distance);
  if(kind==='ceramic'||kind==='glass'){
    const pitch=kind==='glass'?2140:810;
    beep(pitch,broken?.17:.065,gain,'triangle',pitch*.64);
    if(broken){
      beep(pitch*1.49,.23,gain*.53,'sine',pitch*1.11);
      beep(pitch*.57,.09,gain*.75,'triangle',pitch*.21);
    }
  }else{
    beep(kind==='chair'?155:115,.12,gain,'triangle',40);
  }
}
function handReach(){
  const age=simTime-lastNudge;
  return age<.36?Math.sin(Math.PI*THREE.MathUtils.smoothstep(age,0,.36)):0;
}
function nudgeProp(){
  if(mode!=='play'||driving()||reload||changingKit||simTime<nextNudge)return;
  nextNudge=simTime+.35;
  if(!propPhysics.push(camera)){announce('Move closer and look at a loose prop',1.0);return;}
  lastNudge=simTime;
  if(isToss()&&take===1)takeNudges.push({t:takeTime(),position:camera.position.clone(),rotation:camera.quaternion.clone()});
}
function enableAudio(){
  try{
    if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();soundscape=createWeddingSound(audio);}
    if(audio.state==='suspended')audio.resume().catch(()=>{});
  }catch{}
}
function motorSound(){
  const enabled=driving()&&mode==='play'&&!muted&&audio?.state==='running';
  if(!enabled){
    if(motor){
      const {osc,volume}=motor;
      volume.gain.setTargetAtTime(.0001,audio.currentTime,.025);
      osc.stop(audio.currentTime+.12);motor=null;
    }
    return;
  }
  if(!motor){
    const osc=audio.createOscillator(), volume=audio.createGain();
    osc.type='triangle';volume.gain.value=0;
    osc.connect(volume);volume.connect(audio.destination);
    osc.onended=()=>{osc.disconnect();volume.disconnect();};osc.start();
    motor={osc,volume};
  }
  const pace=Math.min(1,Math.abs(cart.state.speed)/13);
  motor.osc.frequency.setTargetAtTime(57+pace*149,audio.currentTime,.085);
  motor.volume.gain.setTargetAtTime(.002+pace*.023,audio.currentTime,.075);
}
function shutterSound(){if(!muted&&audio?.state==='running')soundscape?.shutter(kit,{inside:underRoof(player.x,player.z)});}
function announce(msg,seconds=1.3){$('toast').textContent=msg;messageUntil=simTime+seconds;}
function sync(){
  const seconds=Math.ceil(remaining);
  $('timer').textContent=fmt(Math.floor(seconds/60),2)+':'+fmt(seconds%60,2);
  $('score').textContent=fmt(score,6);$('frames').textContent=fmt(exposures,4);
  const {card,battery}=supplies[kit];
  $('kitLabel').textContent=kitName(kit,focalLength());
  updateZoomControls();
  view.classList.toggle('servicing',Boolean(reload));
  $('formatLabel').textContent=portrait?'Portrait':'Landscape';
  $('stanceLabel').textContent=isCrouched()?'Crouched':'Standing';
  $('touchCrouch').setAttribute('aria-pressed',String(isCrouched()));
  $('touchFormat').setAttribute('aria-pressed',String(portrait));
  view.classList.toggle('playing',mode==='play');
  if(mode!=='play')echoMarker.hidden=true;
  if(mode!=='play'||driving())$('nudgeHint').hidden=true;
  $('cardCount').textContent=card??'—';$('cardBar').style.width=(card/capacity*100)+'%';
  $('energy').textContent=battery===null?'—':Math.ceil(battery/batteryLife*100);$('batteryBar').style.width=(battery/batteryLife*100)+'%';
  $('start').hidden=mode!=='ready'&&mode!=='finished';
  const fullLabel='Play full wedding · '+(duration/60)+' min', stormLabel='Storm wedding · '+STORM_DURATION+' sec';
  $('start').lastElementChild.textContent=mode==='finished'?'View results':isStorm()?stormLabel:fullLabel;
  $('stormStart').hidden=mode!=='ready';
  $('stormStart').textContent=isStorm()?fullLabel:stormLabel;
  $('classicStart').hidden=mode!=='ready'&&mode!=='finished';
  $('classicStart').textContent=mode==='finished'?'Choose assignment':'Bouquet rewind · 2 takes';
  $('moment').hidden=mode!=='play'||!isToss();
  if(isToss())$('momentText').textContent=tossCue(takeTime());
  $('classicGoals').hidden=true;$('takeBrief').hidden=false;
  $('briefType').textContent=isToss()?'TAKE '+take+' OF 2':'WEDDING DAY';
  $('briefTitle').textContent=isToss()?'The bouquet toss':isStorm()?'The storm wedding':goalTitle;
  $('takeNumber').textContent=fmt(isToss()?take:1,2);
  $('takeBrief').textContent=isToss()
    ? take===1?'Find a first angle. The bride throws with 9 seconds left.':'Choose another angle. Your first self is shooting alongside you.'
    :isStorm()?'Shoot Slash’s chapel solo, then follow the pin to the reception before the cake hits the floor.'
    :DAY_EVENTS.length+' photo calls. Your golf cart is outside the bridal suite’s east door. Follow the orange pin.';
  if(!isToss()&&mode==='play')refreshDayHud();
  else {
    $('dayHud').hidden=true;
    if(!isToss()&&mode==='ready'&&ready)updateEstateMap(mapState());else hideEstateMap();
  }
  view.classList.toggle('rewinding',mode==='rewind');
  $('rewindNotice').hidden=mode!=='rewind';
  $('stateLabel').textContent=({ready:'STANDBY',play:'ON ASSIGNMENT',rewind:'REWINDING',paused:'PAUSED',finished:'COMPLETE'})[mode];
  $('touchControls').hidden=mode!=='play'||!coarse();
  refreshCartHud();motorSound();
  if(mode!=='play'||muted)soundscape?.stop();
}
function resetMouseLook(){
  mouseSample=null;edgeX=edgeY=0;
}
function clearInput(){
  resetMouseLook();
  touchBrake=false;keys.clear();held=false;aimed=false;keyboardHeld=false;queuedShot=false;drag=null;stick.x=stick.y=0;stick.id=null;
  $('pad').firstElementChild.style.transform='';$('touchAim').setAttribute('aria-pressed','false');
}
async function lockLook(){
  const mouseInput=lastPointerType?lastPointerType==='mouse':matchMedia('(any-pointer:fine)').matches;
  if(!mouseInput||!world.requestPointerLock||document.pointerLockElement===world)return;
  try{await world.requestPointerLock();}catch{/* Canvas hover handles mouse-look when capture is unavailable. */}
}
function startPlay(){
  if(!ready)return;
  if(panel.open)panel.close();
  currentPanel='';
  if(mode==='finished')resetRun(assignment);
  const resuming=mode==='paused';
  if(mode==='ready'){
    resetCameraForTake();
    if(isToss())replay.record(0,photographerPose(0));
  }
  mode=resuming?resumeMode:'play';
  lastFrame=performance.now();enableAudio();world.focus({preventScroll:true});lockLook();sync();
}
function resetCameraForTake(){
  cart.reset();if(isStorm())Object.assign(cart.state,{x:-21.7,z:29.1,yaw:-Math.PI/2});
  blackoutUntil=0;lastExposure=-Infinity;
  soundscape?.stop();driverLook=lastDriverLook=0;
  propPhysics.reset();if(isToss()&&take===1)propPhysics.record(0);
  nextReachCheck=0;nextNudge=0;lastNudge=lastPropSound=-Infinity;echoNudgeIndex=0;
  echoStepIndex=0;
  if(!isToss()||take===1){takeNudges.length=0;takeSteps.length=0;}
  supplies.tele=freshBody();supplies.wide=freshBody();
  zoomIndex=0;teleFocal=85;wheelDistance=lastWheelAt=0;
  kit=isToss()&&take===2?'tele':'wide';portrait=false;changingKit=null;
  touchCrouched=false;strideDistance=.5;footSide=-1;lean=step=0;velocity.set(0,0);movement=0;
  const fromHall=isToss()&&take===2;
  if(isToss())player.set(fromHall?19.75:0,1.65,fromHall?1.65:6.2);
  else if(isStorm())player.set(-24.7,1.65,29.1);
  else player.set(-73.3,1.65,80.1);
  yaw=opticalYaw=isStorm()?Math.atan2(player.x-soloCall.x,player.z-soloCall.z):fromHall?1.45:0;
  pitch=opticalPitch=isStorm()?-.07:isToss()?.045:-.18;
  lookTarget=0;simTime=0;liveDue=shadowDue=nextShot=messageUntil=recoil=0;reload=null;
  $('toast').textContent='';clearInput();camera.position.copy(player);camera.rotation.set(pitch,yaw,0,'YXZ');
  camera.fov=59;camera.updateProjectionMatrix();
}
function resetRun(kind='day'){
  assignment=kind;take=1;rewindTime=0;resumeMode='play';remaining=runLength();
  exposures=score=0;coverChoice=coverPreview=null;
  moments.clear();photographed.clear();samples.length=0;highlights.clear();keepers.clear();resetDayUi();hideEstateMap();lastPin=null;dayHudDue=0;
  rolls=[newTakePhotos(),newTakePhotos()];replay.reset();
  resetCameraForTake();mode='ready';redraw=true;
}
function photographerPose(progress){
  return {x:camera.position.x,y:camera.position.y,z:camera.position.z,footX:player.x,footZ:player.z,yaw,pitch,roll:camera.rotation.z,
    nudge:handReach(),aim:lookTarget,kit,portrait,focal:focalLength(),service:progress,serviceKind:reload?.kind??'card'};
}
function pause(){
  if(!running())return;
  resumeMode=mode;mode='paused';clearInput();if(document.pointerLockElement===world)document.exitPointerLock();sync();
}
function beginRewind(){
  clearInput();mode='rewind';rewindTime=0;shadowDue=0;beep(675,.48,.035,'triangle',125);sync();
}
function beginSecondTake(){
  take=2;remaining=TAKE_SECONDS;checkEchoAt=0;echoClear=false;resetCameraForTake();
  mode='play';sync();announce('Take two · Reception hall doors',2.3);
}
function markFirstPhotographer(t){
  echoMarker.hidden=true;
  if(!isToss()||take!==2||mode!=='play'||!replay.root.visible||lookTarget>.75)return;
  const pose=replay.sample(t);
  echoPoint.set(pose.x,pose.y+.26,pose.z);
  if(t>=checkEchoAt){
    const far=echoPoint.distanceTo(camera.position)-.25;
    echoRay.set(camera.position,echoDirection.subVectors(echoPoint,camera.position).normalize());
    echoRay.far=far;
    echoClear=!venue.occluders.some(mesh=>echoRay.intersectObject(mesh,false).length)&&!propPhysics.occludes(echoRay);
    checkEchoAt=t+.15;
  }
  if(!echoClear)return;
  echoPoint.project(camera);
  if(echoPoint.z<=0||echoPoint.z>=1||Math.abs(echoPoint.x)>.90||Math.abs(echoPoint.y)>.83)return;
  echoMarker.style.left=((1+echoPoint.x)*50)+'%';
  echoMarker.style.top=((1-echoPoint.y)*50)+'%';
  echoMarker.hidden=false;
}
function rewindFrame(dt){
  rewindTime=clamp(rewindTime+dt,0,rewindLength);
  const fraction=rewindTime/rewindLength;
  const t=TAKE_SECONDS*(1-THREE.MathUtils.smoothstep(fraction,0,1));
  const pose=replay.sample(t);replay.hide();
  if(pose&&!motionPreference.matches){
    camera.position.set(pose.x,pose.y,pose.z);
    camera.rotation.set(pose.pitch,pose.yaw,pose.roll,'YXZ');
  }
  camera.fov=65;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  propPhysics.rewindTo(t);
  party.update(t,'bouquetTake',camera.position,t);venue.update(t,false,camera.position);
  animateBreeze(t);
  if(rewindTime>=shadowDue){renderer.shadowMap.needsUpdate=true;shadowDue=rewindTime+.16;}
  renderer.clear();renderer.render(scene,camera);
  $('timer').textContent='00:'+fmt(Math.round(TAKE_SECONDS-t),2);
  if(fraction===1)beginSecondTake();
}
function chooseAssignment(){
  if(panel.open)panel.close();
  resetRun('day');sync();
}
function endRun(){
  pause();mode='finished';beep(650,.28,.045,'sine',950);sync();showPanel('results');
}
function changeCamera(next=kit==='tele'?'wide':'tele'){
  if(mode!=='play'||driving()||next===kit||changingKit||reload)return;
  changingKit={next,start:simTime,length:.52};
  beep(210,.065,.025,'triangle',100);
}
function rotateCamera(){
  if(mode!=='play'||driving()||changingKit||reload)return;
  portrait=!portrait;liveDue=0;sync();
}
function updateZoomControls(){
  $('zoomControls').hidden=mode!=='play'||driving()||kit!=='tele'||!coarse()||Boolean(reload);
  $('zoomLess').disabled=zoomIndex===0;
  $('zoomMore').disabled=zoomIndex===zoomStops.length-1;
}
function zoomBy(direction){
  if(mode!=='play'||driving()||kit!=='tele'||reload||changingKit)return;
  zoomIndex=clamp(zoomIndex+direction,0,zoomStops.length-1);
  updateZoomControls();
}
function setServiceLabel(text){
  $('serviceLabel').textContent=text;
}
function swap(kind){
  if(mode!=='play'||driving()||reload||changingKit)return;
  reload={kind,kit,serial:supplies[kit].serial[kind],start:simTime,length:serviceDuration[kind],nextEvent:0};
  setServiceLabel(kind==='card'?'Opening card door':'Opening battery bay');
  $('serviceFill').style.transform='scaleX(0)';
  $('toast').textContent='';messageUntil=0;
  sync();
}
function advanceSwap(){
  if(!reload)return 0;
  const progress=clamp((simTime-reload.start)/reload.length,0,1);
  const {kind}=reload;
  let lastCue=null;
  // Process every physical change even if a slow frame crosses two cue marks.
  while(reload.nextEvent<serviceEvents.length&&serviceEvents[reload.nextEvent][1]<=progress){
    const [event]=serviceEvents[reload.nextEvent++];
    lastCue=event;
    if(event==='out'){
      supplies[reload.kit][kind]=null;
      setServiceLabel(kind==='card'?'Stowing SD card':'Stowing battery');
      sync();
    }else if(event==='spare'){
      setServiceLabel(kind==='card'?'Loading fresh card':'Loading fresh pack');
    }else if(event==='seated'){
      supplies[reload.kit][kind]=kind==='card'?capacity:batteryLife;
      supplies[reload.kit].serial[kind]=reload.serial+1;
      setServiceLabel('Closing door');
      sync();
    }else if(event==='latched'){
      setServiceLabel(kind==='card'?'Card locked':'Battery locked');
    }
  }
  if(lastCue&&!muted&&audio?.state==='running')playServiceCue(audio,kind,lastCue);
  $('serviceFill').style.transform='scaleX('+progress+')';
  if(progress===1){reload=null;sync();return 0;}
  return progress;
}
function framed(pos,margin=.72){
  projected.copy(pos).project(sensor);
  return projected.z>0 && projected.z<1 && Math.abs(projected.x)<margin && Math.abs(projected.y)<margin;
}
function visibleSubject(s){
  // Cast only near the body under consideration, and stop just short of its surface.
  // Scene furniture (chairs, planters, walls) and other guests can block a photo.
  rayDirection.copy(head).sub(sensor.position);const range=rayDirection.length();
  ray.set(sensor.position,rayDirection.normalize());ray.near=.05;ray.far=Math.max(.05,range-.38);
  for(const object of venue.occluders||[]){if(ray.intersectObject(object,false).length)return false;}
  if(propPhysics.occludes(ray))return false;
  if(!isToss()&&cartModel.root.visible){
    cartCenter.set(cart.state.x,1,cart.state.z);
    if(ray.ray.distanceSqToPoint(cartCenter)<3.5&&cartModel.occluders.some(mesh=>ray.intersectObject(mesh,false).length))return false;
  }
  if(!isToss()&&party.dayOccluders.some(o=>{
    if(!o.visible)return false;
    o.updateWorldMatrix(true,false);
    return ray.intersectObject(o,false).length>0;
  }))return false;
  for(const other of party.subjects){
    if(other===s||!other.object.visible)continue;
    const p=other.object.position, u=(p.x-camera.position.x)*rayDirection.x+(p.z-camera.position.z)*rayDirection.z;
    if(u<.1||u>range-.35)continue;
    const h=camera.position.y+rayDirection.y*u;
    if(h>.25 && h<(other.seated?1.25:1.72) && Math.hypot(camera.position.x+rayDirection.x*u-p.x,camera.position.z+rayDirection.z*u-p.z)<.22)return false;
  }
  return true;
}
function detect(){
  const seen=[];
  for(const s of party.subjects){
    if(!s.object.visible)continue;
    s.head.getWorldPosition(head);
    if(head.distanceTo(sensor.position)>32||!framed(head,.93)||!visibleSubject(s))continue;
    seen.push(s);
  }
  if(!isToss()&&chapel.subject.object.visible){
    const soloist=chapel.subject;soloist.head.getWorldPosition(head);
    if(head.distanceTo(sensor.position)<=32&&framed(head,.93)&&visibleSubject(soloist))seen.push(soloist);
  }
  let airborne=false;
  if(isToss()&&party.bouquet?.parent===scene&&party.bouquet.visible){
    party.bouquet.getWorldPosition(head);airborne=framed(head,.83)&&visibleSubject(null);
  }
  return {seen,hit:airborne};
}
// Pay for the best photograph on each page. Another shutter press can improve
// a keeper, but it cannot earn the same commission twice.
function gradeDayShot(event,seen,t){
  if(t<event.start||t>event.end)return 0;
  const cast=party.daySubjects(event.id);
  let recognized=0,newlyweds=0,bestFraming=0;
  function composition(pos,size=1.55){
    const range=Math.max(.1,sensor.position.distanceTo(pos));
    const heightOnFilm=size/(2*range*Math.tan(THREE.MathUtils.degToRad(sensor.fov/2)));
    if(heightOnFilm<.052)return 0;
    projected.copy(pos).project(sensor);
    const placement=1-Math.min(1,Math.hypot(projected.x,projected.y+.08)/1.25);
    return .6*placement+.4*clamp(heightOnFilm/.44,0,1);
  }
  for(const person of cast){
    if(!seen.includes(person))continue;
    person.head.getWorldPosition(head);
    const framing=composition(head);
    if(framing>0){
      recognized++;
      if(person.kind==='couple')newlyweds++;
      bestFraming=Math.max(bestFraming,framing);
    }
  }
  const minPeople=event.minPeople??(['kiss','portrait'].includes(event.id)?2:event.id==='getaway'?1:0);
  if(recognized<minPeople||(event.requireCouple&&newlyweds<2))return 0;
  const props=[...dayProps.targets(event.id)];
  if(event.id==='bouquet'&&party.bouquet.visible)props.push(party.bouquet);
  let propFraming=0;
  for(const prop of props){
    prop.getWorldPosition(head);
    if(framed(head,.93)&&visibleSubject(null))propFraming=Math.max(propFraming,composition(head,2*(prop.userData.radius??.3)));
  }
  if((propAssignments.has(event.id)||event.propRequired)&&propFraming<=0)return 0;
  const framing=propFraming>0?.75*propFraming+.25*Math.max(propFraming,bestFraming):bestFraming;
  if(framing<=0)return 0;
  const half=t<=event.peak?event.peak-event.start:event.end-event.peak;
  const timing=clamp(1-Math.abs(t-event.peak)/half,0,1);
  const quality=26+48*timing+26*framing;
  if(event.id==='cake'){
    const diver=dayProps.diveTarget;
    diver.getWorldPosition(head);
    const catchesDive=diver.visible&&framed(head,.95)&&visibleSubject(null);
    return Math.round(quality*(catchesDive?1:.86));
  }
  return Math.round(quality);
}
function expose(){
  if(mode!=='play'||driving()||reload||changingKit||simTime<nextShot)return;
  const body=supplies[kit], {card,battery}=body;
  nextShot=simTime+.15;
  if(!card||!battery){if(simTime>=messageUntil){announce(!card?'Card full · R to swap':'Battery empty · B to swap');beep(140,.09,.04,'triangle');}return;}
  const {seen,hit:airborne}=detect();
  let hit=airborne, label=seen[0]?.name??'Venue detail',points=0;
  let grades=[];
  if(isToss()){
    const fresh=seen.filter(s=>!photographed.has(s.name));
    seen.forEach(s=>photographed.add(s.name));
    points=1+(seen.length?3:0)+fresh.length*6+(airborne?5:0)+(airborne&&!moments.has('bouquet')?50:0);
    if(airborne){label='Bouquet toss';moments.add('bouquet');}
  }else{
    const t=elapsed();
    grades=calls().map(event=>({event,quality:gradeDayShot(event,seen,t)})).filter(g=>g.quality>0);
    hit=grades.length>0;
    if(hit)label=grades.map(g=>g.event.title).join(' + ');
    for(const {event,quality} of grades)points+=Math.max(0,quality-(keepers.get(event.id)?.quality??0));
  }
  const burst=simTime-lastExposure<.24;
  lastExposure=simTime;
  blackoutUntil=simTime+(kit==='tele'?.054:.033);
  guide.style.setProperty('--shutter-opacity',burst?'.27':'.81');
  score+=points;body.card--;body.battery--;exposures++;recoil=1;shutterSound();
  const item=makeExposure({id:exposures,seen,hit,label,points,auto:false});
  if(isToss()){
    keepExposure(rolls[take-1],item);
    if(take===1)replay.shot(item.time);
    if(airborne&&!highlights.has('bouquet'))highlights.set('bouquet',item);
    if(simTime>=messageUntil)announce(label+'  +'+points,.5);
  }else{
    let newPage=false;
    for(const {event,quality} of grades){
      const previous=keepers.get(event.id);
      if(!previous)newPage=true;
      if(!previous||quality>previous.quality)keepers.set(event.id,{...item,quality,label:event.title});
    }
    if(newPage){
      const best=grades.reduce((a,b)=>a.quality>=b.quality?a:b);
      const untilPeak=Math.round(best.event.peak-item.time);
      announce('Filed '+best.quality+'/100 · '+label+(untilPeak>2?' · Peak in '+untilPeak+'s':''),2.1);
      beep(910,.13,.03,'sine',1280);
    }
    else if(points)announce('Better take · '+label+'  +'+points,.85);
    else if(simTime>=messageUntil)announce(hit?'Keeper already on file':'Contact sheet · '+label,.48);
  }
  samples.push(item);if(samples.length>24)samples.shift();
  sync();
}
function makeExposure({id,seen,hit,label,points,auto}){
  // Render through the lens on the same output pipeline as the main view.
  // The canvas copy restores the sensor aspect before the body-camera pass.
  const width=portrait?640:960, height=portrait?960:640;
  if(photoCanvas.width!==width||photoCanvas.height!==height){photoCanvas.width=width;photoCanvas.height=height;}
  renderer.clear();renderer.render(scene,sensor);
  photoContext.drawImage(world,0,0,width,height);
  const coupleInFrame=seen.filter(subject=>subject.kind==='couple').length===2;
  return {id,coupleInFrame,url:photoCanvas.toDataURL('image/jpeg',.85),label,points,kit,portrait,
    focal:Math.round(focalLength()),take:isToss()?take:0,time:isToss()?takeTime():elapsed(),hit,auto};
}
function takeSafetyFrame(){
  const roll=rolls[take-1];
  if(roll.best||roll.proof||takeTime()<(TOSS_RELEASE+TOSS_CATCH)/2||reload||changingKit)return;
  if(!supplies[kit].card||!supplies[kit].battery)return;
  const {seen,hit}=detect();
  roll.proof=makeExposure({id:'proof-'+take,seen,hit,label:'Automatic safety frame',points:0,auto:true});
}
function albumItems(){return [...new Map([...samples,...highlights.values(),...keepers.values(),...(coverChoice?[coverChoice]:[])].map(x=>[x.id,x])).values()].sort((a,b)=>b.id-a.id);}
function blocked(x,z){
  return (!isToss()&&!driving()&&cart.blocksFoot(x,z))||venue.blocks(x,z)||venue.colliders.some(c=>Math.hypot(c.x-x,c.z-z)<c.r+.23)
    ||party.subjects.some(s=>{
      if(!s.object.visible)return false;
      const d=Math.hypot(s.object.position.x-x,s.object.position.z-z);
      return d<.42&&d<Math.hypot(s.object.position.x-player.x,s.object.position.z-player.z);
    });
}
function refreshCartHud(){
  const active=ready&&!isToss()&&mode==='play';
  view.classList.toggle('driving',driving());
  updateCartHud({active,driving:driving(),near:active&&cart.near(player),speed:cart?.state.speed??0,
    distance:cart?Math.hypot(player.x-cart.state.x,player.z-cart.state.z):0});
}
function routeToEvent(event){
  if(!event)return [];
  return driving()?cart.parkingRoute(event):navigation.route(player,event.approach??event);
}
function mapState(){
  const t=elapsed(), dispatch=getDayDispatch(t,calls(),keepers);
  const vehicle=isToss()?null:{...cart.state,parkAt:driving()&&dispatch.target?cart.parkingGoal(dispatch.target):null};
  return {player,yaw:driving()?cart.state.yaw:yaw,t,weddingTime:weddingTime(),events:calls(),keepers,...dispatch,cart:vehicle,path:routeToEvent(dispatch.target)};
}
function refreshDayHud(){
  const state=mapState();
  const routes=new Map([[state.target,state.path]]);
  function route(event){
    if(!routes.has(event))routes.set(event,routeToEvent(event));
    return routes.get(event);
  }
  function distance(event){
    const path=route(event);
    if(!path.length)return null;
    return path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-path[i].x,p.z-path[i].z),0);
  }
  function bearing(event){
    const path=route(event);
    if(!path.length)return 'See estate plan';
    const end=path[path.length-1];
    if(driving()&&Math.hypot(cart.state.x-end.x,cart.state.z-end.z)<3)return 'Park and hop out';
    const aim=path.slice(1).find(p=>Math.hypot(p.x-player.x,p.z-player.z)>1.25)??end;
    const dx=aim.x-player.x,dz=aim.z-player.z;
    const turn=Math.atan2(dx*Math.cos(state.yaw)-dz*Math.sin(state.yaw),-dx*Math.sin(state.yaw)-dz*Math.cos(state.yaw));
    const choices=['Ahead','Front right','Right','Back right','Behind','Back left','Left','Front left'];
    return choices[(Math.round(turn/(Math.PI/4))+8)%8];
  }
  updateDayHud({...state,distance,bearing});
  updateEstateMap(state);
  const next=state.target?.id??null;
  if(next!==lastPin){if(next)beep(1120,.13,.025,'sine',1650);lastPin=next;}
}
function movePlayer(dt){
  let forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)-stick.y;
  let side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+stick.x;
  const mag=Math.hypot(forward,side);if(mag>1){forward/=mag;side/=mag;}
  const crouched=isCrouched(),sprinting=keys.has('ShiftLeft')||keys.has('ShiftRight')||Math.hypot(stick.x,stick.y)>.9;
  const speed=crouched?1.35:aimed?1.85:sprinting?5.0:2.9;
  const targetX=(Math.cos(yaw)*side-Math.sin(yaw)*forward)*speed;
  const targetZ=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed;
  velocity.x=THREE.MathUtils.damp(velocity.x,targetX,mag>.05?10:16,dt);
  velocity.y=THREE.MathUtils.damp(velocity.y,targetZ,mag>.05?10:16,dt);
  const bounds=venue.bounds;
  const x=clamp(player.x+velocity.x*dt,bounds.minX,bounds.maxX), z=clamp(player.z+velocity.y*dt,bounds.minZ,bounds.maxZ);
  const lastX=player.x,lastZ=player.z;
  if(!blocked(x,player.z))player.x=x;
  if(!blocked(player.x,z))player.z=z;
  const distance=Math.hypot(player.x-lastX,player.z-lastZ);
  const sprint=dt>0&&distance/dt>3.6;
  const strideLength=crouched?.82:sprint?1.65:1.27;
  strideDistance+=distance;
  if(strideDistance>=strideLength&&distance>.002){
    strideDistance%=strideLength;
    const x=player.x+Math.cos(yaw)*footSide*.095,z=player.z-Math.sin(yaw)*footSide*.095;
    const surface=venue.footingAt(x,z),inside=underRoof(x,z);
    const stride={surface:surface==='carpet'?'wood':surface,soft:surface==='carpet',inside,crouched,sprint,
      wet:inside||isToss()?0:rainAt(weddingTime()),side:footSide};
    if(!muted&&audio?.state==='running')soundscape?.footstep(stride);
    if(isToss()&&take===1)takeSteps.push({t:takeTime(),x,z,stride});
    footSide=-footSide;
  }
  step+=distance*(crouched?4.5:3.3);movement=dt>0?Math.min(1.7,distance/dt/3):0;
  player.y=THREE.MathUtils.damp(player.y,crouched?.99:1.65,12,dt);
  const leanInput=Number(keys.has('KeyX'))-Number(keys.has('KeyZ'));
  lean=THREE.MathUtils.damp(lean,leanInput,12,dt);
  yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt*1.65;
  pitch=clamp(pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*1.15,-1.28,1.28);
}
function interactWithCart(){
  if(isToss()||mode!=='play')return;
  const leaving=driving();
  if(!leaving&&(reload||changingKit)){announce('Finish handling the camera first');return;}
  if(leaving){
    if(!cart.exit(player,party.subjects)){announce('Move the cart to a clear spot');return;}
  }else{
    if(!cart.board(player)){announce('Walk up beside your golf cart');return;}
    driverLook=0;lastDriverLook=simTime;
    yaw=cart.state.yaw;pitch=-.10;
  }
  const movementKeys=[...keys].filter(k=>['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(k));
  clearInput();movementKeys.forEach(k=>keys.add(k));
  velocity.set(0,0);movement=lean=lookTarget=recoil=0;strideDistance=.5;touchCrouched=false;
  opticalPitch=pitch;opticalYaw=yaw;liveDue=shadowDue=dayHudDue=0;
  camera.position.copy(player);camera.rotation.set(pitch,yaw,0,'YXZ');
  beep(leaving?440:530,.09,.028,'sine',leaving?260:790);
  sync();announce(leaving?'Parked · Camera ready':'At the wheel · Follow the route',1.1);
}
function drivePlayer(dt){
  const down=(...codes)=>Number(codes.some(code=>keys.has(code)));
  const throttle=down('KeyW','ArrowUp')-down('KeyS','ArrowDown')-stick.y;
  const steering=down('KeyD','ArrowRight')-down('KeyA','ArrowLeft')+stick.x;
  cart.step(dt,{throttle:clamp(throttle,-1,1),steering:clamp(steering,-1,1),brake:touchBrake||keys.has('Space')},party.subjects);
  cart.seat(player);
  if(simTime-lastDriverLook>1.4&&Math.abs(cart.state.speed)>1){
    driverLook=THREE.MathUtils.damp(driverLook,0,2.5,dt);
    pitch=THREE.MathUtils.damp(pitch,-.10,2.5,dt);
  }
  yaw=cart.state.yaw+driverLook;opticalYaw=yaw;opticalPitch=pitch;
  motorSound();
}
function moveWithProps(dt,beforeTake){
  const inCart=driving(), body=inCart?cart.state:player;
  const fromX=body.x,fromZ=body.z,fromYaw=inCart?cart.state.yaw:yaw;
  if(inCart)drivePlayer(dt);else movePlayer(dt);
  let echo=null;
  if(isToss()&&take===2){
    const t=takeTime(), a=replay.sample(beforeTake), b=replay.sample(t);
    if(a&&b)echo={kind:'foot',fromX:a.footX,fromZ:a.footZ,fromYaw:a.yaw,x:b.footX,z:b.footZ,yaw:b.yaw,active:true};
    // Only play a contact crossed on this frame. Seeking or a long stall
    // must not play a backlog of old footsteps at the listener's position.
    while(echoStepIndex<takeSteps.length&&takeSteps[echoStepIndex].t<=t){
      const contact=takeSteps[echoStepIndex++];
      if(t-contact.t>.20||muted||audio?.state!=='running')continue;
      const {volume,pan,distance}=soundPerspective(player,yaw,contact,4);
      soundscape?.footstep({...contact.stride,pan,distance,volume:.65*volume});
    }
    while(echoNudgeIndex<takeNudges.length&&takeNudges[echoNudgeIndex].t<=t){
      const action=takeNudges[echoNudgeIndex++];
      echoHand.position.copy(action.position);echoHand.quaternion.copy(action.rotation);echoHand.updateMatrixWorld();
      propPhysics.push(echoHand);
    }
  }
  propPhysics.step(dt,{kind:inCart?'cart':'foot',fromX,fromZ,fromYaw,x:body.x,z:body.z,yaw:inCart?cart.state.yaw:yaw,
    active:true,parkedCart:!isToss()&&!inCart?cart.state:null},echo);
  if(isToss()&&take===1)propPhysics.record(takeTime());
}
function animateBreeze(t){
  const reduced=motionPreference.matches;
  venue.animateAtmosphere(t,{reduced,player:camera.position});
  party.animateVeil(t,reduced);
}
function turn(dx,dy){
  if(driving()){
    driverLook=clamp(driverLook-dx*.0028,-1.47,1.47);
    pitch=clamp(pitch-dy*.0025,-.83,.53);lastDriverLook=simTime;return;
  }
  const s=aimed?(kit==='tele'?.00083*85/teleFocal:.00185):.0028;
  yaw-=dx*s;pitch=clamp(pitch-dy*s,-1.28,1.28);
}
function resize(){
  redraw=true;
  const w=view.clientWidth,h=view.clientHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,coarse()?1.3:1.65));renderer.setSize(w,h,false);
  camera.aspect=rigCamera.aspect=rigScene.userData.aspect=w/h;camera.updateProjectionMatrix();rigCamera.updateProjectionMatrix();
  liveDue=0;
  if(ready&&mode==='ready'&&!isToss())updateEstateMap(mapState());
}
function frame(now){
  const raw=Math.max(0,(now-lastFrame)/1000);lastFrame=now;const dt=Math.min(raw,.07);
  if((mode==='paused'||mode==='finished'||panel.open)&&!redraw){requestAnimationFrame(frame);return;}
  redraw=false;
  if(mode==='rewind'||(mode==='paused'&&resumeMode==='rewind')){
    rewindFrame(mode==='rewind'?raw:0);requestAnimationFrame(frame);return;
  }
  const beforeTake=isToss()?takeTime():0;
  if(mode==='play'){
    const before=elapsed();
    remaining=Math.max(0,remaining-raw);
    if(!isToss())for(const e of calls()){
      if(before<e.start&&elapsed()>=e.start&&elapsed()<=e.end){beep(e.optional?980:690,.14,.035);announce((e.optional?'Bonus call · ':'Now shooting · ')+e.title,1.6);}
      if(before<=e.end&&elapsed()>e.end&&elapsed()<e.end+2&&!keepers.has(e.id)){
        announce((e.optional?'Bonus closed · ':'Missed · ')+e.title,1.5);beep(330,.14,.018,'triangle',200);
      }
    }
    $('timer').textContent=fmt(Math.floor(Math.ceil(remaining)/60),2)+':'+fmt(Math.ceil(remaining)%60,2);
  }
  if(mode==='play'||mode==='ready')simTime+=raw;
  if(mode==='play'){
    if(edgeX||edgeY)turn(edgeX*520*dt,edgeY*410*dt);
    moveWithProps(dt,beforeTake);
  }else movement=0;
  const progress=advanceSwap();
  let swapDip=0;
  if(changingKit){
    const t=clamp((simTime-changingKit.start)/changingKit.length,0,1);
    swapDip=Math.sin(Math.PI*t);
    if(t>=.5&&kit!==changingKit.next){kit=changingKit.next;liveDue=0;sync();}
    if(t>=1)changingKit=null;
  }
  const targetFocal=zoomStops[zoomIndex];
  const oldFocal=Math.round(teleFocal);
  teleFocal=THREE.MathUtils.damp(teleFocal,targetFocal,20,dt);
  if(Math.abs(teleFocal-targetFocal)<.1)teleFocal=targetFocal;
  if(kit==='tele'&&Math.round(teleFocal)!==oldFocal)$('kitLabel').textContent=kitName(kit,teleFocal);
  const reduced=motionPreference.matches;
  const raise=aimed&&!changingKit&&!reload;
  lookTarget=THREE.MathUtils.damp(lookTarget,raise?1:0,kit==='tele'?10:14,dt);
  const settling=kit==='tele'?9:16;
  opticalYaw=THREE.MathUtils.damp(opticalYaw,yaw,settling,dt);
  opticalPitch=THREE.MathUtils.damp(opticalPitch,pitch,settling,dt);
  const lagX=reduced?0:clamp(yaw-opticalYaw,-.041,.041);
  const lagY=reduced?0:clamp(opticalPitch-pitch,-.029,.029);
  const sway=(reduced?0:1)*(isCrouched()?.43:1)*(1-lookTarget*.77);
  camera.position.copy(player);
  const leanX=player.x+Math.cos(yaw)*lean*.32,leanZ=player.z-Math.sin(yaw)*lean*.32;
  if(!blocked(leanX,leanZ)){camera.position.x=leanX;camera.position.z=leanZ;}
  camera.position.y+=Math.sin(step*2)*.018*movement*sway;
  const roll=reduced?0:lean*.073+Math.sin(step)*.009*movement*sway+lagX*.16*sway;
  camera.rotation.set(pitch,yaw,roll,'YXZ');
  if(mode==='play'&&simTime>=nextReachCheck){
    $('nudgeHint').hidden=driving()||coarse()||aimed||Boolean(reload||changingKit)||!propPhysics.canPush(camera);
    nextReachCheck=simTime+.14;
  }
  const stageTime=isToss()?takeTime():weddingTime();
  const dayActive=!isToss();
  const actorTime=dayActive?legacyDayTime(stageTime):mode==='ready'?simTime:stageTime;
  party.update(actorTime,dayActive?'weddingDay':mode==='ready'?'portraits':'bouquetTake',camera.position,stageTime);
  dayProps.update(stageTime,dayActive);
  cartModel.update({...cart.state,steer:-cart.state.steer,active:dayActive,dt:mode==='play'?dt:0});
  const rain=dayActive?rainAt(stageTime):0;
  weather.update(simTime,rain,player,reduced);
  venue.update(stageTime,dayActive,player,DAY_DURATION,rain);
  if(dayActive&&mode==='play'&&!muted&&audio?.state==='running')soundscape?.update({
    t:stageTime,active:true,player,yaw,guitar:soloCall,inside:underRoof(player.x,player.z),rain,
    soloStart:soloCall.start,soloEnd:soloCall.end,impactTime:cakeCall.peak
  });
  animateBreeze(mode==='ready'?simTime:stageTime);
  if(dayActive&&mode==='play'&&stageTime>=dayHudDue){refreshDayHud();refreshCartHud();dayHudDue=stageTime+.12;}
  const area=venue.locationAt(player.x,player.z);
  if($('area').textContent!==area)$('area').textContent=area;
  if(isToss()&&mode==='play'){
    if(take===1)replay.record(stageTime,photographerPose(progress));
    else if(replay.show(stageTime,camera.position)&&!muted&&audio?.state==='running'){
      const pose=replay.sample(stageTime),{pan,volume,distance}=soundPerspective(player,yaw,pose,6);
      soundscape?.shutter(pose.kit,{pan,volume:.68*volume,distance,inside:underRoof(pose.x,pose.z)});
    }
    const cue=tossCue(stageTime);
    if($('momentText').textContent!==cue)$('momentText').textContent=cue;
  }
  if(simTime>=shadowDue){renderer.shadowMap.needsUpdate=true;shadowDue=simTime+.16;}
  if(driving()){
    camera.fov=71+(reduced?0:Math.min(3,Math.abs(cart.state.speed)*.23));
    camera.updateProjectionMatrix();
    renderer.clear();renderer.render(scene,camera);
  }else{
    drawCameraView(dt,{reduced,lagX,lagY,swapDip,progress,stageTime});
  }
  recoil=Math.max(0,recoil-dt*9);
  if(simTime>messageUntil)$('toast').textContent='';
  if(mode==='play'&&remaining===0){
    if(isToss()&&take===1)beginRewind();else endRun();
  }
  requestAnimationFrame(frame);
}
function drawCameraView(dt,{reduced,lagX,lagY,swapDip,progress,stageTime}){
  const finderBlend=THREE.MathUtils.smoothstep(lookTarget,.52,.98);
  composeFrame(camera,sensor,guide,reticle,view.clientWidth,view.clientHeight,kit,portrait,finderBlend,lagX,lagY,focalLength());
  markFirstPhotographer(stageTime);
  view.classList.toggle('aiming',lookTarget>.78&&!reload);
  guide.style.setProperty('--eyecup',String(THREE.MathUtils.smoothstep(lookTarget,.78,.98)));
  $('finderLens').textContent=Math.round(focalLength())+' mm';
  if(simTime>=liveDue&&supplies[kit].battery!==null){
    renderer.setRenderTarget(liveTarget);renderer.clear();renderer.render(scene,sensor);
    renderer.setRenderTarget(null);liveDue=simTime+.13;
  }
  if(remaining>0&&(held||keyboardHeld||queuedShot))expose();
  if(isToss()&&mode==='play')takeSafetyFrame();
  queuedShot=false;
  renderer.clear();renderer.render(scene,camera);
  const blackout=mode==='play'&&!reduced&&simTime<blackoutUntil;
  guide.classList.toggle('shutterClosed',blackout);
  rig.update({blackout,lighting:venue.rigLight,viewQuaternion:camera.quaternion,time:simTime,dt,kit,portrait,focalLength:focalLength(),swapDip,lagX:lagX/.041,lagY:lagY/.029,
    reducedMotion:reduced,crouch:clamp((1.65-player.y)/.66,0,1),walk:Math.min(1,movement),
    nudge:handReach(),aim:lookTarget,shutter:recoil,reload:progress,reloadKind:reload?.kind,reloadSerial:reload?.serial??1});
  rig.group.visible=Boolean(reload)||lookTarget<.98;
  if(rig.group.visible){renderer.clearDepth();renderer.render(rigScene,rigCamera);}
}
function button(label,action,primary=false){
  const btn=document.createElement('button');btn.className=primary?'primary':'secondary';btn.textContent=label;btn.onclick=action;return btn;
}
async function chooseCover(item,img,action){
  action.disabled=true;
  try{
    await img.decode();
    if(!img.isConnected)return;
    const preview=makeWeddingCover(img).toDataURL('image/jpeg',.91);
    coverChoice=item;
    coverPreview=preview;
    sync();
    showPanel('cover');
  }catch{
    action.disabled=false;
    action.textContent='Try making the cover again';
  }
}
function addCoverPreview(){
  const print=document.createElement('img');
  print.className='coverPrint';print.src=coverPreview;
  print.alt='Wedding album cover made with exposure '+fmt(coverChoice.id,4)+', '+coverChoice.label;
  const response=document.createElement('p');
  response.className='coverResponse';
  response.textContent=coverChoice.coupleInFrame
    ? 'Cover request fulfilled · Both newlyweds are in frame.'
    : 'Your cover pick. The couple requested a photo with both of them in frame.';
  panelBody.append(print,response);
}
function showPanel(which,id=null){
  if(!ready)return;
  if(!panel.open)panelOpener=document.activeElement;
  pause();currentPanel=which;
  panel.classList.toggle('pairPanel',isToss()&&which==='results');
  panel.classList.toggle('dayPanel',!isToss()&&which==='results');
  panel.classList.toggle('atlasPanel',which==='map');
  if(!panel.open)panel.showModal();
  const headings={map:'Estate map',pause:'Assignment paused',controls:'Field controls',album:'Contact sheet',results:isToss()?'Two angles of the toss':isStorm()?'The storm wedding':'The wedding album',cover:'Your wedding album cover',photo:'Exposure '+fmt(id||0,4)};
  panelBody.innerHTML='<div class="panelKicker">Villa Luce / The Tuscan Wedding</div><h2>'+headings[which]+'</h2>';
  const actions=document.createElement('div');actions.className='panelButtons';
  const back=()=>mode==='paused'?startPlay():closePanel();
  if(which==='map'){
    panelBody.append(renderEstateAtlas(mapState()));
    actions.append(button(driving()?'Back to cart':'Back to camera',back,true));
  }else if(which==='pause'){
    panelBody.insertAdjacentHTML('beforeend','<p>The wedding is on hold. Your card, battery, and photos are right where you left them.</p>');
    if(!isToss())panelBody.append(renderDayItinerary({events:calls(),keepers,t:elapsed()}));
    actions.append(button('Resume assignment',startPlay,true),button('View contact sheet',()=>showPanel('album')));
    if(!isToss())actions.append(button('Estate map',()=>showPanel('map')),button('Finish assignment',endRun));
  }else if(which==='controls'){
    const controls=coarse()?[['Joystick','Walk, or push to the edge to sprint'],['Drag scene','Look around'],['Shoot','Hold for a burst'],['Aim','Toggle the viewfinder'],['Camera / Rotate','Switch bodies or rotate the frame'],['− / +','Zoom the telephoto lens'],['Crouch','Lower or raise your viewpoint'],['Card / Battery','Swap camera supplies']]:
      [['W A S D','Move around the venue'],['Move mouse / arrow keys','Look around. Rest near an edge to keep turning in an embedded view.'],['Left click / Space','Take a photo. Hold for a burst.'],['Right mouse / F','Hold to look through the viewfinder'],['R / B','Swap the SD card or battery'],['Q / 1 / 2','Switch bodies / select wide / select telephoto'],['Wheel / − / +','Zoom the telephoto from 85 to 200 mm'],['V','Rotate between landscape and portrait'],['Shift / C','Hold to sprint or crouch'],['Z / X','Hold to lean left or right'],['P / Esc','Pause assignment']];
    controls.push([coarse()?'Nudge':'G','Push a loose prop within reach']);
    if(!isToss())controls.push([coarse()?'Drive cart / Jump out':'E','Get in beside the golf cart or park and hop out'],
      [coarse()?'Joystick':'WASD / arrows','Drive, reverse and steer the cart'],
      [coarse()?'Brake':'Space','Brake while driving'],
      [coarse()?'Minimap':'M','Open or close the estate map and itinerary']);
    const grid=document.createElement('div');grid.className='controlsGrid';
    for(const [key,description] of controls){const k=document.createElement('kbd');k.textContent=key;const d=document.createElement('span');d.textContent=description;grid.append(k,d);}panelBody.append(grid);
    if(isToss())panelBody.insertAdjacentHTML('beforeend','<p>Photograph the bouquet in two 30-second takes. The first photographer repeats your route and shutter timing in take two. At the end, compare both angles. If you never press the shutter, a safety frame is captured from your lens when it is available.</p>');
    else panelBody.insertAdjacentHTML('beforeend','<p>Follow the pulsing pin to each photo call. In the cart, the route leads to a drop-off. Hop out for the walking route to the subject. Open the estate map to plan your next few stops. Frame the action while the call is open. For the kiss and family portrait, fit at least two of the featured people in your photo. Timing and framing improve each album page. The bonus dance overlaps the bouquet.</p>');
    actions.append(button(driving()?'Back to cart':'Back to camera',back,true));
  }else if(which==='results'&&isToss()){
    const savePair=presentPair(panelBody,rolls);
    actions.append(savePair,button('Shoot again',startPlay),button('Choose assignment',chooseAssignment));
  }else if(which==='results'){
    panelBody.append(renderDayAlbum({events:calls(),keepers,onPhoto:item=>showPanel('photo',item.id)}));
    actions.append(button(isStorm()?'Reshoot the storm wedding':'Shoot another wedding',startPlay,true),button('Contact sheet',()=>showPanel('album')),button('Choose assignment',chooseAssignment));
  }else if(which==='album'){
    const items=albumItems();
    if(!isToss())panelBody.append(renderDayItinerary({events:calls(),keepers,t:elapsed()}));
    if(coverChoice){
      const reviewing=button('View album cover · #'+fmt(coverChoice.id,4),()=>showPanel('cover'));
      reviewing.classList.add('coverShortcut');panelBody.append(reviewing);
    }
    if(items.length){
      const desc=document.createElement('p');desc.textContent=isToss()?'Your exposures from both takes. The final pair appears after take two.':coverChoice?'Select a frame to review it or change the cover.':'The couple asked for one cover photo with both of them in frame. Pick your favorite.';panelBody.append(desc);
      const list=document.createElement('div');list.className='contact';
      for(const item of items){const btn=document.createElement('button');btn.className='photo';const img=document.createElement('img');img.src=item.url;img.alt=item.label;const cap=document.createElement('span');cap.textContent='#'+fmt(item.id,4)+' · '+(isToss()?'Take '+item.take:coverChoice?.id===item.id?'Album cover':item.coupleInFrame?'Both newlyweds':'+'+item.points);btn.append(img,cap);btn.onclick=()=>showPanel('photo',item.id);list.append(btn);}panelBody.append(list);
    }else{panelBody.insertAdjacentHTML('beforeend','<p>Your contact sheet is empty. Press the shutter during the assignment to record your first frame.</p>');}
    if(mode==='finished')actions.append(button('Back to results',()=>showPanel('results'),true));
    else {actions.append(button(mode==='paused'?'Resume assignment':'Back to camera',back,true));if(mode==='paused'&&!isToss())actions.append(button('Finish assignment',endRun));}
  }else if(which==='cover'&&coverChoice){
    addCoverPreview();
    const download=document.createElement('a');download.href=coverPreview;
    download.download='Villa-Luce-Wedding-Cover-'+fmt(coverChoice.id,4)+'.jpg';
    download.className='primary printDownload';download.textContent='Save album cover';
    actions.append(download,button('Contact sheet',()=>showPanel(mode==='finished'?'results':'album')));
    if(mode==='paused')actions.append(button('Resume assignment',startPlay));
  }else if(which==='photo'){
    const item=albumItems().find(x=>x.id===id);if(!item)return showPanel('album');
    const img=document.createElement('img');img.className='largePhoto';img.src=item.url;img.alt=item.label;const desc=document.createElement('p');desc.textContent=item.label+' · '+item.points+' points · '+kitName(item.kit,item.focal)+' · '+(item.portrait?'Portrait':'Landscape');if(item.coupleInFrame)desc.textContent+=' · Both newlyweds in frame';panelBody.append(img,desc);
    const link=document.createElement('a');link.href=item.url;link.download='shutter-rush-'+fmt(id,4)+'.jpg';link.className='closeLink';link.textContent='Save photo';
    const useCover=button(coverChoice?.id===item.id?'View album cover':'Use as album cover',()=>{
      if(coverChoice?.id===item.id)showPanel('cover');
      else chooseCover(item,img,useCover);
    },true);
    actions.append(useCover,link,button('Contact sheet',()=>showPanel(mode==='finished'?'results':'album')));
  }
  panelBody.append(actions);panel.scrollTop=0;
}
function closePanel(){
  if(currentPanel==='photo'||currentPanel==='cover'){showPanel(mode==='finished'?'results':'album');return;}
  if(mode==='finished'){panel.close();currentPanel='';panelOpener?.focus?.();return;}
  if(mode==='paused'){startPlay();return;}
  panel.close();currentPanel='';panelOpener?.focus?.();
}
$('stormStart').onclick=()=>{resetRun(isStorm()?'day':'storm');startPlay();};
$('classicStart').onclick=()=>{if(mode==='finished')chooseAssignment();else{resetRun('toss');startPlay();}};
$('start').onclick=()=>mode==='finished'?showPanel('results'):startPlay();$('pauseBtn').onclick=()=>{if(mode==='ready')showPanel('controls');else if(running())showPanel('pause');else if(mode==='paused')startPlay();else showPanel('results');};
$('cartInteract').onclick=interactWithCart;
$('cartBrake').onpointerdown=e=>{if(!driving())return;e.currentTarget.setPointerCapture(e.pointerId);touchBrake=true;};
$('cartBrake').onlostpointercapture=()=>{touchBrake=false;};
$('mapBtn').onclick=()=>{if(!isToss()&&(mode==='play'||mode==='ready'))showPanel('map');};
$('controls').onclick=()=>showPanel('controls');$('album').onclick=()=>showPanel('album');$('closePanel').onclick=closePanel;
panel.addEventListener('cancel',e=>{e.preventDefault();closePanel();});
$('sound').onclick=()=>{muted=!muted;enableAudio();if(muted)soundscape?.stop();motorSound();$('sound').innerHTML=icon(muted?'mute':'audio');$('sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');$('sound').title=muted?'Enable sound':'Mute sound';};
$('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{announce('Fullscreen unavailable in this browser',2);}};
if(!document.documentElement.requestFullscreen)$('full').hidden=true;
$('zoomLess').onclick=()=>zoomBy(-1);
$('zoomMore').onclick=()=>zoomBy(1);
world.addEventListener('wheel',e=>{
  if(mode!=='play'||driving()||e.ctrlKey||e.metaKey)return;
  e.preventDefault();
  if(kit!=='tele'||changingKit||reload)return;
  const now=performance.now();
  if(now-lastWheelAt>160||Math.sign(e.deltaY)!==Math.sign(wheelDistance))wheelDistance=0;
  lastWheelAt=now;
  wheelDistance+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?view.clientHeight:1);
  if(Math.abs(wheelDistance)>=28){zoomBy(-Math.sign(wheelDistance));wheelDistance=0;}
},{passive:false});
world.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('pointerdown',e=>{lastPointerType=e.pointerType;},true);
world.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse')return;
  resetMouseLook();
  if(mode==='ready'){startPlay();return;}
  if(mode!=='play'||drag)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY};
  world.setPointerCapture(e.pointerId);
  e.preventDefault();
});

// Mouse button events remain independent when the shutter and finder are held together.
world.addEventListener('mousedown',e=>{
  if(lastPointerType==='touch'||lastPointerType==='pen'||e.sourceCapabilities?.firesTouchEvents)return;
  if(mode==='ready'){if(e.button===0)startPlay();return;}
  if(mode!=='play'||driving())return;
  if(e.button===0){held=queuedShot=true;enableAudio();}
  if(e.button===2)aimed=true;
});
document.addEventListener('mouseup',e=>{
  if(e.sourceCapabilities?.firesTouchEvents||lastPointerType==='touch'||lastPointerType==='pen')return;
  if(e.button===0)held=false;
  if(e.button===2)aimed=keys.has('KeyF');
});

// Captured mouse movement is unbounded. An embedded browser can decline capture,
// in which case movement across the canvas and gentle edge panning do the same job.
document.addEventListener('mousemove',e=>{
  if(mode==='play'&&document.pointerLockElement===world)turn(e.movementX,e.movementY);
});
world.addEventListener('pointerenter',e=>{
  if(e.pointerType==='mouse'&&mode==='play'&&!document.pointerLockElement)mouseSample={x:e.clientX,y:e.clientY};
});
world.addEventListener('pointermove',e=>{
  if(mode!=='play'||document.pointerLockElement)return;
  if(e.pointerType!=='mouse'){
    if(drag?.id!==e.pointerId)return;
    turn(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;
    return;
  }
  const dx=mouseSample?e.clientX-mouseSample.x:e.movementX;
  const dy=mouseSample?e.clientY-mouseSample.y:e.movementY;
  mouseSample={x:e.clientX,y:e.clientY};
  if(!dx&&!dy)return;
  turn(dx,dy);
  const rect=world.getBoundingClientRect(),band=Math.min(30,rect.width*.05,rect.height*.06);
  if(band<=0)return;
  function edge(value,low,high){
    if(value<low+band)return -clamp((low+band-value)/band,0,1);
    return clamp((value-high+band)/band,0,1);
  }
  edgeX=edge(e.clientX,rect.left,rect.right);edgeY=edge(e.clientY,rect.top,rect.bottom);
});
world.addEventListener('pointerleave',e=>{
  if(e.pointerType==='mouse'&&!document.pointerLockElement){
    resetMouseLook();held=false;if(!keys.has('KeyF'))aimed=false;
  }
});
world.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)drag=null;});
document.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)drag=null;});
document.addEventListener('pointercancel',()=>clearInput());
document.addEventListener('pointerlockchange',()=>{
  const locked=document.pointerLockElement===world,wasLocked=ownedLock;
  ownedLock=locked;resetMouseLook();
  if(locked&&!running()){document.exitPointerLock();return;}
  if(wasLocked&&!locked&&running())showPanel('pause');
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running())showPanel('pause');});
window.addEventListener('blur',()=>{if(running())showPanel('pause');});
document.addEventListener('keydown',e=>{
  if(mode==='rewind'&&['KeyP','Escape'].includes(e.code)){showPanel('pause');return;}
  if(e.code==='KeyM'&&!isToss()&&!e.ctrlKey&&!e.metaKey&&(mode==='play'||mode==='ready'&&!panel.open||currentPanel==='map')){
    e.preventDefault();if(!e.repeat){if(currentPanel==='map')closePanel();else showPanel('map');}return;
  }
  if(panel.open||mode!=='play')return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();
  keys.add(e.code);
  if(e.code==='KeyE'&&!isToss()&&!e.ctrlKey&&!e.metaKey){if(!e.repeat)interactWithCart();return;}
  if(driving()){
    if(!e.repeat&&(e.code==='KeyP'||e.code==='Escape'))showPanel('pause');
    if(!e.repeat&&e.code==='Tab')showPanel('album');
    return;
  }
  if(['Equal','NumpadAdd','Minus','NumpadSubtract'].includes(e.code)&&!e.ctrlKey&&!e.metaKey){
    e.preventDefault();if(!e.repeat)zoomBy(['Equal','NumpadAdd'].includes(e.code)?1:-1);
  }
  if(e.code==='Space'){keyboardHeld=true;if(!e.repeat)queuedShot=true;}if(e.code==='KeyF')aimed=true;
  if(e.repeat)return;
  if(e.code==='KeyG'&&!e.ctrlKey&&!e.metaKey)nudgeProp();
  if(e.code==='KeyQ')changeCamera();
  if(e.code==='Digit1')changeCamera('wide');
  if(e.code==='Digit2')changeCamera('tele');
  if(e.code==='KeyV')rotateCamera();
  if(e.code==='KeyC')sync();
  if(e.code==='KeyR')swap('card');if(e.code==='KeyB')swap('battery');
  if(e.code==='KeyP'||e.code==='Escape')showPanel('pause');if(e.code==='Tab')showPanel('album');
});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='KeyC'&&mode==='play')sync();if(e.code==='Space')keyboardHeld=false;if(e.code==='KeyF')aimed=false;});
const pad=$('pad');
function stickTo(e){const b=pad.getBoundingClientRect(),x=(e.clientX-b.left-b.width/2)/(b.width*.37),y=(e.clientY-b.top-b.height/2)/(b.height*.37),len=Math.max(1,Math.hypot(x,y));stick.x=x/len;stick.y=y/len;pad.firstElementChild.style.transform='translate('+stick.x*18+'px,'+stick.y*18+'px)';}
pad.onpointerdown=e=>{stick.id=e.pointerId;pad.setPointerCapture(e.pointerId);stickTo(e);};pad.onpointermove=e=>{if(stick.id===e.pointerId)stickTo(e);};
pad.onlostpointercapture=()=>{stick.x=stick.y=0;stick.id=null;pad.firstElementChild.style.transform='';};
$('touchShoot').onpointerdown=e=>{e.currentTarget.setPointerCapture(e.pointerId);keyboardHeld=queuedShot=true;};$('touchShoot').onlostpointercapture=()=>{keyboardHeld=false;};
$('touchAim').onclick=()=>{aimed=!aimed;$('touchAim').setAttribute('aria-pressed',String(aimed));};
$('touchNudge').onclick=nudgeProp;
$('touchKit').onclick=()=>changeCamera();
$('touchFormat').onclick=rotateCamera;
$('touchCrouch').onclick=()=>{touchCrouched=!touchCrouched;sync();};
$('touchSD').onclick=()=>swap('card');$('touchBat').onclick=()=>swap('battery');
async function initialize(){
  const [{buildVenue},{buildGuests},{buildRig}]=await Promise.all([import('./venue.js'),import('./guests.js'),import('./rig.js')]);
  renderer=new THREE.WebGLRenderer({canvas:world,antialias:true,powerPreference:'high-performance',alpha:false});
  renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  scene=new THREE.Scene();venue=buildVenue(scene);chapel=buildChapelSolo(scene,venue);
  weather=buildWeddingWeather(scene);navigation=buildEstateNavigation(venue);party=buildGuests(scene);dayProps=buildDayProps(scene,chapel);replay=buildReplay(scene);
  cart=createCartDriving(venue);cartModel=createGolfCartModel(scene);
  const propsLayer=new THREE.Group();propsLayer.name='Loose wedding props';scene.add(propsLayer);
  propPhysics=createPropPhysics(scene,venue,buildPhysicsProps(propsLayer,venue),propImpact);
  camera=new THREE.PerspectiveCamera(59,1,.07,220);sensor=camera.clone();rigScene=new THREE.Scene();rigCamera=new THREE.PerspectiveCamera(55,1,.03,9);
  liveTarget=new THREE.WebGLRenderTarget(384,256,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});rig=buildRig(rigScene,liveTarget.texture);
  new ResizeObserver(resize).observe(view);resize();
  resetCameraForTake();ready=true;$('stormStart').disabled=false;$('classicStart').disabled=false;$('start').disabled=false;$('start').lastElementChild.textContent='Start assignment';sync();
  lastFrame=performance.now();frame(lastFrame);
}
initialize().catch(err=>{console.error(err);$('error').hidden=false;$('error').textContent='The 3D venue could not start. Open this demo in a browser with WebGL 2 and hardware acceleration enabled, then reload.';});
