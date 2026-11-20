// Wedding-day set pieces · Judge Dean LLC
import * as THREE from 'three';
import { buildReceptionCake } from './reception-cake.js';

const tau = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const smooth = (t, a, b) => THREE.MathUtils.smoothstep(t, a, b);
const cream=0xffecd0, gold=0xcd9e59, ink=0x302d32, rose=0xd4797d;
const material=new THREE.MeshStandardMaterial({color:0xffffff, roughness:.64, metalness:.10, flatShading:true});
const shapes={
  box:new THREE.BoxGeometry(1,1,1),
  skirt:new THREE.CylinderGeometry(.24,1,1,18),
  bowl:new THREE.CylinderGeometry(1,.45,1,18),
  disc:new THREE.CylinderGeometry(1,1,1,24),
  rod:new THREE.CylinderGeometry(1,1,1,8),
  ball:new THREE.SphereGeometry(1,14,9),
  gem:new THREE.IcosahedronGeometry(1,0),
  ring:new THREE.TorusGeometry(1,.16,6,18)
};
const helper=new THREE.Object3D();
const axisY=new THREE.Vector3(0,1,0);

// Batch rigid details by geometry, so a hundred cake pearls can share one draw call.
export function rigid(parent, design) {
  const bins=new Map();
  function place(shape,color,x,y,z,sx,sy,sz,rotation) {
    helper.position.set(x,y,z);
    helper.scale.set(sx,sy,sz);
    if(rotation?.isQuaternion) helper.quaternion.copy(rotation);
    else helper.rotation.set(...(rotation || [0,0,0]));
    helper.updateMatrix();
    if (!bins.has(shape)) bins.set(shape,[]);
    bins.get(shape).push([helper.matrix.clone(), color]);
  }
  function rail(color, a, b, r) {
    const delta=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const length=delta.length();
    const q=new THREE.Quaternion().setFromUnitVectors(axisY,delta.normalize());
    place('rod',color,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,length,r,q);
  }
  design(place,rail);
  for(const [shape, entries] of bins) {
    const parts=new THREE.InstancedMesh(shapes[shape], material, entries.length);
    entries.forEach(([matrix,color],i)=>{
      parts.setMatrixAt(i,matrix);
      parts.setColorAt(i,new THREE.Color(color));
    });
    parts.castShadow=true;
    parts.receiveShadow=true;
    parent.add(parts);
  }
}
export function group(parent,name,x=0,y=0,z=0) {
  const node=new THREE.Group();
  node.name=name;
  node.position.set(x,y,z);
  parent.add(node);
  return node;
}
export function subject(parent,name,x,y,z,radius) {
  const p=new THREE.Object3D();
  p.name=name;
  p.userData.radius=radius;
  p.position.set(x,y,z);
  parent.add(p);
  return p;
}

function makeVeil(parent) {
  const root=group(parent,'Windblown veil');
  const nu=25,nv=9,indices=[],colors=[],uvs=[];
  const positions=new Float32Array(nu*nv*3);
  for(let j=0;j<nv;j++) for(let i=0;i<nu;i++) {
    const lace=j===0 || j===nv-1 || i===nu-1 || i===0;
    const eyelet=(i%4===0 && (j===1 || j===nv-2));
    const color=new THREE.Color(lace?0xffe2b6:eyelet?0xebbca8:0xfff9df);
    colors.push(color.r,color.g,color.b);
    uvs.push(i/(nu-1),j/(nv-1));
    const k=j*nu+i;
    if(i+1<nu && j+1<nv) indices.push(k,k+1,k+nu,k+1,k+nu+1,k+nu);
  }
  const geo=new THREE.BufferGeometry();
  const pos=new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position',pos);
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(indices);
  const net=document.createElement('canvas');
  net.width=384; net.height=160;
  const lace=net.getContext('2d');
  lace.fillStyle='rgba(255,253,246,.42)';lace.fillRect(0,0,384,160);
  lace.strokeStyle='rgba(255,251,234,.46)';lace.lineWidth=1;
  lace.beginPath();
  for(let k=-160;k<550;k+=10) {
    lace.moveTo(k,0);lace.lineTo(k+112,160);
    lace.moveTo(k,0);lace.lineTo(k-112,160);
  }
  lace.stroke();
  // The woven net and scalloped flower edging follow the animated cloth mesh.
  for(const side of [-1,1]) {
    const edge=side===1?0:160;
    lace.strokeStyle='#fff7e0';lace.lineWidth=2.4;lace.beginPath();
    for(let x=0;x<384;x+=24) {
      lace.moveTo(x,edge+side*2);
      lace.quadraticCurveTo(x+12,edge+side*19,x+24,edge+side*2);
    }
    lace.stroke();
    lace.fillStyle='#fff7e8';
    for(let x=12;x<384;x+=24) for(let j=0;j<5;j++) {
      const a=j*tau/5;
      lace.beginPath();lace.arc(x+3*Math.cos(a),edge+side*14+3*Math.sin(a),1.9,0,tau);lace.fill();
    }
  }
  const weave=new THREE.CanvasTexture(net);weave.colorSpace=THREE.SRGBColorSpace;
  const fabric=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({
    map:weave,vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.88,depthWrite:false,roughness:.95
  }));
  geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(.28,0,0),1.62);
  root.add(fabric);
  const target=subject(root,'Loose bridal veil',.16,0,0,.42);
  function move(t) {
    const gust=smooth(t,10,21.8)*(1-smooth(t,22.6,32));
    root.position.set(-16.65+gust*1.57,1.63+gust*1.06+.08*Math.sin(t*1.6),9+.21*Math.sin((t-22)*.58));
    root.rotation.set(-.05+.16*Math.sin(t*.62),.11*Math.sin(t*.7),.37-.55*gust);
    for(let j=0;j<nv;j++) for(let i=0;i<nu;i++) {
      const u=i/(nu-1),v=j/(nv-1)*2-1;
      const wave=u*6.6-t*3.3;
      const width=.09+.33*Math.sin(Math.PI*u*.80);
      const fringe=Math.cos(u*12*Math.PI)*Math.pow(Math.abs(v),5)*.032;
      pos.setXYZ(j*nu+i,
        (u-.35)*1.48+.07*v*Math.cos(wave),
        .14*Math.sin(wave)+.22*Math.cos(u*4.2)+v*(width+fringe)*.79,
        .11*Math.cos(wave*.83)+v*(width+fringe)*.68+.10*Math.cos(v*4+wave));
    }
    pos.needsUpdate=true;
    geo.computeVertexNormals();
  }
  return {root,targets:[target],move,from:0,to:34};
}

function makeRingHound(parent) {
  const root=group(parent,'Tuxedo ring hound'),body=group(root,'Trotting body');
  const chestnut=0x9f5032, tan=0xd18a51, mask=0x58352c;
  rigid(body,(p,rail)=>{
    p('ball',chestnut,0,.278,0,.15,.14,.36);
    p('ball',chestnut,0,.385,.25,.125,.16,.135);
    p('ball',chestnut,0,.487,.318,.138,.15,.155);
    p('ball',tan,0,.446,.451,.094,.067,.14);
    p('ball',ink,0,.468,.558,.069,.042,.044);
    p('ball',0xefe4cf,0,.34,.263,.116,.166,.113,[.36,0,0]);
    for(const side of [-1,1]) {
      p('ball',mask,side*.122,.391,.296,.036,.143,.074,[.18,0,side*.12]);
      p('ball',ink,side*.102,.509,.391,.030,.033,.029);
      p('ball',cream,side*.107,.52,.411,.010,.010,.009);
      p('gem',ink,side*.057,.376,.373,.068,.047,.027,[0,0,side*-.25]);
    }
    p('gem',gold,0,.377,.376,.026,.028,.016);
    rail(chestnut,[0,.31,-.31],[.034,.46,-.50],.031);
    rail(tan,[.034,.46,-.50],[.092,.52,-.57],.020);
    rail(cream,[0,.461,.52],[0,.39,.65],.009);
    // A velvet pillow hangs from a short loop clenched in the dog's mouth.
    p('box',0x972f48,0,.371,.662,.225,.078,.195,[-.18,0,0]);
    p('box',0xe5b77b,0,.373,.664,.230,.012,.200,[-.18,0,0]);
    for(const side of [-1,1]) {
      p('ring',gold,side*.042,.413,.674,.034,.034,.034,[-1.10,0,side*.2]);
      p('rod',gold,side*.109,.335,.754,.008,.068,.008);
    }
  });
  const legs=[];
  for(const side of [-1,1]) for(const fore of [-1,1]) {
    const leg=group(body,'Short leg',side*.09,.241,fore*.19);
    rigid(leg,p=>{
      p('ball',chestnut,0,-.085,0,.043,.106,.048);
      p('ball',tan,0,-.170,.020,.039,.05,.062);
    });
    legs.push({leg,phase:side===fore?0:Math.PI});
  }
  const target=subject(body,'Ring cushion',0,.391,.656,.20);
  root.scale.setScalar(1.27);
  function move(t) {
    const progress=clamp((t-54)*.27,-4.4,4.7);
    const track=(t-54)*.61;
    const stride=t*10.4;
    root.position.set(1+progress,.045,16+.56*Math.sin(track));
    root.rotation.y=Math.atan2(.27,.342*Math.cos(track));
    body.position.y=.025+.027*Math.cos(stride*2);
    body.rotation.x=.055*Math.cos(stride);
    for(const {leg,phase} of legs) leg.rotation.x=.61*Math.sin(stride+phase);
  }
  return {root,targets:[target],move,from:36,to:68};
}

function makeDisco(parent) {
  const root=group(parent,'Mirror-ball dance floor',22.65,0,2);
  const ball=group(root,'Turning mirror ball',0,3.82,0);
  rigid(root,(p,rail)=>{
    rail(ink,[0,3.94,0],[0,5.88,0],.011);
    p('disc',gold,0,4.12,0,.094,.06,.094);
  });
  // The same angled tiles that form the sphere give each band a broken reflection.
  rigid(ball,p=>{
    const shades=[0x96c7c2,0xc1cee0,0xedd8a8,0xf6ead6,0x9ea8bc,0xc297a0];
    for(let band=0;band<8;band++) {
      const lat=((band+.5)/8-.5)*Math.PI;
      const n=Math.max(5,Math.round(20*Math.cos(lat)));
      for(let i=0;i<n;i++) {
        const a=tau*(i+(band%2)*.5)/n;
        const radius=.30;
        p('box',shades[(band*11+i*13)%shades.length],
          radius*Math.cos(lat)*Math.sin(a),radius*Math.sin(lat),radius*Math.cos(lat)*Math.cos(a),
          .98*tau*radius*Math.cos(lat)/n,.114,.023,
          new THREE.Quaternion().setFromEuler(new THREE.Euler(-lat,a,0,'YXZ')));
      }
    }
  });
  const glow=new THREE.MeshBasicMaterial({transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide});
  const spots=new THREE.InstancedMesh(new THREE.CircleGeometry(1,12),glow,18);
  const hues=[0xf3b76a,0xe896ad,0x7ec1bc,0xdfa89f];
  for(let i=0;i<spots.count;i++) spots.setColorAt(i,new THREE.Color(hues[i%hues.length]));
  spots.frustumCulled=false;
  root.add(spots);
  function move(t) {
    ball.rotation.y=t*.96;
    for(let i=0;i<spots.count;i++) {
      const a=t*.48+i*2.4;
      const radius=1.1+(i%3)*.82;
      helper.position.set(Math.sin(a)*radius,.128+i*.0004,Math.cos(a)*radius);
      helper.rotation.set(-Math.PI/2,0,-a);
      helper.scale.set(.085+.045*(i%3),.25,1);
      helper.updateMatrix();
      spots.setMatrixAt(i,helper.matrix);
    }
    spots.instanceMatrix.needsUpdate=true;
  }
  return {root,targets:[],move,from:210,to:240};
}

function carShell(parent,sections,color) {
  // Each cross section follows the rounded fender corners, hood and sill.
  const contour=[[-.78,0],[-.96,.11],[-1,.44],[-.94,.77],[-.73,.97],
    [0,1],[.73,.97],[.94,.77],[1,.44],[.96,.11],[.78,0]];
  const vertices=[],indices=[];
  for(let s=0;s<sections.length;s++) {
    const [z,width,base,top]=sections[s];
    for(let j=0;j<contour.length;j++) {
      const [x,y]=contour[j];
      vertices.push(width*x,base+(top-base)*y,z);
      if(s>0) {
        const current=s*contour.length+j, next=s*contour.length+(j+1)%contour.length;
        indices.push(current,next,next-contour.length,current,next-contour.length,current-contour.length);
      }
    }
  }
  for(let i=1;i<contour.length-1;i++) {
    indices.push(0,i,i+1);
    const end=(sections.length-1)*contour.length;
    indices.push(end,end+i+1,end+i);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const body=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.44,metalness:.18,side:THREE.DoubleSide}));
  body.castShadow=body.receiveShadow=true;
  parent.add(body);
}

function makeGetaway(parent) {
  const root=group(parent,'Just Married getaway car');
  const mint=0x7ca894, chrome=0xddcdb0, glass=0x536e70;
  carShell(root,[[-1.56,.58,.37,.68],[-1.42,.74,.28,.80],[-1.10,.80,.26,.85],
    [-.62,.83,.25,.86],[.55,.83,.25,.86],[1.17,.78,.27,.82],[1.54,.65,.34,.67]],mint);
  carShell(root,[[-1.04,.66,.76,.80],[-.84,.69,.77,1.12],[-.56,.67,.78,1.42],
    [-.33,.65,.79,1.49],[.27,.64,.79,1.46],[.62,.70,.79,1.16],[.87,.71,.78,.83]],glass);
  carShell(root,[[-.70,.48,1.32,1.375],[-.55,.63,1.395,1.46],[-.28,.665,1.445,1.535],
    [.26,.64,1.422,1.51],[.40,.56,1.36,1.435]],cream);
  rigid(root,(p,rail)=>{
    for(const side of [-1,1]) {
      for(const z of [-.98,.98]) {
        const x=side*.752,y=.344,turn=[0,0,Math.PI/2];
        p('disc',ink,x,y,z,.295,.206,.295,turn);
        p('disc',cream,side*.852,y,z,.191,.018,.191,turn);
        p('disc',chrome,side*.868,y,z,.136,.022,.136,turn);
        p('ball',0xb1aba0,side*.883,y,z,.025,.086,.086);
      }
      rail(chrome,[side*.795,.73,-1.16],[side*.810,.73,1.07],.014);
      rail(mint,[side*.682,.82,-.92],[side*.58,1.39,-.55],.053);
      rail(cream,[side*.718,.82,.80],[side*.580,1.425,.29],.047);
      rail(mint,[side*.708,.82,-.12],[side*.617,1.454,-.12],.045);
      rail(chrome,[side*.813,.742,-.23],[side*.813,.742,-.05],.019);
      rail(chrome,[side*.704,.92,.55],[side*.866,.99,.60],.019);
      p('ball',mint,side*.872,1.01,.60,.069,.054,.070);
      p('ball',chrome,side*.476,.641,1.465,.153,.147,.106);
      p('ball',0xffedb4,side*.476,.651,1.52,.119,.114,.073);
      p('box',0xa44238,side*.544,.65,-1.466,.144,.118,.10);
      p('box',0xe6a46d,side*.544,.679,-1.518,.100,.042,.021);
    }
    for(const z of [-1.505,1.49]) p('box',chrome,0,.408,z,1.445,.096,.136);
    p('box',0x525452,0,.54,1.526,.46,.115,.029);
    for(let i=-2;i<=2;i++) p('box',chrome,0,.54+i*.019,1.544,.427,.009,.013);
    // A satin bow and crossed ribbons make the motorcar recognizable from the front, too.
    for(const side of [-1,1]) {
      rail(cream,[0,.77,1.23],[side*.61,.828,.72],.018);
      p('gem',rose,side*.103,.798,1.23,.14,.056,.079,[0,.3*side,.22*side]);
      rail(gold,[side*.41,1.48,-.5],[side*.41,1.54,-.3],.018);
      rail(gold,[side*.41,1.50,.25],[side*.41,1.54,.18],.018);
    }
    p('box',0xad7970,0,1.606,-.23,.76,.151,.445);
    p('box',0xb39268,-.07,1.73,-.21,.54,.12,.325);
    for(const x of [-.26,.22]) p('box',0x664b37,x,1.612,-.230,.041,.166,.456);
  });
  const label=document.createElement('canvas');
  label.width=512; label.height=180;
  const g=label.getContext('2d');
  g.fillStyle='#f4e5c5'; g.fillRect(0,0,512,180);
  g.strokeStyle='#a77164'; g.lineWidth=5; g.strokeRect(9,9,494,162);
  g.fillStyle='#6b5147'; g.textAlign='center'; g.font='italic 72px Georgia,serif';
  g.fillText('Just Married',256,111,470);
  const tex=new THREE.CanvasTexture(label);
  tex.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(.625,.22),new THREE.MeshStandardMaterial({map:tex,roughness:.9}));
  sign.position.set(0,.61,-1.57);
  sign.rotation.y=Math.PI;
  root.add(sign);

  const cans=[];
  for(let i=0;i<5;i++) {
    const endX=(i-2)*.205, endZ=-2.13-(i%3)*.16;
    const can=group(root,'Wedding tin can',endX,.102,endZ);
    rigid(can,p=>{
      p('disc',i%2?0xb4c5b5:chrome,0,0,0,.067,.142,.067,[Math.PI/2,0,.15]);
      for(const s of [-1,1]) p('disc',0xaea694,0,0,s*.072,.069,.014,.069,[Math.PI/2,0,0]);
    });
    const from=new THREE.Vector3((i-2)*.14,.427,-1.54);
    const line=new THREE.Mesh(shapes.rod,new THREE.MeshStandardMaterial({color:cream,roughness:.94}));
    root.add(line);
    cans.push({can,from,line,endX,endZ});
  }
  const target=subject(root,'Getaway car',0,1.07,-.32,.56);
  const delta=new THREE.Vector3();
  function move(t) {
    const depart=smooth(t,284,296);
    root.position.set(2.1,.045,17+11*depart);
    root.rotation.y=.05*Math.sin(Math.PI*depart);
    cans.forEach(({can,from,line,endX,endZ},i)=>{
      const rattle=Math.min(1,depart*7)*(1-smooth(t,294,297));
      can.position.set(endX+.056*rattle*Math.sin(t*12+i),.099+.115*rattle*Math.abs(Math.sin(t*8+i)),endZ);
      can.rotation.x=t*10*rattle;
      delta.subVectors(can.position,from);
      line.position.copy(from).addScaledVector(delta,.5);
      line.scale.set(.006,delta.length(),.006);
      line.quaternion.setFromUnitVectors(axisY,delta.normalize());
    });
  }
  return {root,targets:[target],move,from:254,to:297};
}

export function buildDayProps(scene) {
  const day=group(scene,'Wedding day props');
  day.visible=false;
  const cake=buildReceptionCake(scene,{group,subject,rigid});
  const props={
    veil:makeVeil(day), rings:makeRingHound(day),
    dance:makeDisco(day), getaway:makeGetaway(day)
  };
  const entries=Object.values(props);
  return {
    diveTarget:cake.diveTarget,
    update(t,active,daySeconds) {
      const cakeBeat=Number.isFinite(daySeconds)?daySeconds-552:(t-184)*(t<184?.5:11/13);
      cake.update(active?cakeBeat:-552);
      day.visible=Boolean(active);
      if(!day.visible) return;
      for(const item of entries) {
        item.root.visible=t>=item.from && t<=item.to;
        if(item.root.visible) item.move(t);
      }
    },
    targets(id) {
      if(id==='cake'&&day.visible)return cake.targets;
      const item=props[id];
      return day.visible && item?.root.visible ? item.targets : [];
    }
  };
}
