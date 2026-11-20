// Close-up geometry for Villa Luce’s newlyweds · Judge Dean LLC
import * as THREE from 'three';
import { DAY_EVENTS } from './day-timeline.js';
import { windAt } from './estate-wind.js';

const tau=Math.PI*2;
const mix=THREE.MathUtils.lerp;
const clamp=THREE.MathUtils.clamp;
const smooth=THREE.MathUtils.smoothstep;
const pearl=0xfff3de, gold=0xb88b4a;
const shade=(col,k)=>new THREE.Color(col).multiplyScalar(k);
const portraitMaterial = new THREE.MeshStandardMaterial({
  vertexColors:true, roughness:.8, metalness:0, side:THREE.DoubleSide
});
const silkNet=new THREE.MeshStandardMaterial({
  color:0xf8eeea, side:THREE.DoubleSide, transparent:true, opacity:.31,
  roughness:.84, depthWrite:false, forceSinglePass:true
});

// A regular surface with shared normals before it is baked into its moving body part.
function fabric(across, down, sample, colorAt) {
  const pos=[],rgb=[],indices=[];
  for(let j=0;j<=down;j++)for(let i=0;i<=across;i++){
    const u=i/across,v=j/down;pos.push(...sample(u,v));
    if(colorAt){const col=colorAt(u,v);rgb.push(col.r,col.g,col.b);}
    if(i>0&&j>0){
      const d=j*(across+1)+i,c=d-1,b=d-across-1,a=b-1;
      indices.push(a,b,c,b,d,c);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  if(colorAt)g.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
  g.setIndex(indices);g.computeVertexNormals();return g;
}
function cord(p,points,radii,col,sides=7){
  const curve=new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a)));
  const sections=(points.length-1)*3,frames=curve.computeFrenetFrames(sections,false);
  const g=fabric(sides,sections,(u,v)=>{
    const k=Math.round(v*sections),n=v*(radii.length-1),j=Math.min(Math.floor(n),radii.length-2);
    const radius=mix(radii[j],radii[j+1],n-j),pos=curve.getPointAt(v);
    return pos.addScaledVector(frames.normals[k],Math.cos(tau*u)*radius)
      .addScaledVector(frames.binormals[k],Math.sin(tau*u)*radius).toArray();
  });
  p.add(g,col);
}
const headRows=[
  [-.012,.038,.064,-.031],[.005,.055,.077,-.044],[.026,.074,.087,-.057],
  [.053,.083,.091,-.074],[.084,.095,.092,-.087],[.107,.101,.092,-.094],
  [.124,.102,.085,-.096],[.15,.104,.094,-.098],[.185,.103,.093,-.098],
  [.214,.093,.083,-.09],[.242,.064,.058,-.061],[.259,.006,.009,-.009]
];
function faceSection(y,groom){
  let j=0;while(j<headRows.length-2&&y>headRows[j+1][0])j++;
  const a=headRows[j],b=headRows[j+1],t=clamp((y-a[0])/(b[0]-a[0]),0,1);
  let rx=mix(a[1],b[1],t);
  if(groom)rx+=.007*(1-smooth(y,.05,.125));
  return [rx,mix(a[2],b[2],t),mix(a[3],b[3],t)];
}
function front(x,y,groom){
  const [rx,rz]=faceSection(y,groom),fraction=clamp(Math.abs(x)/rx,0,1);
  const cheek=.006*Math.exp(-((Math.abs(x)-.058)**2/.00064+(y-.091)**2/.00023));
  return rz*Math.pow(1-fraction*fraction,.48)+cheek;
}
function sculptHead(p,o,groom){
  const skin=new THREE.Color(o.skin),warm=skin.clone().lerp(new THREE.Color(groom?0x974c3d:0xc87561),.38);
  const stubble=skin.clone().lerp(new THREE.Color(0x37292b),.35);
  p.add(fabric(36,44,(u,v)=>{
    const a=(u-.5)*tau,y=mix(-.012,.259,v),[rx,,back]=faceSection(y,groom),x=Math.sin(a)*rx;
    return [x,y,Math.cos(a)>0?front(x,y,groom):Math.abs(Math.cos(a))*back];
  },(u,v)=>{
    const y=mix(-.012,.259,v),a=(u-.5)*tau;
    const blush=(Math.max(0,Math.cos(a))**.6)*Math.exp(-((Math.abs(a)-.63)**2/.095+(y-.095)**2/.0002));
    const col=skin.clone().lerp(warm,blush);
    if(groom){
      const beardLine=.032+.071*(Math.abs(Math.sin(a))**2.8);
      col.lerp(stubble,.73*(1-smooth(y,beardLine-.01,beardLine+.009)));
    }
    return col;
  }),0xffffff);
  for(const side of [-1,1]){
    p.oval([side*.099,.10,.002],[.016,.031,.016],o.skin,7,11,[0,0,-side*.12]);
    p.oval([side*.111,.101,.004],[.005,.016,.008],shade(o.skin,.74),5,8);
  }
  // The nose tapers into the brow, opens into two wings and turns underneath at the tip.
  const sections=[[.145,.011,.002],[.123,.010,.007],[.10,.013,.015],[.084,.017,.024],[.077,.019,.023],[.073,.023,.013],[.07,.014,.003]];
  p.add(fabric(10,sections.length-1,(u,v)=>{
    const [y,half,depth]=sections[Math.round(v*(sections.length-1))];
    const k=2*u-1,x=k*half;
    return [x,y+.004*Math.abs(k)*Math.max(0,(.095-y)/.025),front(x,y,groom)+depth*(1-k*k)-.0003];
  }),o.skin);
  for(const s of [-1,1]){
    p.oval([s*.013,.075,front(s*.013,.075,groom)+.008],[.0065,.004,.006],shade(o.skin,.95),6,9);
    p.oval([s*.012,.0725,front(s*.012,.0725,groom)+.013],[.0038,.0014,.0018],shade(o.skin,.5),4,8);
  }
}
function portraitEyes(p,o,groom){
  for(const s of [-1,1]){
    const ey=.1225,ex=.039,inner=.018,outer=.061;
    const shape=(x)=>Math.pow(Math.sin(Math.PI*clamp(x,0,1)),.78);
    const eyePoint=(u,v)=>{
      const x=s*mix(inner,outer,u),y=ey+.0018*(u-.5)+shape(u)*mix(-.0053,.0077,v);
      const z=front(x,y,groom)+.0015+.0022*shape(u)*Math.sin(v*Math.PI);
      return [x,y,z];
    };
    p.add(fabric(16,3,eyePoint),0xf0dfd1);
    const lens=(radius,col,offset)=>{
      p.add(fabric(16,3,(u,v)=>{
        const a=tau*u,x=s*ex+radius*v*Math.cos(a),y=ey+radius*.94*v*Math.sin(a);
        return [x,y,front(x,y,groom)+.004+offset];
      }),col);
    };
    lens(.0061,groom?0x372e27:0x4e6053,.0001);lens(.0030,0x241d1b,.00035);
    p.oval([s*ex-.0018,ey+.0017,front(s*ex-.0018,ey+.0017,groom)+.005],[.0015,.0015,.0008],0xfff4d9,4,6);
    for(const top of [true,false]){
      const pts=Array.from({length:7},(_,i)=>{const pt=eyePoint(i/6,top?1:0);pt[2]+=.0011;return pt;});
      cord(p,pts,top?[.0005,.0016,.0018,.0019,.0018,.0014,.0004]:[.0005,.001,.0012,.0012,.0012,.0008,.0003],
        top?shade(o.hair,.78):shade(o.skin,.80),5);
    }
  }
}
function brows(p,o,groom){
  for(const s of [-1,1]){
    p.add(fabric(9,2,(u,v)=>{
      const x=s*mix(.018,.067,u),arch=Math.sin(u*Math.PI*.96);
      const y=.143+.005*arch-.004*u+(v-.5)*mix(groom?.009:.007,.0014,u);
      return [x,y,front(x,y,groom)+.0017+.0006*Math.sin(v*Math.PI)];
    }),shade(o.hair,groom?1: .70));
  }
}
function lips(p,o,groom){
  const width=groom?.029:.028,base=groom?.049:.050;
  const point=(u,v,upper)=>{
    const k=u*2-1,abs=Math.abs(k),x=k*width;
    const line=base+.0030*k*k,lift=1-k*k;
    const peak=.0040+.0033*Math.exp(-((abs-.28)**2)/.02);
    const y=line+(upper?1:-1)*v*lift*(upper?peak:.0054);
    return [x,y,front(x,y,groom)+.0013+lift*(.0024+.0020*Math.sin(v*Math.PI))];
  };
  p.add(fabric(18,4,(u,v)=>point(u,v,true)),groom?0x824b41:0xb36762);
  p.add(fabric(18,4,(u,v)=>point(u,v,false)),groom?0x9f6054:0xd48479);
  const crease=Array.from({length:7},(_,i)=>{const a=point(i/6,0,true);a[2]+=.0008;return a;});
  cord(p,crease,[.00035,.00075,.0009,.001,.0009,.00075,.00035],groom?0x6a4039:0x935650,5);
}
function hair(p,o,groom){
  const root=(u,v,ridge=0)=>{
    const a=(u-.5)*tau;
    const forehead=Math.max(0,Math.cos(a));
    const edge=groom?1.93-.65*forehead-.15*Math.exp(-((Math.abs(a)-.85)**2)/.08)+.055*Math.sin(2*a+.65)*forehead:
      2.0-.84*forehead+.14*Math.sin(2*a+.35)*forehead+.07*Math.cos(a*4+.45)*forehead;
    const b=.015+v*edge;
    const twisted=Math.sin(13*b+1.2*Math.cos(3*a))+Math.cos(22*a+2.0*Math.sin(5*b+.7*Math.cos(a)));
    const curl=groom?.009*(.5+.25*twisted)**2*(1-.7*smooth(v,.79,1)):0;
    const grooves=(groom?.0015:.0021)*Math.cos(22*a+4.2*b)*Math.sin(b)**.6+curl;
    const sw=groom?.003:.004;
    return [Math.sin(a)*Math.sin(b)*(.123+grooves+ridge)+sw*(1-v),
      .134+Math.cos(b)*((groom?.146:.142)+curl)+ridge*.6,
      -.006+Math.cos(a)*Math.sin(b)*(.126+grooves+ridge)];
  };
  p.add(fabric(groom?94:62,groom?36:22,(u,v)=>root(u,v),(u,v)=>{
    const a=(u-.5)*tau;
    if(groom){
      const curl=Math.sin(23*v+.85*Math.cos(3*a))+Math.cos(22*a+2*Math.sin(8*v+.7*Math.cos(a)));
      const fade=smooth(v,.64,1)*(.20+.45*(1-Math.max(0,Math.cos(a))**3));
      return shade(o.hair,1.11+.32*curl).lerp(new THREE.Color(o.skin),fade);
    }
    return shade(o.hair,1.07+.105*Math.cos(22*a+7*v));
  }),0xffffff);
  if(groom)return;
  // Parallel swept ridges follow the side part back to the chignon.
  for(let i=0;i<7;i++){
    const pts=[];
    for(let j=0;j<=7;j++){
      const v=j/7,az=mix(-.018,.25+i*.054,v),lat=mix(.21+i*.034,.78+.19*(i/8),v);
      pts.push(root((az+.5)%1,lat,.0028));
    }
    cord(p,pts,[.0005,.0012,.002,.0023,.0023,.0021,.0016,.0007],shade(o.hair,1.09+i%3*.035),5);
  }
  // A twisted chignon with a narrow pearl comb at its left side.
  p.oval([0,.117,-.114],[.073,.054,.047],shade(o.hair,.85),10,20,[0,0,-.09]);
  for(let i=0;i<6;i++){
    const a=tau*i/6,pts=[];
    for(let j=0;j<7;j++){
      const b=a+j*.30;pts.push([.055*Math.cos(b),.117+.039*Math.sin(b),-.124-.030*Math.sin(j*Math.PI/6)]);
    }
    cord(p,pts,[.004,.009,.011,.012,.010,.008,.003],shade(o.hair,.88+i*.035),7);
  }
  for(const s of [-1,1]){
    const pts=[[s*.066,.21,.072],[s*.093,.174,.058],[s*.101,.134,.033],[s*.091,.111,.043],[s*.091,.085,.037]];
    cord(p,pts,[.008,.009,.007,.004,.0007],shade(o.hair,1.06),7);
    p.stick([s*.101,.076,-.001],[s*.103,.058,.001],.0019,.0016,gold,6);
    p.oval([s*.103,.052,.001],[.0055,.0085,.0055],pearl,6,9);
  }
  for(let i=0;i<8;i++){
    const a=i/7*1.25;
    p.oval([-.072+.061*(1-Math.cos(a)),.14+.030*Math.sin(a),-.101-.041*Math.sin(a)],[.0046,.0043,.0044],pearl,5,8);
  }
}
function bridalVeil(head){
  const cut=(u,v)=>{
    const a=(u-.5)*(1.80+.75*v),ring=.081+.112*v;
    const fold=.009*Math.cos(8*Math.PI*u+.7*v)*Math.sin(v*Math.PI*.8);
    return [Math.sin(a)*(ring+fold),.158-.58*v-.026*Math.cos(a)*v+.012*Math.cos(8*Math.PI*u)*v**4,
      -.063-(ring+fold)*Math.cos(a)-.050*v];
  };
  const across=32, down=14, cloth=fabric(across,down,cut);
  // The comb stays pinned. The hem can billow in either horizontal direction.
  const folds=Array.from({length:4},()=>new Float32Array(cloth.attributes.position.count*3));
  for(let j=0;j<=down;j++)for(let i=0;i<=across;i++){
    const u=i/across,v=j/down,free=v*v,k=3*(j*(across+1)+i);
    folds[0][k]=.104*free;
    folds[1][k+2]=.104*free;
    const phase=3.8*v+4.7*u;
    folds[2][k+1]=.016*free*Math.sin(phase);
    folds[3][k+1]=.016*free*Math.cos(phase);
  }
  cloth.morphTargetsRelative=true;
  cloth.morphAttributes.position=folds.map(offset=>new THREE.BufferAttribute(offset,3));
  const veil=new THREE.Mesh(cloth,silkNet);
  veil.name='Tulle veil';head.add(veil);
}
const veilOrigin=new THREE.Vector3(), breezeDirection=new THREE.Vector3(), veilRotation=new THREE.Quaternion();
export function animateVeil(veil,t,reduced){
  veil.getWorldPosition(veilOrigin);veil.getWorldQuaternion(veilRotation);
  const gust=reduced?0:windAt(veilOrigin.x,veilOrigin.z,t);
  breezeDirection.set(.93,0,.37).applyQuaternion(veilRotation.invert());
  const weights=veil.morphTargetInfluences;
  weights[0]=gust*breezeDirection.x;weights[1]=gust*breezeDirection.z;
  weights[2]=gust*Math.cos(2.3*t);weights[3]=gust*Math.sin(2.3*t);
}
export function makePortraitHead(part,head,o){
  const groom=o.role==='groom';
  sculptHead(part,o,groom);
  const eyes=part.positions.length;
  portraitEyes(part,o,groom);
  const mouth=part.positions.length;
  lips(part,o,groom);
  const end=part.positions.length;
  brows(part,o,groom);hair(part,o,groom);
  const mesh=part.mesh(head,portraitMaterial),pos=part.positions;
  const blink=new Float32Array(pos.length),smile=new Float32Array(pos.length);
  for(let i=eyes;i<mouth;i+=3)blink[i+1]=(.120-pos[i+1])*.96;
  for(let i=mouth;i<end;i+=3){
    const f=clamp(Math.abs(pos[i])/.03,0,1);
    smile[i]=Math.sign(pos[i])*.0034*f;smile[i+1]=.0061*f*f;smile[i+2]=-.0014*f;
  }
  mesh.geometry.morphTargetsRelative=true;
  mesh.geometry.morphAttributes.position=[new THREE.BufferAttribute(blink,3),new THREE.BufferAttribute(smile,3)];
  mesh.updateMorphTargets();
  if(!groom)bridalVeil(head);
  return mesh.morphTargetInfluences;
}

const smiling=DAY_EVENTS.filter(e=>['firstlook','kiss','portrait','lake','getaway'].includes(e.id));
export function updatePortraitExpressions(couple,t,phase,dayTime){
  const at=Number.isFinite(dayTime)&&phase==='weddingDay'?dayTime:t;
  let expression=.18;
  if(phase==='weddingDay'){
    const cue=smiling.find(e=>at>=e.start&&at<=e.end);
    if(cue)expression+=.80*smooth(at,cue.start,cue.peak)*(1-smooth(at,cue.peak,cue.end));
  }else if(phase==='bouquetTake')expression+=.62*smooth(t,20,23.5);
  for(let i=0;i<couple.length;i++){
    const blink=(at+i*1.53+.54)%(i?4.22:3.88);
    couple[i].expression[0]=1-smooth(Math.abs(blink-.11),.026,.11);
    couple[i].expression[1]=expression;
  }
}

function weddingSuit(p,o) {
  const wool=o.suit,satin=shade(wool,1.48),shirt=0xf9eee1;
  const shape=[[.779,.193,.137],[.83,.204,.140],[.99,.178,.125],[1.09,.185,.137],
    [1.225,.224,.151],[1.348,.237,.133],[1.401,.201,.103],[1.445,.080,.080]];
  p.profile(shape,wool,24);
  function point(x,y,lift=.0025){
    let k=0;while(k<shape.length-2&&y>shape[k+1][0])k++;
    const [ya,ra,da]=shape[k], [yb,rb,db]=shape[k+1],t=clamp((y-ya)/(yb-ya),0,1);
    return [x,y,mix(da,db,t)*Math.sqrt(Math.max(0,1-(x/mix(ra,rb,t))**2))+lift];
  }
  p.add(fabric(8,14,(u,v)=>{
    const y=mix(1.105,1.445,v),half=.015+.077*v-.020*smooth(v,.92,1);return point((2*u-1)*half,y,.006);
  }),shirt);
  p.profile([[1.406,.083,.079],[1.431,.079,.077],[1.451,.073,.071]],shirt,24);
  for(const s of [-1,1]){
    // Curved separately from the coat so the silk rolls all the way into the fastening.
    p.add(fabric(5,18,(u,v)=>{
      const y=mix(1.092,1.426,v),edge=.016+.072*v;
      const peak=.046*Math.sin(Math.PI*v)+.031*Math.exp(-((v-.71)**2)/.0023);
      return point(s*(edge+(peak+.015)*u),y,.009+.003*Math.sin(Math.PI*u));
    }),satin);
    const tip=point(s*.063,1.385,.017),fold=point(s*.073,1.434,.014),inner=point(s*.008,1.440,.019);
    p.poly([inner,fold,tip],0xe1d3c0);
    p.poly([inner,tip,point(s*.025,1.404,.018)],0xfff7e8);
    // A pinched center and broad outer edges give the bow its folded shape.
    p.add(fabric(7,6,(u,v)=>{
      const x=s*mix(.003,.059,u),h=mix(.006,.018,u);
      return point(x,1.400+(v-.5)*2*h+.002*u,.020+.007*Math.sin(v*Math.PI)+.0015*Math.cos(v*tau)*u);
    }),0x263037);
    p.stick(point(s*.129,.99,.006),point(s*.178,.989,.006),.0036,.003,shade(wool,.67),7);
  }
  p.oval(point(0,1.400,.024),[.011,.011,.008],0x313438,7,11);
  for(const y of [1.317,1.27,1.225])p.oval(point(0,y,.011),[.0037,.0037,.0025],0x6b655b,5,7);
  for(const y of [1.099,1.023])p.oval(point(.011,y,.012),[.010,.010,.0044],0x343738,5,9);
  p.poly([point(-.169,1.275,.009),point(-.145,1.303,.012),point(-.103,1.286,.012)],shirt);
  p.stick(point(-.172,1.275,.014),point(-.104,1.284,.014),.004,.004,satin,6);
  // Small spray and folded white rose on the other lapel.
  const root=point(.122,1.30,.017);
  p.stick(root,[root[0]-.006,root[1]+.061,root[2]],.0028,.0028,0x617158,6);
  for(const s of [-1,1])p.oval([root[0]+s*.009,root[1]+.027,root[2]+.002],[.006,.016,.003],0x667b60,5,8,[0,0,-s*.55]);
  for(let i=0;i<8;i++){
    const a=i*tau/8;
    p.oval([root[0]+.009*Math.cos(a),root[1]+.049+.009*Math.sin(a),root[2]+.007],
      [.011,.007,.006],i%2?0xf0debd:0xffedd4,5,8,[0,0,a+.5]);
  }
  p.oval([root[0],root[1]+.049,root[2]+.012],[.008,.007,.008],0xf1d2ad,6,9);
}
function bridalSilk(p,o){
  const satin=new THREE.Color(o.suit);
  p.add(fabric(52,18,(u,v)=>{
    const a=tau*(u-.5),flare=(1-v)**1.40,fold=Math.cos(a*14+v*.55)*.021*flare;
    const back=Math.max(0,-Math.cos(a));
    return [Math.sin(a)*(.158+.218*flare+fold), .066+.863*v+.010*flare*Math.cos(14*a),
      Math.cos(a)*(.116+.157*flare+fold)-(.19*back+.016)*flare];
  },(u,v)=>satin.clone().multiplyScalar(1-.065*(1-v)*(.5+.5*Math.cos(u*tau*14+v*.55)))),0xffffff);
  p.profile([[.90,.157,.119],[.971,.151,.116],[1.034,.148,.117],[1.175,.183,.148],[1.285,.175,.127],[1.333,.141,.105]],o.suit,28);
  p.profile([[1.296,.162,.110],[1.36,.183,.104],[1.414,.130,.080],[1.446,.065,.067]],o.skin,26);
  // A scalloped portrait neckline, raised straps and embroidered leaf sprays.
  const lace=0xfff3db,thread=0xd6c5ad;
  const chest=(x,y)=>.137*Math.sqrt(Math.max(0,1-(x/.180)**2))+.001+(1.29-y)*.105;
  for(const s of [-1,1]){
    const strap=[[s*.138,1.287,.083],[s*.154,1.331,.073],[s*.161,1.362,.045],[s*.153,1.393,.004],[s*.147,1.354,-.068]];
    cord(p,strap,[.010,.013,.011,.010,.012],lace);
    const pts=[];
    for(let i=0;i<11;i++){const u=i/10,x=s*.145*u,y=1.275+.037*Math.sin(u*Math.PI*.86)+.006*u;pts.push([x,y,chest(x,y)+.007]);}
    cord(p,pts,Array(11).fill(.0032),lace);
    for(let i=1;i<8;i++){
      const x=s*(.014+i*.016),y=1.256+.036*Math.sin(i*.34);
      p.oval([x,y,chest(x,y)+.010],[.004,.011,.003],lace,5,8,[0,0,s*.48]);
    }
    for(let row=0;row<2;row++){
      const pts=[];for(let i=0;i<5;i++){
        const u=i/4,x=s*(.046+.078*u+.009*row),y=1.03+.083*u+.068*row;
        pts.push([x,y,chest(x,y)+.002]);
        if(i&&i<4)p.oval([x+s*.002,y+.006,chest(x,y)+.005],[.005,.012,.0026],lace,5,8,[0,0,s*.63]);
      }
      cord(p,pts,[.0014,.002,.002,.002,.0011],thread,5);
    }
  }
  p.profile([[.967,.154,.119],[.987,.154,.119]],0xdbbf9d,24);
  const pearls=[];
  for(let i=0;i<15;i++){
    const a=(i/14-.5)*2.45,x=.103*Math.sin(a),y=1.359+.042*(1-Math.cos(a)),z=.098*Math.cos(a)+.01;
    pearls.push([x,y,z]);p.oval([x,y,z],[.0047,.005,.0044],pearl,5,8);
  }
  cord(p,pearls,Array(15).fill(.0014),gold,5);
}
export function weddingAttire(p,o){
  if(o.role==='bride')bridalSilk(p,o);else weddingSuit(p,o);
}
export { portraitMaterial };
