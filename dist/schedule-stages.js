// Judge Dean LLC
import * as THREE from 'three';
import { rigid, group, subject } from './day-props.js';

const cream=0xfbeecd, paper=0xf7edde, gold=0xc69a52, plum=0x713c51, sage=0x738572;
const wood=0x895c41, dark=0x3a3e40, silver=0xb8c6c7, pink=0xe8a9a1, green=0x50755c;
const tau=Math.PI*2;

// Raised paper, embossed edges and real printed fronts stay legible through the telephoto.
function page(parent,heading,detail,w,h,x,y,z,tilt=-.25,bg='#f7efda'){
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=620;
  const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,480,620);
  c.strokeStyle='#b9995a';c.lineWidth=4;c.strokeRect(18,18,444,584);c.lineWidth=1.5;c.strokeRect(29,29,422,562);
  c.textAlign='center';c.fillStyle='#586958';c.font='24px Georgia,serif';c.fillText('V I L L A   L U C E',240,107);
  c.fillStyle='#533c3b';c.font='italic 58px Georgia,serif';
  heading.split('\n').forEach((line,i)=>c.fillText(line,240,252+i*67,420));
  c.fillStyle='#71584e';c.font='23px Georgia,serif';c.fillText(detail,240,453,406);
  c.beginPath();c.moveTo(150,495);c.bezierCurveTo(205,450,238,533,264,489);c.bezierCurveTo(278,469,265,515,334,483);c.stroke();
  c.fillStyle='#a68179';for(const [a,b] of [[110,150],[143,146],[370,150],[337,146],[100,545],[380,545]]){c.beginPath();c.ellipse(a,b,16,5,-.48,0,tau);c.fill();}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,roughness:.9,side:THREE.DoubleSide}));
  mesh.position.set(x,y,z);mesh.rotation.x=tilt;parent.add(mesh);return mesh;
}
function flower(p,rail,x,y,z,r,color=pink){
  rail(green,[x,y-.28,z],[x,y,z],.012);
  p('ball',green,x-.047,y-.13,z,.074,.024,.031,[0,.3,.6]);
  for(let k=0;k<5;k++){const a=k*tau/5;p('gem',color,x+.49*r*Math.cos(a),y+.013,z+.49*r*Math.sin(a),r*.58,r*.42,r*.60);}
  p('ball',0xeac77f,x,y+.036,z,.32*r,.23*r,.32*r);
}
function table(p,w=1.48,d=.78,height=.87,color=wood){
  p('box',color,0,height,0,w,.075,d);
  for(const i of [-1,1])for(const j of [-1,1]){
    p('rod',wood,i*(w*.5-.08),height*.50,j*(d*.5-.07),.039,height,.039);
    p('disc',gold,i*(w*.5-.08),.087,j*(d*.5-.07),.041,.13,.041);
  }
}
function clothTable(p,height=.91){
  p('disc',0xddc7a6,0,height*.5,0,.64,height,.50);
  p('disc',cream,0,height,0,.68,.06,.54);
}
function coupe(p,x,y,z,f=.1){
  p('disc',silver,x,y,z,f*.64,f*.12,f*.64);
  p('rod',silver,x,y+f*.55,z,f*.09,f*1.05,f*.09);
  p('bowl',0xf2d995,x,y+f*1.28,z,f*.95,f*.61,f*.95);
  p('disc',0xc99758,x,y+f*1.61,z,f*.87,f*.055,f*.87);
}
function watchcase(g){
  rigid(g,(p)=>{
    table(p,1.46,.82);p('box',plum,0,.968,0,.79,.13,.42);p('box',0xc4b396,0,1.047,0,.72,.025,.35);
    p('box',plum,0,1.215,-.20,.79,.39,.053,[-.20,0,0]);p('box',cream,.01,1.218,-.157,.69,.30,.026,[-.20,0,0]);
    p('box',0x694a3d,-.16,1.072,.01,.11,.025,.32);
    p('disc',gold,-.16,1.096,.01,.102,.037,.102);p('disc',paper,-.16,1.117,.01,.082,.013,.082);
    p('box',dark,-.17,1.127,.012,.006,.009,.092,[0,-.47,0]);p('box',dark,-.142,1.129,.028,.061,.009,.009,[0,-.28,0]);
    for(const z of [-.08,.08]){p('box',gold,.17,1.078,z,.109,.04,.083);p('gem',0x34486b,.17,1.11,z,.037,.025,.034);}
  });
}
function invitation(g){
  rigid(g,(p,rail)=>{
    table(p,1.53,.86);p('box',sage,.01,.923,-.07,1.16,.025,.68);
    p('box',cream,-.30,.955,.12,.45,.019,.26,[0,.14,0]);p('disc',plum,-.29,.968,.12,.055,.014,.055);
    p('box',gold,.18,1.157,-.04,.43,.50,.046,[-.28,0,0]);
    flower(p,rail,-.51,1.23,-.02,.068);flower(p,rail,-.45,1.19,.04,.059,cream);
  });
  page(g,'The Wedding','Together with their families',.41,.475,.18,1.163,-.008,-.28);
}
function makeup(g){
  rigid(g,p=>{
    table(p,1.27,.51,.88,0xb09677);
    p('box',gold,0,1.31,-.18,.76,.78,.072);
    p('box',0x9fb6ae,0,1.31,-.12,.665,.69,.026);
    for(const side of [-1,1])for(let i=0;i<5;i++)p('ball',0xffebba,side*.354,1.002+i*.149,-.104,.032,.033,.025);
    for(let i=0;i<4;i++){p('rod',i%2?plum:dark,-.36+i*.054,.986,.12,.019,.13,.019,[0,0,(i-1)*.08]);p('ball',0xbaa387,-.36+i*.054,1.066,.12,.025,.041,.024);}
    p('disc',gold,.13,.928,.11,.080,.023,.080);p('disc',pink,.13,.946,.11,.069,.015,.069);
    p('rod',dark,.36,.967,.09,.026,.088,.026);p('skirt',0xbb6870,.36,1.038,.09,.023,.057,.023);
  });
}
function gown(g){
  rigid(g,(p,rail)=>{
    for(const x of [-.58,.58]){rail(gold,[x,.11,0],[x,2.02,0],.03);p('box',gold,x,.05,0,.10,.072,.55);}
    rail(gold,[-.59,1.99,0],[.59,1.99,0],.034);
    rail(wood,[-.29,1.64,0],[0,1.77,0],.022);rail(wood,[0,1.77,0],[.29,1.64,0],.022);
    p('ring',gold,0,1.90,0,.089,.09,.07);
    p('skirt',cream,0,.69,0,.43,.98,.325);
    p('ball',paper,0,1.40,0,.192,.24,.13);
    for(const k of [-1,1])rail(cream,[k*.12,1.52,.02],[k*.22,1.71,0],.027);
    p('disc',0x789db3,0,1.19,0,.174,.064,.135);p('gem',0x789db3,.15,1.16,.08,.1,.059,.032);
    for(const k of [-1,1]){p('ball',0xc2d1dc,k*.146,.099,.47,.066,.049,.133);p('rod',gold,k*.146,.057,.385,.021,.11,.020);}
  });
}
function lapel(g){
  rigid(g,(p,rail)=>{flower(p,rail,0,.10,0,.074,0xffd8c4);flower(p,rail,.05,.056,.008,.040,cream);p('box',gold,.027,.006,0,.096,.014,.014,[0,0,-.5]);});
}
function deskbook(g,label,signing){
  rigid(g,(p,rail)=>{
    table(p,1.34,.73,.87);p('box',plum,-.02,.925,-.04,.55,.050,.35,[0,.04,0]);
    p('box',cream,-.02,.957,-.04,.52,.014,.32);
    p('rod',gold,.45,1.03,-.06,.068,.24,.063);flower(p,rail,.45,1.29,-.06,.080);flower(p,rail,.52,1.25,-.12,.068,cream);
  });
  page(g,label,signing?'Marriage register':'With love',.244,.296,-.145,.973,-.04,-Math.PI/2);
  page(g,'Signatures','Villa Luce',.244,.296,.109,.974,-.04,-Math.PI/2);
}
function letter(g,vow){
  const w=vow?.31:.32,h=vow?.29:.265;
  rigid(g,p=>{p('box',vow?plum:cream,0,0,-.009,w+.023,h+.024,.022,[-.32,0,0]);if(vow)p('box',sage,-w*.47,-.025,.009,.014,h*.89,.009,[-.32,0,0]);});
  page(g,vow?'My vows':'My love',vow?'Today and always':'For you',w,h,0,0,.008,-.32);
}
function ringBox(g){
  rigid(g,p=>{
    p('box',plum,0,0,0,.225,.087,.16);
    p('box',cream,0,.046,.002,.199,.017,.14);
    p('box',plum,0,.104,-.072,.224,.142,.028,[-.24,0,0]);
    p('ring',gold,0,.096,.027,.050,.051,.051,[-.19,0,0]);
  });
}
function trays(g){
  rigid(g,p=>{
    p('disc',silver,0,0,0,.435,.032,.32);
    for(let i=0;i<7;i++){
      const a=i*tau/7,x=Math.cos(a)*.255,z=Math.sin(a)*.177;
      p('disc',0xd39f62,x,.033,z,.071,.037,.058);p('ball',cream,x,.070,z,.056,.031,.044);
      p('ball',0xc94d3e,x+.017,.098,z,.038,.029,.036);p('gem',green,x-.012,.113,z-.013,.04,.009,.025);
    }
  });
}
function cloche(g){
  rigid(g,p=>{
    p('ball',silver,0,.007,0,.343,.215,.30);p('disc',silver,0,-.012,0,.354,.026,.311);
    p('ball',gold,0,.237,0,.045,.047,.045);
  });
}
function dessert(g){
  rigid(g,(p,rail)=>{
    clothTable(p,.85);p('disc',gold,0,.911,0,.36,.044,.36);
    for(let j=0;j<5;j++){
      const count=9-j,r=.251-j*.052;
      for(let k=0;k<count;k++){
        const a=tau*k/count+j*.5,x=r*Math.cos(a),z=r*Math.sin(a),y=.954+j*.087,c=[pink,0xadc29e,0xf4c6a2][(j+k)%3];
        p('disc',c,x,y,z,.065,.036,.058);p('disc',cream,x,y+.022,z,.06,.015,.053);p('disc',c,x,y+.043,z,.065,.027,.058);
      }
    }
    p('gem',gold,0,1.44,0,.046,.067,.046);
    for(let i=0;i<36;i++){
      const a=i/36*tau*2.1,b=(i+1)/36*tau*2.1,r=.33*(1-i/45),r2=.33*(1-(i+1)/45);
      rail(gold,[Math.cos(a)*r,.945+i*.013,Math.sin(a)*r],[Math.cos(b)*r2,.945+(i+1)*.013,Math.sin(b)*r2],.006);
    }
  });
}
function champagne(g){
  rigid(g,p=>{
    clothTable(p,.82);
    for(let tier=0;tier<3;tier++){
      const n=3-tier;
      for(let row=0;row<n;row++)for(let col=0;col<n;col++){
        coupe(p,(col-(n-1)/2)*.18,.87+tier*.171,(row-(n-1)/2)*.18,.109);
      }
    }
  });
}
function pennants(g,forDance=false){
  rigid(g,(p,rail)=>{
    const width=forDance?1.52:1.66,height=forDance?2.28:2.51;
    for(const side of [-1,1]){
      rail(wood,[side*width,0,-.82],[side*width,height,-.82],.044);
      for(let i=0;i<3;i++)flower(p,rail,side*(width-.1*i),height-.05*i,-.8,.073,[pink,cream,sage][i]);
    }
    const point=u=>[(u-.5)*width*2,height-.21*Math.sin(Math.PI*u),-.82];
    for(let i=0;i<13;i++){
      const a=point(i/13),b=point((i+1)/13);rail(gold,a,b,.009);
      const mid=point((i+.5)/13);
      if(forDance){p('ball',0xffde90,mid[0],mid[1]-.035,mid[2],.045,.059,.045);}
      else p('gem',[pink,sage,cream][i%3],mid[0],mid[1]-.12,mid[2],.082,.141,.015);
    }
  });
}
function roseUrn(g){
  rigid(g,(p,rail)=>{
    p('bowl',gold,0,.25,0,.22,.38,.22);p('disc',gold,0,.052,0,.25,.09,.25);
    for(let i=0;i<9;i++){const a=tau*i/9;flower(p,rail,Math.cos(a)*.21,.55+(i%3)*.07,Math.sin(a)*.19,.112,[cream,pink,0xd3ac8a][i%3]);}
  });
}
// Each petal/ray is a real instanced mesh and appears in the camera exposure.
function particles(parent,sparks){
  const n=sparks?94:82;
  const geo=sparks?new THREE.CylinderGeometry(1,1,1,5):new THREE.BoxGeometry(1,1,1);
  const mat=sparks?new THREE.MeshBasicMaterial({color:0xffffff}):new THREE.MeshStandardMaterial({color:0xffffff,roughness:.84});
  const mesh=new THREE.InstancedMesh(geo,mat,n);
  const dummy=new THREE.Object3D();
  for(let i=0;i<n;i++)mesh.setColorAt(i,new THREE.Color((sparks?[0xfff4b2,0xffc976,0xffe4a3]:[cream,pink,0xf2c85e,sage,0xdb8783])[i%(sparks?3:5)]));
  mesh.frustumCulled=false;parent.add(mesh);
  return t=>{
    for(let i=0;i<n;i++){
      const side=i%2?1:-1,life=(i*.31877+t*(sparks?1.76:.49))%1;
      const angle=i*2.399963+t*(sparks?.58:.12);
      if(sparks){
        const originZ=i%4<2?-.86:.86,dist=life*.42;
        dummy.position.set(side*.81+Math.cos(angle)*dist,1.95+Math.sin(angle)*dist-.25*life*life,originZ+Math.sin(i*.71)*dist);
        dummy.rotation.set(0,0,angle-Math.PI/2);const size=(1-life)*.006+.002;
        dummy.scale.set(size,.037+.076*(1-life),size);
      }else{
        dummy.position.set(side*(1.50-1.04*life)+.38*Math.cos(angle+life*2),.64+1.97*Math.sin(life*Math.PI)+life*.21,(i%7)*.30-.90+Math.sin(angle)*.31);
        dummy.rotation.set(angle+life*2,i*1.2+life*8,angle*.6);dummy.scale.set(.033,.005,.048);
      }
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  };
}
function buildStation(e,scene,world){
  const g=group(world,e.title,e.x,.025,e.z);
  const focus=(node,x,y,z,r)=>subject(node,e.title,x,y,z,r);
  let targets=[],move=null;
  const face=name=>scene.getObjectByName(name+' · face');
  function faces(...names){targets=names.map(face).filter(Boolean);}
  function piece(name,x=0,y=0,z=0){return group(g,name,x,y,z);}
  switch(e.id){
    case 'invitations':
      invitation(g);targets=[focus(g,.06,1.09,.045,.33)];break;
    case 'makeup':
      makeup(g);targets=[focus(g,-.02,1.31,-.09,.37)];break;
    case 'gown':
      gown(g);targets=[focus(g,0,1.10,0,.72)];break;
    case 'cufflinks':
      watchcase(g);targets=[focus(g,-.07,1.13,.0,.27)];break;
    case 'boutonniere':{
      const pinned=piece('Rose and lapel pin',-.103,1.35,.134);lapel(pinned);
      targets=[focus(pinned,.015,.056,0,.118)];
      move=(_t,s)=>{pinned.rotation.z=.12+.38*(1-THREE.MathUtils.smoothstep(s,-5,.5));};
      break;
    }
    case 'firstlook':case 'party':{
      const arrangement=piece('Garden urn',e.id==='firstlook'?-1.12:1.90,0,-.56);roseUrn(arrangement);
      faces('The bride','The groom');break;
    }
    case 'letters':case 'vows':{
      const book=piece('Hand-lettered pages',-.16,1.22,.19);letter(book,e.id==='vows');
      targets=[focus(book,0,0,.014,.215)];
      move=(t,s)=>{book.rotation.y=.16+.09*Math.sin(t*.42);book.rotation.x=-.11+.12*Math.sin(t*.60);book.position.y=1.22+.053*Math.exp(-s*s/14);};
      break;
    }
    case 'guestbook':case 'signing':{
      deskbook(g,e.id==='signing'?'The register':'Our guests',e.id==='signing');
      const pen=piece('Fountain pen',.09,1.006,.075);
      rigid(pen,(p,rail)=>{rail(dark,[-.053,0,.044],[.072,.15,-.021],.011);p('gem',gold,-.058,-.002,.043,.010,.017,.009);});
      targets=[focus(g,0,.97,0,.31)];
      move=t=>{pen.position.x=.075+.039*Math.sin(t*1.7);pen.position.z=.06+.018*Math.cos(t*3.1);};
      break;
    }
    case 'processional':
      faces('The bride','Best man');break;
    case 'exchange':{
      const box=piece('Open ring box',.014,1.12,.13);ringBox(box);
      targets=[focus(box,0,.075,.02,.14)];move=(t,s)=>{box.rotation.y=.23+.15*Math.sin(t*.63);box.position.y=1.12+.09*Math.exp(-s*s/14);};
      break;
    }
    case 'confetti':
      faces('The bride','The groom');move=particles(g,false);break;
    case 'cocktails':{
      champagne(g);
      const bottle=piece('Champagne bottle',-.28,1.68,-.03);
      rigid(bottle,p=>{p('disc',green,0,0,0,.052,.22,.052);p('skirt',green,0,.137,0,.052,.068,.052);p('disc',gold,0,.203,0,.021,.087,.021);p('disc',cream,0,-.023,0,.054,.071,.054);});
      const stream=piece('Champagne pour',-.103,1.54,-.01);
      rigid(stream,p=>p('rod',0xe1b668,0,0,0,.012,.35,.012));
      targets=[focus(g,0,1.20,0,.37)];
      move=(t,s)=>{const pour=Math.exp(-s*s/20);bottle.rotation.z=-1.50-.68*pour;stream.visible=pour>.30;stream.scale.y=.65+.27*Math.sin(t*8)**2;};
      break;
    }
    case 'canapes':{
      const tray=piece('Canapé tray',0,1.13,0);trays(tray);targets=[focus(tray,0,.065,0,.34)];
      move=(_t,s)=>{tray.position.set(.64*Math.sin(s*.26)-.20,1.13+.018*Math.cos(s*2),.34*Math.cos(s*.26)+.045);};break;
    }
    case 'lake':
      faces('The bride','The groom');break;
    case 'entrance':
      pennants(g);faces('The bride','The groom');break;
    case 'dinner':{
      rigid(g,p=>{clothTable(p,.83);p('disc',cream,0,.881,0,.344,.029,.300);p('ball',0xac6843,-.033,.949,.034,.141,.046,.092);for(let i=0;i<5;i++)p('gem',green,.065+i*.022,.937,-.032-i*.008,.049,.029,.044);});
      const dome=piece('Serving cloche',0,.915,0);cloche(dome);targets=[focus(g,0,1.01,0,.36)];
      move=(_t,s)=>{const lift=Math.exp(-s*s/14);dome.position.y=.919+.47*lift;dome.position.x=-.16*lift;dome.rotation.z=.32*lift;};break;
    }
    case 'firstdance':
      faces('The bride','The groom');break;
    case 'dessert':
      dessert(g);targets=[focus(g,0,1.17,0,.34)];break;
    case 'lastdance':
      pennants(g,true);faces('The bride’s aunt','The saxophonist');break;
    case 'sparklers':
      rigid(g,(p,rail)=>{for(const side of [-1,1])for(const z of [-.86,.86])rail(silver,[side*1.06,1.58,z],[side*.81,1.95,z],.006);});
      faces('The bride','The groom');move=particles(g,true);break;
    default:g.removeFromParent();return null;
  }
  g.visible=false;
  return {g,targets,move};
}
export function buildScheduleStages(scene,events){
  const world=group(scene,'Wedding itinerary stations');
  const permanent=new Set(['invitations','makeup','gown','cufflinks']);
  const all=new Map();
  for(const e of events){
    const station=buildStation(e,scene,world);
    if(station)all.set(e.id,{...station,event:e,permanent:permanent.has(e.id)});
  }
  return {
    update(t,active){
      world.visible=Boolean(active);
      if(!world.visible)return;
      for(const {event,g,move,permanent} of all.values()){
        g.visible=permanent||(t>=event.start-3&&t<=event.end+2);
        if(g.visible&&move)move(t,t-event.peak);
      }
    },
    targets(id){
      const s=all.get(id);
      return world.visible&&s?.g.visible?s.targets:[];
    }
  };
}
