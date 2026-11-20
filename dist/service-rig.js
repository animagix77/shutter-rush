// Judge Dean LLC
import * as THREE from 'three';
import { serviceMarks as mark } from './service.js';

const v = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const ease = (t,a,b) => THREE.MathUtils.smoothstep(t,a,b);

export function servicePose(t) {
  return ease(t,0,mark.open) * (1-ease(t,mark.latched,1));
}

export function buildServiceRig(root, cameraGroup, tool, mat) {
  const {box, oval, tube, mesh, batchParts, canvasTexture} = tool;
  const {black,edge,graphite,rubber,silver,orange,glove,skin,sleeve} = mat;
  const brass = new THREE.MeshStandardMaterial({color:0xccac69,metalness:.7,roughness:.32});
  const voidMat = new THREE.MeshBasicMaterial({color:0x090c0d});
  const group = (parent,name) => {
    const g = new THREE.Group(); g.name=name; parent.add(g); return g;
  };
  function printText(ctx,text,color,size) {
    ctx.clearRect(0,0,384,96);ctx.fillStyle=color;
    ctx.font='bold '+size+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(text,192,49,371);
  }
  function printed(parent,text,materialColor,x,y,z,w,h,size=58) {
    const texture=canvasTexture(384,96,ctx=>printText(ctx,text,materialColor,size));
    const ink=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
    return mesh(parent,new THREE.PlaneGeometry(w,h),ink,x,y,z);
  }

  // Fixed apertures stay with the camera; each door has its own hinge axis.
  const housing=group(cameraGroup,'Card and battery compartments');
  const cardPort=v(-.823,-.074,.106), batteryPort=v(.47,-.524,.005);
  const cardBezel=group(housing,'Gasketed SD card slot');
  cardBezel.position.copy(cardPort);cardBezel.rotation.y=-Math.PI/2;
  box(cardBezel,rubber,0,0,0,.375,.47,.03,.022,.003);
  box(cardBezel,edge,0,0,.020,.079,.329,.013,.01,.002);
  box(cardBezel,voidMat,0,0,.029,.052,.297,.011,.004,.001);
  box(cardBezel,brass,-.019,-.065,.036,.006,.072,.001,.001,0);
  const cardDoor=group(housing,'Hinged side door');
  cardDoor.position.set(cardPort.x-.037,cardPort.y+.235,cardPort.z);
  const cover=group(cardDoor,'Side-door outer face'); cover.rotation.y=-Math.PI/2;
  box(cover,graphite,0,-.235,.004,.36,.471,.035,.026,.005);
  box(cover,rubber,0,-.237,.025,.327,.413,.012,.021,.002);
  for(let i=0;i<4;i++)box(cover,edge,.072,-.32+i*.018,.037,.096,.006,.009,.002,.001);
  printed(cover,'SD', '#d0d7ce',-.03,-.15,.036,.14,.070);
  tube(housing,edge,v(cardDoor.position.x,cardDoor.position.y,cardPort.z-.17),v(cardDoor.position.x,cardDoor.position.y,cardPort.z+.17),.021);

  const base=group(housing,'Battery guide and contacts');
  base.position.copy(batteryPort);base.rotation.x=Math.PI/2;
  box(base,black,0,0,0,.472,.39,.033,.028,.003);
  box(base,silver,0,0,.017,.371,.286,.011,.019,.002);
  box(base,voidMat,0,0,.025,.339,.252,.015,.013,.002);
  for(let i=0;i<3;i++)box(base,brass,-.075+i*.045,.073,.034,.019,.054,.009,.005,.002);
  const catchTab=box(base,orange,.163,-.018,.044,.056,.091,.018,.008,.002);
  const batteryDoor=group(housing,'Hinged battery door');
  batteryDoor.position.set(batteryPort.x,batteryPort.y-.038,batteryPort.z-.195);
  box(batteryDoor,graphite,0,0,.195,.47,.043,.389,.020,.004);
  box(batteryDoor,black,0,-.025,.193,.41,.014,.34,.019,.003);
  const latch=group(batteryDoor,'Sliding battery latch');
  latch.position.set(.05,-.038,.30);
  box(latch,silver,0,0,0,.139,.014,.046,.008,.001);
  for(let i=0;i<4;i++)box(latch,rubber,-.044+i*.027,-.009,0,.007,.004,.032,.002,.001);
  batchParts(batteryDoor);batchParts(latch);
  tube(housing,edge,v(batteryPort.x-.20,batteryDoor.position.y,batteryDoor.position.z),v(batteryPort.x+.20,batteryDoor.position.y,batteryDoor.position.z),.024);
  batchParts(cardBezel);batchParts(cover);

  function medium(kind,spare) {
    const g=group(cameraGroup,(spare?'Fresh ':'Used ')+(kind==='card'?'SD card':'battery pack'));
    const band = new THREE.MeshStandardMaterial({color:spare?0x69b3a5:0xde783c,roughness:.67});
    let numberPlate;
    if(kind==='card') {
      // Grip origin is at the exposed edge; contact end and keyed corner enter first.
      const profile=new THREE.Shape();
      profile.moveTo(-.025,-.136);profile.lineTo(.276,-.136);profile.lineTo(.318,-.09);
      profile.lineTo(.318,.136);profile.lineTo(.150,.136);profile.lineTo(.150,.126);
      profile.lineTo(.088,.126);profile.lineTo(.088,.136);profile.lineTo(-.025,.136);profile.closePath();
      const geo=new THREE.ExtrudeGeometry(profile,{depth:.025,bevelEnabled:true,bevelThickness:.002,bevelSize:.003,bevelSegments:1}).translate(0,0,-.0125);
      mesh(g,geo,black);
      box(g,band,.095,0,.017,.207,.248,.005,.008,.001);
      numberPlate=printed(g,spare?'02':'01','#f7f7e9',.085,.033,.023,.146,.12,77);
      printed(g,'SDXC','#132327',.082,-.071,.024,.131,.043);
      for(let i=0;i<9;i++) {
        const y=-.102+i*.025;
        box(g,brass,.255,y,-.015,.085,.017,.004,.002,.001);
      }
      box(g,silver,.111,.136,.002,.041,.009,.018,.002,0);
    } else {
      box(g,graphite,0,.218,0,.311,.46,.219,.029,.005);
      box(g,rubber,0,-.012,0,.320,.042,.228,.014,.003);
      box(g,band,0,.225,.115,.255,.28,.006,.009,.001);
      printed(g,'LI-ION','#173034',0,.294,.120,.208,.057);
      numberPlate=printed(g,spare?'02':'01','#f1f4e6',0,.193,.120,.168,.105,79);
      for(const x of [-.13,.13])box(g,edge,x,.21,-.112,.018,.40,.032,.006,.002);
      for(let i=0;i<3;i++) box(g,brass,-.080+i*.052,.447,.071,.039,.015,.064,.004,.001);
    }
    const numberTexture=numberPlate.material.map;
    g.userData.serial=spare?2:1;
    g.userData.updateSerial=n=>{
      if(g.userData.serial===n)return;
      g.userData.serial=n;
      band.color.setHex(n%2?0xde783c:0x69b3a5);
      printText(numberTexture.image.getContext('2d'),String(n).padStart(2,'0'),'#f7f7e9',kind==='card'?77:79);
      numberTexture.needsUpdate=true;
    };
    batchParts(g);
    return g;
  }
  const media={card:[medium('card',false),medium('card',true)],battery:[medium('battery',false),medium('battery',true)]};

  const pouch=group(root,'Two-pocket camera harness wallet');
  const canvas=new THREE.MeshStandardMaterial({color:0x505b47,roughness:1});
  const seam=new THREE.MeshStandardMaterial({color:0x93967a,roughness:1});
  box(pouch,glove,0,-.26,0,1.05,.57,.256,.052,.008);
  for(const side of [-1,1]) {
    const x=side*.251;
    box(pouch,voidMat,x,.026,0,.464,.029,.254,.013,.001);
    box(pouch,canvas,x,-.206,.149,.47,.47,.055,.029,.004);
    box(pouch,glove,x,.013,.178,.45,.069,.024,.012,.001);
    for(let j=0;j<8;j++)box(pouch,seam,x-.184+j*.052,-.027,.179,.030,.006,.004,.001,0);
    box(pouch,side===-1?orange:seam,x+.156,-.079,.186,.055,.075,.010,.004,.001);
  }
  batchParts(pouch);

  // The working hand uses a pinch between the thumb and first finger. The
  // remaining digits stay curled, with separate knuckles visible against the glove.
  const hand=group(cameraGroup,'Working left hand');
  oval(hand,glove,-.265,-.163,-.028,.197,.146,.116).rotation.z=.47;
  oval(hand,glove,-.405,-.269,.020,.145,.143,.145);
  tube(hand,glove,v(-.408,-.27,.02),v(-.283,-.158,-.016),.135,.143);
  const index=group(hand,'Index finger');
  const thumb=group(hand,'Thumb');
  function digitChain(parent,points,radii) {
    for(let i=0;i<points.length-1;i++) {
      const a=points[i],b=points[i+1],m=i===0?glove:skin;
      tube(parent,m,a,b,radii[i],radii[i+1],12);
      const r=radii[i+1]; oval(parent,m,b.x,b.y,b.z,r,r,r);
    }
  }
  digitChain(index,[v(-.23,-.068,-.051),v(-.135,.014,-.068),v(-.062,.026,-.064),v(-.008,.004,-.047)],[.056,.048,.039,.037]);
  digitChain(thumb,[v(-.257,-.16,.071),v(-.126,-.104,.103),v(-.054,-.039,.09),v(-.004,0,.047)],[.073,.057,.047,.04]);
  for(let i=0;i<3;i++){
    const y=-.117-i*.063;
    digitChain(hand,[v(-.239,y,-.079),v(-.122,y+.027,-.093),v(-.069,y+.005,-.052),v(-.098,y-.022,.012)],[.051-i*.004,.046-i*.003,.038-i*.003,.034-i*.003]);
  }
  batchParts(hand);batchParts(index);batchParts(thumb);

  const clear=v(),dock=v(),rest=v(),latchPoint=v(),pocketOld=v(),pocketSpare=v();
  const position=v(),wrist=v(-.414,-.277,.015);
  const quaternion=new THREE.Quaternion(),pocketRotation=new THREE.Quaternion(),ordinaryRotation=new THREE.Quaternion();
  const handQ=new THREE.Quaternion(),identity=new THREE.Quaternion(),pouchEuler=new THREE.Euler();
  const matInverse=new THREE.Matrix4();
  const gripOrientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.12,.90,-.09));
  const translate=(start,end,t)=>{
    const e=ease(t,0,1);
    return position.lerpVectors(start,end,e);
  };
  const reachPoint=new THREE.Vector3(), openPalm=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.45,.22,-.38));
  function update({cycle:t,nudge=0,kind,serial,aspect,gearScale,wide,wristLeft}) {
    const weight=servicePose(t),active=t>0&&t<1,pack=kind==='battery';
    const opening=ease(t,mark.open,.25)*(1-ease(t,.815,mark.latched));
    cardBezel.visible=!pack&&opening>.001;
    base.visible=pack&&opening>.001;
    cardDoor.rotation.z=pack?0:-1.92*opening;
    batteryDoor.rotation.x=pack?1.86*opening:0;
    latch.position.x=.05-(pack?.073*opening:0);
    catchTab.position.x=.163+(pack?.027*(ease(t,.265,mark.release)-ease(t,.775,mark.seated)):0);
    for(const pair of Object.values(media))for(const piece of pair)piece.visible=false;
    const old=media[kind][0],spare=media[kind][1];
    if(active){old.userData.updateSerial(serial);spare.userData.updateSerial(serial+1);}
    pouch.visible=weight>.001;
    pouch.scale.setScalar(gearScale*.97);
    pouch.position.set(-.22*Math.min(aspect,1.9),-.90+weight*.44,-1.22);
    pouch.rotation.set(.17,-.12,.05);
    pouch.updateMatrix();
    cameraGroup.updateMatrix();
    matInverse.copy(cameraGroup.matrix).invert();
    pocketOld.set(-.25,-.16,-.025).applyMatrix4(pouch.matrix).applyMatrix4(matInverse);
    pocketSpare.set(.25,-.16,-.025).applyMatrix4(pouch.matrix).applyMatrix4(matInverse);
    pouchEuler.set(0,0,pack?Math.PI:-Math.PI/2);
    pocketRotation.copy(cameraGroup.quaternion).invert().multiply(pouch.quaternion)
      .multiply(ordinaryRotation.setFromEuler(pouchEuler));
    dock.copy(pack?batteryPort:cardPort);
    if(pack)dock.y-=.044;else dock.x-=.045;
    clear.copy(dock);if(pack){clear.y-=.64;clear.z+=.025;}else{clear.x-=.53;clear.z+=.03;}
    rest.set(-.41,-.11,-.89+(wide?.34:-.11));
    const door=pack?batteryDoor:cardDoor;
    door.updateMatrix();
    latchPoint.set(pack?.09:0,pack?-.05:-.389,pack?.31:.095).applyMatrix4(door.matrix);
    const extract = ease(t,mark.release,.329)*.19+ease(t,.332,mark.out)*.81;
    const inserted = ease(t,mark.insert,mark.seated);
    old.visible=active&&t>=.22&&t<mark.stowed;
    spare.visible=active&&t>=mark.spare&&t<.84;
    const working= t<mark.stowed ?old:spare;
    quaternion.identity();
    if(t<mark.open) {
      translate(rest,latchPoint,t/mark.open);
      position.z+=.25*Math.sin(Math.PI*ease(t,0,mark.open));
    } else if(t<.24)position.copy(latchPoint);
    else if(t<mark.release)translate(latchPoint,dock,(t-.24)/(mark.release-.24));
    else if(t<mark.out)position.lerpVectors(dock,clear,extract);
    else if(t<mark.stowed) {
      const e=ease(t,mark.out,mark.stowed);
      position.lerpVectors(clear,pocketOld,e);
      position.z+=.082*Math.sin(e*Math.PI);
      quaternion.slerp(pocketRotation,e);
    } else if(t<mark.spare) {
      const e=ease(t,mark.stowed,mark.spare);
      position.lerpVectors(pocketOld,pocketSpare,e);
      position.y+=.11*Math.sin(Math.PI*e);
      quaternion.copy(pocketRotation);
    } else if(t<mark.insert) {
      const e=ease(t,mark.spare,mark.insert);
      position.lerpVectors(pocketSpare,clear,e);
      position.z+=.09*Math.sin(e*Math.PI);
      quaternion.copy(pocketRotation).slerp(identity,e);
    } else if(t<mark.seated)position.lerpVectors(clear,dock,inserted);
    else if(t<.82)translate(dock,latchPoint,(t-mark.seated)/(.82-mark.seated));
    else if(t<mark.latched)position.copy(latchPoint);
    else{
      translate(latchPoint,rest,(t-mark.latched)/(.98-mark.latched));
      position.z+=.23*Math.sin(Math.PI*ease(t,mark.latched,.98));
    }
    // Park the outgoing and incoming pieces on the slot axis while the hand
    // works the door. Once extracted, their keyed ends follow the pinch.
    working.position.copy(t<mark.release||t>=mark.seated?dock:position);
    working.quaternion.copy(quaternion);
    hand.position.copy(position);
    handQ.copy(gripOrientation).slerp(identity,weight);
    // Keep the wrist below the palm, even while a card rotates into the wallet.
    hand.quaternion.copy(handQ);
    if(!active&&nudge>0){
      // Release the lens with the support hand and reach out over its left edge.
      reachPoint.set(-.12*Math.min(aspect,1.8),-.22,-1.64).applyMatrix4(matInverse);
      hand.position.lerp(reachPoint,nudge);hand.quaternion.slerp(openPalm,nudge);
    }
    const thickness=pack?.109:.013;
    const pinch=weight*(1-ease(t,mark.stowed,.516)+ease(t,.54,mark.spare));
    index.position.z=-thickness*pinch;
    thumb.position.z=thickness*pinch;
    // At rest the open fingertips cradle the barrel.
    index.rotation.y=(1-weight)*.21;
    thumb.rotation.y=-(1-weight)*.83;
    hand.updateMatrix();
    wristLeft.copy(wrist).applyMatrix4(hand.matrix);
  }
  return {update};
}
