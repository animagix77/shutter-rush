// Judge Dean LLC
import * as THREE from 'three';
import { group, rigid } from './day-props.js';

const pi=Math.PI, tau=2*pi;
const green=0x236859, shadowGreen=0x174d41, ivory=0xf5e8cb, piping=0xdfcc9f;
const black=0x20282a, rubber=0x303438, dash=0x33423e, metal=0x89938e;
const brass=0xc9a469, amber=0xef983e, stitching=0xc4b59d;
const coated=new Map();
function finish(color){
  if(!coated.has(color))coated.set(color,new THREE.MeshStandardMaterial({color,roughness:.63,metalness:.14}));
  return coated.get(color);
}

// Each section is the rounded outline of a body panel at one elevation.
// The lip around the canopy, the tapered bonnet and the seat piping keep their silhouette at distance.
function mould(parent,color,sections,rise=0){
  const pts=[],idx=[],steps=4,count=4*(steps+1);
  for(const [y,w,d,z,r] of sections){
    for(let k=0;k<4;k++){
      const cx=(k===0||k===3?1:-1)*(w/2-r),cz=(k<2?1:-1)*(d/2-r);
      for(let j=0;j<=steps;j++){
        const angle=(k+j/steps)*pi/2,px=cx+Math.cos(angle)*r,pz=cz+Math.sin(angle)*r;
        pts.push(px,y+pz*rise,z+pz);
      }
    }
  }
  for(let n=0;n<sections.length-1;n++)for(let j=0;j<count;j++){
    const a=n*count+j,b=n*count+(j+1)%count;
    idx.push(a,a+count,b,b,a+count,b+count);
  }
  for(const top of [false,true]){
    const n=top?sections.length-1:0,[y,,,z]=sections[n];
    const c=pts.length/3;pts.push(0,y,z);
    for(let j=0;j<count;j++){
      const a=n*count+j,b=n*count+(j+1)%count;
      if(top)idx.push(c,b,a);else idx.push(c,a,b);
    }
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geom.setIndex(idx);geom.computeVertexNormals();
  const mesh=new THREE.Mesh(geom,finish(color));mesh.castShadow=mesh.receiveShadow=true;
  parent.add(mesh);
}
function plaqueMaterial(){
  const sheet=document.createElement('canvas');sheet.width=768;sheet.height=208;
  const c=sheet.getContext('2d');
  c.fillStyle='#f1e7cc';c.fillRect(0,0,768,208);
  c.strokeStyle='#b49c6d';c.lineWidth=5;c.strokeRect(7,7,754,194);
  c.fillStyle='#204d40';c.fillRect(23,23,161,162);
  c.translate(103,104);
  c.strokeStyle='#f2e4be';c.lineWidth=7;
  c.beginPath();c.arc(0,0,54,0,tau);c.stroke();
  for(let i=0;i<6;i++){
    c.save();c.rotate(i*pi/3);c.beginPath();c.moveTo(-2,-52);c.lineTo(24,-5);c.lineTo(14,12);c.stroke();c.restore();
  }
  c.resetTransform();c.fillStyle='#244a3e';c.font='bold 35px Georgia,serif';c.fillText('V I L L A   L U C E',207,76);
  c.font='bold 76px sans-serif';c.fillText('PHOTO CREW',202,158,538);
  const map=new THREE.CanvasTexture(sheet);map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map,roughness:.75});
}
function applyPlaque(parent,material,x,y,z,w,yaw){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,w*208/768),material);
  mesh.position.set(x,y,z);mesh.rotation.y=yaw;parent.add(mesh);
}
function wheel(root,x,z){
  const knuckle=group(root,'Wheel steering pivot',x,.255,z),roll=group(knuckle,'Wheel hub');
  const side=Math.sign(x);
  rigid(roll,(p)=>{
    const axle=[0,0,pi/2];
    p('disc',rubber,0,0,0,.235,.186,.235,axle);
    p('disc',0x474849,.086*side,0,0,.197,.024,.197,axle);
    p('disc',ivory,.105*side,0,0,.144,.020,.144,axle);
    p('disc',brass,.12*side,0,0,.061,.02,.061,axle);
    for(let j=0;j<20;j++){
      const a=j*tau/20;
      p('box',0x2a2d30,0,.233*Math.cos(a),.233*Math.sin(a),.182,.029,.049,[a,0,(j%2?1:-1)*.12]);
    }
    for(let j=0;j<6;j++){
      const a=j*tau/6;
      p('disc',dash,.117*side,.098*Math.cos(a),.098*Math.sin(a),.017,.009,.017,axle);
    }
  });
  return {knuckle,roll};
}

export function createGolfCartModel(scene){
  const root=group(scene,'Villa Luce photographer’s golf cart');
  const body=group(root,'Coachwork');
  const wheels=[];
  for(const z of [-.76,.78])for(const x of [-.557,.557])wheels.push(wheel(root,x,z));
  mould(body,black,[[.243,1.15,2.14,-.007,.14],[.302,1.23,2.27,-.02,.145],[.348,1.22,2.22,-.018,.12]]);
  mould(body,green,[[.335,1.13,.59,-.826,.14],[.574,1.23,.68,-.811,.13],[.706,1.22,.625,-.823,.12],[.749,1.16,.59,-.812,.12]],.15);
  mould(body,green,[[.334,1.12,.70,.552,.11],[.475,1.21,.84,.574,.11],[.607,1.20,.82,.575,.10]]);
  mould(body,ivory,[[.604,1.16,.48,.269,.104],[.62,1.19,.50,.268,.103],[.694,1.15,.48,.262,.105]]);
  mould(body,piping,[[1.918,1.352,1.89,.016,.149],[1.951,1.374,1.91,.014,.156]]);
  mould(body,ivory,[[1.950,1.374,1.91,.014,.156],[1.992,1.358,1.90,.015,.16],[2.030,1.257,1.81,.015,.18]]);
  rigid(body,(p,bar)=>{
    p('box',dash,0,.35,-.12,1.14,.038,.80);
    for(let i=0;i<11;i++)p('box',black,0,.376,-.48+i*.063,1.06,.008,.012);
    for(const s of [-1,1]){
      bar(black,[s*.62,.256,-1.125],[s*.62,.27,-.77],.029);
      p('box',green,s*.586,.516,.53,.031,.192,.73);
      p('box',brass,s*.611,.59,.57,.018,.017,.66);
      bar(black,[s*.543,.516,.54],[s*.543,1.925,.665],.025);
      bar(black,[s*.54,.77,-.692],[s*.576,1.925,-.563],.024);
      bar(piping,[s*.535,.903,-.674],[s*.57,1.904,-.556],.009);
      bar(black,[s*.544,.673,.318],[s*.544,.815,.292],.026);
      bar(black,[s*.544,.815,.292],[s*.544,.818,-.02],.026);
      bar(black,[s*.544,.818,-.02],[s*.544,.688,-.063],.02);
      p('box',ivory,s*.517,.825,.119,.067,.044,.392);
      bar(brass,[s*.558,.663,-1.073],[s*.579,.700,-.63],.008);
      p('box',black,s*.388,.58,-1.128,.337,.136,.044);
      p('box',0xffe7a8,s*.379,.586,-1.153,.255,.085,.017);
      p('box',amber,s*.508,.582,-1.146,.029,.099,.023);
      p('box',0x8b4136,s*.495,.521,.993,.132,.064,.029);
      bar(metal,[s*.45,.355,.91],[s*.45,.372,1.135],.026);
      p('box',black,s*.61,.334,-.05,.07,.055,.624);
      for(const z of [-.78,.79])p('box',green,s*.534,.525,z,.257,.051,.495);
    }
    for(let i=-3;i<=3;i++)p('box',shadowGreen,i*.051,.483,-1.154,.028,.046,.008);
    p('box',black,0,.318,-1.156,1.154,.095,.098);
    p('box',metal,0,.358,-1.201,.89,.020,.017);
    p('box',black,0,.420,.971,1.02,.05,.35);
    bar(black,[-.565,.443,1.173],[.565,.443,1.173],.032);
    p('box',0xd9c9a5,0,.899,.496,1.083,.279,.10,[-.1,0,0]);
    p('box',ivory,0,.904,.453,1.036,.232,.057,[-.1,0,0]);
    for(let i=-4;i<=4;i++)p('box',stitching,i*.114,.905,.418,.006,.197,.005,[-.1,0,0]);
    p('box',shadowGreen,0,.793,-.655,1.115,.242,.15);
    p('box',dash,0,.988,-.633,1.098,.164,.093,[-.246,0,0]);
    p('box',black,.205,.982,-.573,.269,.084,.013,[-.246,0,0]);
    p('box',dash,0,1.075,-.644,1.06,.048,.179);
    p('box',black,-.267,1.121,-.656,.285,.108,.071,[-.32,0,0]);
    p('box',0x5b7768,-.267,1.126,-.610,.235,.068,.008,[-.32,0,0]);
    for(let i=0;i<5;i++)p('box',i===4?0x587365:0xd3ddb7,-.322+i*.029,1.129,-.603,.020,.029,.006,[-.32,0,0]);
    bar(metal,[-.32,.759,-.661],[-.32,1.146,-.539],.028);
    p('box',amber,-.016,1.006,-.579,.043,.047,.018,[-.246,0,0]);
    p('box',black,0,1.778,-.558,.237,.085,.041);
    p('box',0x9faeaa,0,1.779,-.535,.204,.061,.008);
    bar(black,[0,1.908,-.56],[0,1.808,-.562],.013);
    for(const x of [-.425,.394])bar(black,[x,.423,.702],[x,.497,.93],.024);
    // A ribbed camera case and two collapsed tripod legs sit in the luggage tray.
    p('box',0x384841,-.103,.664,.877,.779,.300,.387);
    p('box',0x2a3532,-.103,.795,.876,.79,.062,.394);
    for(let i=0;i<5;i++)p('box',0x48594e,-.399+i*.149,.826,.88,.035,.018,.328);
    for(const x of [-.354,.151]){
      p('box',brass,x,.735,1.075,.064,.075,.012);
      p('box',0x22312a,x,.833,.873,.040,.012,.348);
    }
    for(let i=0;i<3;i++)bar(black,[.384+i*.03,.50,.654],[.448+i*.029,1.015,1.102],.017);
    p('box',black,.474,1.023,1.103,.102,.08,.09);
  });
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(1.078,.838),
    new THREE.MeshStandardMaterial({color:0xb3d8c7,transparent:true,opacity:.071,side:THREE.DoubleSide,depthWrite:false,roughness:.23}));
  glass.position.set(0,1.486,-.604);glass.rotation.x=.11;body.add(glass);
  const signs=plaqueMaterial();
  applyPlaque(body,signs,-.607,.499,.548,.58,-pi/2);
  applyPlaque(body,signs,.607,.499,.548,.58,pi/2);
  applyPlaque(body,signs,0,.619,-1.145,.344,pi);
  applyPlaque(body,signs,-.102,.676,1.074,.397,0);

  const column=group(body,'Steering column',-.32,1.156,-.542);
  column.rotation.x=-.57;
  const steering=group(column,'Steering wheel');
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.178,.017,8,32),finish(black));steering.add(rim);
  rigid(steering,(p,bar)=>{
    p('disc',dash,0,0,0,.044,.038,.044,[pi/2,0,0]);
    p('disc',brass,0,0,.023,.023,.005,.023,[pi/2,0,0]);
    for(const a of [.18,pi-.18,1.5*pi])bar(dash,[0,0,0],[.171*Math.cos(a),.171*Math.sin(a),.005],.013);
  });

  const hands=group(steering,'Driver’s grips');
  rigid(hands,(p)=>{
    for(const s of [-1,1]){
      p('ball',0x413930,s*.163,.058,.016,.034,.045,.030,[0,0,s*-.30]);
      for(let i=0;i<3;i++)p('ball',0x966c4e,s*(.160+i*.005),.075-i*.015,-.004,.022,.009,.020);
      p('ball',0xa17c5e,s*.143,.052,.034,.017,.026,.016,[0,0,s*-.35]);
    }
  });
  const armParts=[];
  const wrists=[new THREE.Vector3(),new THREE.Vector3()];
  for(const s of [-1,1]){
    const sleeve=group(body,'Photographer’s sleeve');
    rigid(sleeve,(p)=>{
      p('rod',0x474f42,0,.50,0,.048,1,.048);
      p('rod',black,0,.95,0,.040,.10,.040);
    });
    armParts.push({s,sleeve,elbow:new THREE.Vector3(-.32+s*.213,.804,-.075)});
  }
  const axisY=new THREE.Vector3(0,1,0),delta=new THREE.Vector3();
  // Only the shell and mechanical parts can obstruct shots taken beside the parked cart.
  // The clear windscreen, decals and photographer's arms are deliberately omitted.
  const occluders=[];
  function collectOpaque(part){
    if(part===glass || part===hands || armParts.some(arm=>arm.sleeve===part))return;
    if(part.isMesh&&!part.material.map)occluders.push(part);
    for(const child of part.children)collectOpaque(child);
  }
  collectOpaque(root);
  root.visible=false;let spinAngle=0;
  function update({x,z,yaw,speed=0,steer=0,dt=0,driving=false,active=true}){
    root.visible=active;
    if(!active)return;
    root.position.set(x,0,z);root.rotation.y=yaw;
    const input=THREE.MathUtils.clamp(steer,-1,1);
    spinAngle=(spinAngle-speed*dt/.248)%tau;
    for(let i=0;i<wheels.length;i++){
      if(i<2)wheels[i].knuckle.rotation.y=input*.47;
      wheels[i].roll.rotation.x=spinAngle;
    }
    steering.rotation.z=input*.67;
    hands.visible=driving;
    for(let i=0;i<armParts.length;i++){
      const {s,sleeve,elbow}=armParts[i];sleeve.visible=driving;
      if(!driving)continue;
      const wrist=wrists[i].set(s*.166,.038,.033).applyEuler(steering.rotation).applyEuler(column.rotation).add(column.position);
      delta.subVectors(wrist,elbow);
      sleeve.position.copy(elbow);sleeve.scale.y=delta.length();sleeve.quaternion.setFromUnitVectors(axisY,delta.normalize());
    }
  }
  return {root,update,occluders};
}
