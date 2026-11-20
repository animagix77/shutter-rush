// Wedding party models and choreography · Judge Dean LLC
import * as THREE from 'three';
import { TOSS_RELEASE, TOSS_CATCH } from './bouquet-event.js';
import { createScheduleCast } from './schedule-cast.js';
import { makePortraitHead, weddingAttire, portraitMaterial, updatePortraitExpressions, animateVeil } from './portrait-models.js';
import { makeDayActors } from './day-actors.js';

const TAU = Math.PI * 2;
const surface = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.78,
  metalness: 0.025,
  flatShading: true,
  side: THREE.DoubleSide
});
const ivory = 0xfff5df;
const gold = 0xca9a54;
const ink = 0x252531;
const skinTones = [0xd99c77, 0x975f48, 0xe6b18e, 0xaa7153, 0x754632, 0xf0c0a1, 0xc38a6a];
const hairTones = [0x382923, 0x251d1e, 0x83533a, 0x342726, 0x201b1b, 0x9d744d, 0x51403c];
const tint = (color, factor) => new THREE.Color(color).multiplyScalar(factor);
const V = (a) => new THREE.Vector3(...a);

// Bake small garment, face, and jewellery details together by moving body part.
// Each head/arm remains articulable with one draw regardless of its detail.
export class Part {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
  }

  add(geometry, color, pos = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const quat = rotation.isQuaternion ? rotation : new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
    geometry.applyMatrix4(new THREE.Matrix4().compose(V(pos), quat, V(scale)));
    const rgb = new THREE.Color(color);
    const p = geometry.attributes.position, n = geometry.attributes.normal, colorAttribute = geometry.attributes.color;
    const index = geometry.index;
    const count = index ? index.count : p.count;
    for (let i = 0; i < count; i++) {
      const k = index ? index.getX(i) : i;
      this.positions.push(p.getX(k), p.getY(k), p.getZ(k));
      this.normals.push(n.getX(k), n.getY(k), n.getZ(k));
      if (colorAttribute) this.colors.push(rgb.r*colorAttribute.getX(k),rgb.g*colorAttribute.getY(k),rgb.b*colorAttribute.getZ(k));
      else this.colors.push(rgb.r, rgb.g, rgb.b);
    }
    geometry.dispose();
  }

  oval(pos, size, col, rings = 6, sides = 10, rot = [0, 0, 0]) {
    this.add(new THREE.SphereGeometry(1, sides, rings), col, pos, size, rot);
  }

  box(pos, size, col, rot = [0, 0, 0]) {
    this.add(new THREE.BoxGeometry(...size), col, pos, [1, 1, 1], rot);
  }

  stick(a, b, radiusA, radiusB, col, sides = 8) {
    const from = V(a), to = V(b), span = to.clone().sub(from);
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.clone().normalize());
    this.add(new THREE.CylinderGeometry(radiusB, radiusA, span.length(), sides), col,
      from.lerp(to, 0.5).toArray(), [1, 1, 1], rotation);
  }

  poly(points, col) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geom.computeVertexNormals();
    this.add(geom, col);
  }

  // Elliptical sections allow a shaped waist, sloping shoulders and draped hems.
  profile(rings, color, sides = 14, flutes = 0) {
    const vertices = [], faces = [];
    rings.forEach(([y, rx, rz, cz = 0], row) => {
      for (let i = 0; i < sides; i++) {
        const a = i * TAU / sides;
        const fold = 1 + (i % 2 ? flutes : -flutes);
        vertices.push(Math.sin(a) * rx * fold, y, cz + Math.cos(a) * rz * fold);
        if (row) {
          const last = (row - 1) * sides + i, next = (row - 1) * sides + (i + 1) % sides;
          faces.push(last, next, last + sides, next, next + sides, last + sides);
        }
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();
    this.add(geometry, color);
  }

  mesh(parent, material=surface) {
    const g = new THREE.BufferGeometry();
    for (const [name, values] of [['position', this.positions], ['normal', this.normals], ['color', this.colors]]) {
      g.setAttribute(name, new THREE.Float32BufferAttribute(values, 3));
    }
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

function sprig(p, x, y, z, size, color) {
  for (let a = 0; a < 5; a++) {
    const th = a * TAU / 5;
    p.oval([x + size * .50 * Math.cos(th), y + size * .46 * Math.sin(th), z],
      [size * .54, size * .52, size * .48], color, 3, 5);
  }
  p.oval([x, y, z + size * .32], [size * .45, size * .44, size * .5], tint(color, .76), 3, 6);
}

function makeBouquet() {
  const part = new Part();
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4, r = .024 * Math.sqrt(i);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = .16 + .032 * Math.cos(i * 1.7);
    part.stick([0, -.035, 0], [x, y + .01, z], .005, .004, 0x647754);
    part.oval([x * 1.5, y - .05, z * 1.5], [.022, .067, .016], i % 2 ? 0x849369 : 0x617851, 4, 5, [Math.sin(a) * .8, a, Math.cos(a) * .8]);
    sprig(part, x, y, z, .034, [0xffd3ba, 0xe58e7c, 0xfff0d5, 0xfdc2a4][i % 4]);
  }
  part.stick([0,-.04,0], [0,.045,0], .014,.018,0xdfb993);
  part.box([.017,-.06,-.008],[.015,.086,.007],ivory,[.3,0,.27]);
  // Two silk tails make the rotating stem legible from across the courtyard.
  for (const side of [-1, 1]) {
    const tip = [side*.085,-.105,.031], end = [side*.041,-.074,.009];
    part.poly([[-.009,.038,0],[.01,.044,.009],end], side<0 ? 0xffdeb6 : 0xd58c78);
    part.poly([[.01,.044,.009],tip,end], side<0 ? 0xffdeb6 : 0xd58c78);
  }
  const root = new THREE.Group();
  const bouquet = part.mesh(root);
  bouquet.name = 'Bridal bouquet';
  return bouquet;
}

function legsAndShoes(p, outfit, gowned, seated) {
  for (const side of [-1, 1]) {
    const x = side * .102;
    const knee = seated ? [x, .47, .29] : [x, .48, side * .019];
    const ankle = seated ? [x, .09, .26] : [x * 1.16, .09, side * .038];
    const fabric = gowned ? outfit.skin : tint(outfit.suit,.79);
    if (!gowned || seated) {
      p.stick([x, seated ? .50 : .91, -.014], knee, gowned ? .077 : .101, .069, fabric);
      p.stick(knee, ankle, .072, gowned ? .040 : .056, fabric);
      p.oval(knee, [.067,.067,.067], fabric, 5, 8);
    }
    p.oval([ankle[0], .058, ankle[2] + .044], [.065,.055,.126], gowned ? outfit.suit : 0x332923, 5, 9);
    p.box([ankle[0],.024,ankle[2] + .037],[.111,.023,.189],0x392e2a);
  }
}

// The walking guest and the dancers need ankles that can leave the ground.
const thighLength = .418, shinLength = .406, hipHeight = .873;
function movingLeg(root, side, outfit, gowned) {
  const hip = new THREE.Group(), knee = new THREE.Group(), ankle = new THREE.Group();
  hip.position.set(side * .105, hipHeight, -.004);
  knee.position.y = -thighLength;
  ankle.position.y = -shinLength;
  root.add(hip); hip.add(knee); knee.add(ankle);
  const upper = new Part(), lower = new Part(), shoe = new Part();
  const cloth = gowned ? outfit.skin : tint(outfit.suit, .79);
  upper.stick([0, 0, 0], [0, -thighLength, 0], gowned ? .077 : .099, .067, cloth);
  lower.oval([0, 0, 0], [.068, .068, .068], cloth, 5, 8);
  lower.stick([0, 0, 0], [0, -shinLength, 0], .069, gowned ? .04 : .056, cloth);
  shoe.oval([0, -.027, .044], [.065, .053, .126], gowned ? outfit.suit : 0x332923, 5, 9);
  shoe.box([0, -.064, .037], [.111, .023, .189], 0x392e2a);
  upper.mesh(hip); lower.mesh(knee); shoe.mesh(ankle);
  return {hip, knee, ankle};
}

function stepLeg({hip, knee, ankle}, forward, lift, pelvisY, toePitch) {
  const height = hipHeight + pelvisY - .076 - lift;
  const reach = Math.min(thighLength + shinLength - .0001, Math.hypot(height, forward));
  const angle = cosine => Math.acos(THREE.MathUtils.clamp(cosine, -1, 1));
  hip.position.y = hipHeight + pelvisY;
  hip.rotation.x = -Math.atan2(forward, height) -
    angle((thighLength ** 2 + reach ** 2 - shinLength ** 2) / (2 * thighLength * reach));
  knee.rotation.x = Math.PI -
    angle((thighLength ** 2 + shinLength ** 2 - reach ** 2) / (2 * thighLength * shinLength));
  ankle.rotation.x = toePitch - hip.rotation.x - knee.rotation.x;
}

// During the stance half of a stride, the shoe moves back as far as the hips
// travel forward. The returning foot lifts, then meets the ground heel first.
function walkingStep(leg, cycle, pelvisY) {
  const u = cycle % 1, halfStride = .185;
  const swing = u >= .5;
  const k = swing ? (u - .5) * 2 : u * 2;
  const progress = swing ? k * k * (3 - 2 * k) : k;
  const forward = swing ? halfStride * (progress * 2 - 1) : halfStride * (1 - progress * 2);
  const lift = swing ? .10 * Math.sin(k * Math.PI) ** 2 : 0;
  const toePitch = swing ? .18 * Math.sin(k * TAU) : 0;
  stepLeg(leg, forward, lift, pelvisY, toePitch);
}

function tailoredJacket(p, o, shift) {
  const jacket = o.suit;
  p.profile([[.78,.187,.121],[.83,.203,.135],[1.02,.181,.131],[1.20,.229,.146],[1.35,.244,.135],[1.41,.178,.102],[1.44,.084,.086]].map(r => [r[0]+shift,...r.slice(1)]), jacket);
  const point = (x,y,z) => [x,y+shift,z];
  p.poly([point(-.093,1.422,.083),point(.093,1.422,.083),point(0,1.123,.151)],0xfff4df);
  for (const s of [-1,1]) {
    const lapel = tint(jacket,1.21);
    p.poly([point(s*.105,1.421,.093),point(s*.16,1.335,.118),point(s*.09,1.285,.144)],lapel);
    p.poly([point(s*.09,1.285,.144),point(s*.142,1.29,.134),point(0,1.085,.149)],lapel);
    p.poly([point(s*.09,1.285,.144),point(0,1.085,.149),point(s*.105,1.421,.093)],lapel);
  }
  p.poly([point(-.066,1.404,.112),point(-.066,1.353,.128),point(0,1.38,.132)],ink);
  p.poly([point(.066,1.404,.112),point(.066,1.353,.128),point(0,1.38,.132)],ink);
  p.box(point(0,1.38,.134),[.033,.032,.016],ink);
  for(const y of [1.082, .989]) p.oval(point(.012,y,.142),[.012,.012,.008],tint(jacket,.4),4,7);
  p.box(point(-.134,1.256,.119),[.077,.012,.01],tint(jacket,.52),[0,-.45,0]);
  if(o.role === 'groom') {
    p.stick(point(-.114,1.26,.134),point(-.149,1.342,.131),.007,.005,0x74835d);
    sprig(p,-.14,1.328+shift,.142,.023,ivory);
  }
}

function gown(p,o,shift, seated) {
  const bride = o.role === 'bride', hem = bride ? .38 : .27;
  if (seated) {
    p.profile([[.31,.22,.12,.245],[.45,.239,.21,.135],[.54,.197,.206,.09],[.92+shift,.170,.12]],o.suit,18,.025);
  } else {
    p.profile([[.069,hem,.68*hem,-.019],[.21,hem*.94,.64*hem,-.018],[.53,hem*.78,.56*hem],[.82,.208,.144],[.92,.159,.117]],o.suit,24,bride ? .038 : .021);
  }
  p.profile([[.885,.163,.12],[1.016,.149,.114],[1.193,.191,.148],[1.308,.178,.127],[1.345,.147,.10]].map(([y,w,d])=>[y+shift,w,d]),o.suit);
  p.profile([[1.299,.167,.111],[1.357,.186,.102],[1.41,.134,.089],[1.446,.065,.067]].map(([y,w,d])=>[y+shift,w,d]),o.skin);
  for (const s of [-1,1]) {
    p.stick([s*.135,1.293+shift,.071],[s*.157,1.39+shift,.008],bride?.027:.021,bride?.027:.019,o.suit);
  }
  p.profile([[.967+shift,.155,.120],[.992+shift,.154,.119]],bride ? 0xe9cfab : tint(o.suit,.72),18);
  if (bride) {
    for(let k=0;k<12;k++) {
      const x = (k-5.5)*.024;
      p.oval([x,1.292+shift+.011*Math.abs(k-5.5),.134-.22*Math.abs(x)], [.016,.014,.008],ivory,4,6);
    }
  } else {
    p.stick([-.091,1.392+shift,.083],[0,1.336+shift,.116],.004,.005,gold,5);
    p.stick([0,1.336+shift,.116],[.091,1.392+shift,.083],.005,.004,gold,5);
    p.oval([0,1.33+shift,.119],[.010,.015,.007],gold,4,6);
  }
}

function coiffure(p,o,gowned) {
  const hair=o.hair;
  p.add(new THREE.SphereGeometry(1,14,7,0,TAU,0,Math.PI*.53),hair,[0,.146,-.006],[.111,.125,.103],[0,0,-.065]);
  p.oval([0,.126,-.068],[.105,.119,.057],hair,6,11);
  p.oval([-.093,.124,.024],[.018,.066,.047],hair,5,8,[0,0,-.045]);
  p.oval([.091,.118,.016],[.021,.062,.047],hair,5,8);
  if (o.style === 'curls') {
    for(let i=0;i<14;i++){
      const a=i*2.399,r=.023*Math.sqrt(i);
      p.oval([Math.sin(a)*r,.243-.035*(r/.085),Math.cos(a)*r-.005],
        [.041,.043,.041],tint(hair,1+(i%4)*.05),4,7);
    }
  } else {
    p.oval([-.021,.216,.031],[.102,.051,.081],hair,6,12,[0,-.2,.19]);
    p.oval([-.069,.187,.054],[.044,.053,.043],hair,5,9,[0,0,-.38]);
  }
  if(gowned && o.style!=='bob') {
    p.oval([0,.176,-.116],[.071,.068,.070],hair,6,10);
    if(o.role==='bride') {
      sprig(p,-.057,.202,-.104,.027,ivory);
      sprig(p,-.073,.208,-.081,.02,ivory);
      // A folded veil drapes behind the head; each panel catches a different light.
      for(let i=0;i<8;i++){
        const pos = (k,top) => {
          const a=(k/8-.5)*2.2;
          return top ? [Math.sin(a)*.092,.213,-.11-Math.cos(a)*.044] :
            [Math.sin(a)*.188,-.244-.031*Math.cos(a*3),-.15-Math.cos(a)*.077];
        };
        p.poly([pos(i,true),pos(i+1,true),pos(i,false)],i%2?0xf6ecda:0xe4dccb);
        p.poly([pos(i+1,true),pos(i+1,false),pos(i,false)],i%2?0xf6ecda:0xe4dccb);
      }
    }
  } else if (o.style==='bob'){
    for(const s of [-1,1]) p.oval([s*.093,.092,-.024],[.038,.113,.072],hair,6,9,[0,0,s*.075]);
  }
}

function face(p,o,gowned) {
  p.profile([[-.015,.051,.051],[.009,.071,.069],[.049,.092,.089],[.102,.101,.096],[.151,.10,.091],[.199,.097,.083],[.225,.069,.060],[.237,.03,.028]],o.skin,14);
  const dark=tint(o.skin,.53);
  for(const s of [-1,1]){
    p.oval([s*.098,.088,-.001],[.02,.035,.024],o.skin,5,8);
    p.oval([s*.041,.121,.087],[.022,.009,.006],0xf6e9dc,5,8,[0,s*.21,s*.056]);
    p.oval([s*.041,.121,.092],[.008,.009,.004],0x352c29,5,7);
    p.stick([s*.026,.144,.09],[s*.063,.146,.077],.006,.005,o.hair,5);
    if (gowned) p.oval([s*.108,.06,.004],[.008,.014,.009],gold,4,7);
  }
  p.oval([0,.089,.095],[.019,.026,.021],o.skin,4,7);
  p.stick([-.024,.052,.088],[0,.047,.096],.003,.0045,dark,5);
  p.stick([0,.047,.096],[.024,.052,.088],.0045,.003,dark,5);
  if(o.glasses){
    for(const s of [-1,1]){
      p.add(new THREE.TorusGeometry(.027,.004,4,9),0x49392f,[s*.04,.123,.096],[1.2,.82,1],[0,s*.22,0]);
      p.stick([s*.072,.124,.087],[s*.103,.122,.018],.004,.003,0x49392f,5);
    }
    p.stick([-.01,.125,.098],[.01,.125,.098],.004,.004,0x49392f,5);
  }
  coiffure(p,o,gowned);
}

function arm(body,s,o,gowned,seated) {
  const sh=new THREE.Group(), elbow=new THREE.Group(), hand=new THREE.Object3D();
  body.add(sh); sh.position.set(s*(gowned?.177:.216),1.33+(seated?-.43:0),0);
  sh.add(elbow); elbow.position.y=-.272; elbow.add(hand); hand.position.set(0,-.239,.013);
  const up=new Part(), low=new Part();
  const sleeve=gowned?o.skin:o.suit;
  up.oval([0,-.014,0],gowned?[.058,.065,.055]:[.073,.082,.077],sleeve);
  up.stick([0,-.023,0],[0,-.273,0],gowned?.053:.069,gowned?.040:.055,sleeve,10);
  low.oval([0,0,0],gowned?[.040,.042,.040]:[.055,.054,.054],sleeve);
  low.stick([0,0,0],[0,-.19,0],gowned?.039:.054,gowned?.029:.041,sleeve,9);
  if(!gowned) low.stick([0,-.186,0],[0,-.205,0],.041,.038,ivory,9);
  low.oval([0,-.235,.009],[.039,.062,.027],o.skin,6,9,[.12,0,0]);
  low.oval([-s*.029,-.22,.022],[.018,.034,.016],o.skin,5,7,[.24,0,-s*.22]);
  if (s===1 && o.glass) {
    low.stick([0,-.241,.041],[0,-.238,.115],.004,.005,0xe2d8bb,6);
    low.stick([0,-.24,.112],[0,-.23,.168],.013,.027,0xeec99a,8);
    low.oval([0,-.24,.041],[.024,.024,.0045],0xe4c9a7,4,8);
  }
  up.mesh(sh); low.mesh(elbow);
  return {sh,elbow,hand};
}

export function buildWeddingGuest(scene, record, index) {
  const [name,role,x,z,yaw,colors,skinId,style,seated=false,glass=false,glasses=false,scale=1,motion='idle'] = record;
  const o={role,suit:colors,skin:skinTones[skinId],hair:role==='grandma'?0xc2beb5:hairTones[skinId],style,glass,glasses};
  const gowned=['bride','dress','grandma'].includes(role);
  const root=new THREE.Group(), body=new THREE.Group(), head=new THREE.Group();
  root.name=name; root.position.set(x,0,z); root.rotation.y=yaw; root.scale.setScalar(scale);
  scene.add(root);root.add(body);body.add(head);
  const shift=seated?-.43:0;
  const part=new Part(), headPart=new Part();
  const walking = name === 'A dinner guest';
  const dancing = name === 'The dance partner' || name === 'The pianist' || motion==='dance';
  const legs = walking || dancing ? [-1, 1].map(side => movingLeg(root, side, o, gowned)) : [];
  // The original ceremony poses use planted feet. Keep those meshes for the replay,
  // and give the traveling principals a second, articulated pair for the day route.
  const traveling=['The bride','The groom','Grandma','Best man','The baker','The maître d’'].includes(name);
  let dayLegs=null,fixedLegs=null;
  if(traveling){
    const fixed=new Part();legsAndShoes(fixed,o,gowned,seated);fixedLegs=fixed.mesh(body);
    dayLegs=[-1,1].map(side=>movingLeg(root,side,o,gowned));
    dayLegs.forEach(({hip})=>hip.visible=false);
  }else if (!legs.length) legsAndShoes(part,o,gowned,seated);
  const newlywed=role==='bride'||role==='groom';
  if(newlywed)weddingAttire(part,o,new Part(),body);else if(gowned)gown(part,o,shift,seated);else tailoredJacket(part,o,shift);
  part.stick([0,1.38+shift,0],[0,1.526+shift,0],.068,.059,o.skin,10);
  part.mesh(body,newlywed?portraitMaterial:surface);
  head.position.y=1.494+shift;
  let expression=null;
  if(newlywed)expression=makePortraitHead(headPart,head,o);
  else{face(headPart,o,gowned);headPart.mesh(head);}
  const faceCenter = new THREE.Object3D();
  faceCenter.name=name+' · face';
  faceCenter.userData.radius=.23;
  faceCenter.position.set(0, .106, .052);
  head.add(faceCenter);
  const arms = [-1,1].map(s => arm(body,s,o,gowned,seated));
  return {
    root, body, head, faceCenter, expression, arms, legs, dayLegs, fixedLegs, walking, dancing, o, index, seated, gowned,
    seed:index*1.618, baseYaw:yaw, homeX:x, homeZ:z
  };
}

const party = [
  ['The bride','bride',-.53,-2.40,.68,0xf6e6cf,2,'chignon',false,false,false,1.015],
  ['The groom','groom',.54,-2.38,-.70,0x273b42,1,'curls',false,false,false,1.065],
  ['Maid of honor','dress',-1.95,-3.03,.59,0xb66658,4,'chignon',false,true,false,1.01],
  ['Best man','suit',1.95,-3.18,-.54,0x4d6058,5,'part',false,true,false,1.06],
  ['The officiant','suit',.15,-4.52,.13,0x555460,6,'part',false,false,true,.99],
  ['Aunt Lucia','dress',-2.2,.85,2.8,0xa15146,1,'bob',true,false,true,1],
  ['The flower girl’s father','suit',-3.05,.85,2.72,0x596875,0,'part',true,false,false,1.02],
  ['The bride’s cousin','dress',2.2,-.50,-2.84,0x607c79,3,'chignon',true,false,false,1.02],
  ['Uncle Luca','suit',3.05,-.50,-2.92,0x775745,2,'part',true,false,true,1],
  ['The groom’s sister','dress',2.2,2.2,-2.76,0xb79052,5,'bob',true,false,false,.97],
  ['The college roommate','suit',3.9,3.55,-2.83,0x555d60,4,'curls',true,false,false,1.025],
  ['The family friend','dress',-3.05,3.55,2.83,0x65764d,3,'curls',true,false,false,1.01],
  ['The toastmaster','suit',-5.22,2.72,1.3,0x6e684d,6,'part',false,true,true,1.07],
  ['The florist','dress',5.30,1.28,-1.5,0xae756c,0,'bob',false,true,false,1.025],
  ['A dinner guest','suit',6.15,2.03,Math.PI/2,0x43586a,3,'part',false,false,false,1.04],
  ['The dance partner','dress',-6.52,-1.42,1.35,0x956c45,5,'chignon',false,true,false,1.015],
  ['The pianist','suit',-5.74,-1.75,-1.08,0x3e444d,1,'curls',false,true,false,1.06],
  ['Grandma','grandma',.71,.96,-2.77,0x66537a,2,'chignon',false,false,true,.96],
  ['The saxophonist','suit',24,-1,.35,0x37474d,4,'curls',false,false,false,1.03,'dance'],
  ['The bride’s aunt','dress',25,1,-2.65,0x9e5360,2,'bob',false,false,false,.995,'dance'],
  ['The maître d’','suit',24.6,5,-2.48,0x404548,6,'part',false,false,false,1.045],
  ['The baker','dress',28.3,1.6,1.55,0x788461,1,'chignon',false,false,false,1.015]
];

export function buildGuests(scene) {
  const people=party.map((entry,i)=>buildWeddingGuest(scene,entry,i));
  const newlyweds=people.filter(actor=>actor.expression);
  const subjects=people.map(({root,faceCenter,o,seated},i)=>({
    object:root, head:faceCenter, name:root.name, kind:i<2?'couple':'guest',
    holdingGlass:Boolean(o.glass), seated:Boolean(seated)
  }));
  const day=makeDayActors(people,subjects,walkingStep);
  const itinerary=createScheduleCast(people,subjects,walkingStep);
  const bouquet=makeBouquet(), bride=people.find(actor=>actor.o.role==='bride');
  const holder=bride.arms[1].hand;
  const grandma=people.find(actor=>actor.o.role==='grandma');
  const catcher=grandma.arms[1].hand;
  const waiting=new Set(['The bride’s cousin','Uncle Luca','The groom’s sister']);
  const ease=THREE.MathUtils.smoothstep;
  // The anchors are sampled once at the authored release and catch times, even
  // if a slow frame skips either instant or the user rewinds into mid-flight.
  const releasePosition=new THREE.Vector3(),catchPosition=new THREE.Vector3();
  const releaseRotation=new THREE.Quaternion(),catchRotation=new THREE.Quaternion();
  const gripRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.65,0,0));
  const spin=new THREE.Quaternion(),spinAxis=new THREE.Vector3(.82,.24,.31).normalize();
  holder.add(bouquet);
  bouquet.rotation.x=.65;
  const start=new THREE.Vector3(), target=new THREE.Vector3(.75,1.53,.25), position=new THREE.Vector3();
  let lastPhase=null, phaseStart=0;
  function posePeople(t,phase,local,bouquetCycle) {
    const take=phase==='bouquetTake';
    const attention=take?ease(t,16,19.2):0;
    const windup=take?ease(t,18,20.60)*(1-ease(t,20.60,TOSS_RELEASE)):0;
    const throwArm=take?ease(t,20.54,TOSS_RELEASE)*(1-ease(t,21.15,22.60)):0;
    const reach=take?ease(t,21.5,23.43)*(1-ease(t,23.65,24.65)):0;
    const caught=take?ease(t,TOSS_CATCH,24.25):0;
    const celebration=take?ease(t,23.5,24.02):0;
    people.forEach(({root,body,head,arms,legs,walking,dancing,o,gowned,seated,seed,baseYaw,homeX,homeZ,index})=>{
      const wave=Math.sin(t*1.47+seed), slow=Math.sin(t*.65+seed), isBride=index===0, isGroom=index===1;
      root.position.set(homeX,0,homeZ);
      body.position.y=0;
      body.rotation.y=0;
      body.rotation.z=.011*slow;
      body.rotation.x=seated?-.035+.009*wave:.01*wave;
      root.rotation.y=baseYaw+.027*slow;
      head.rotation.y=.085*Math.sin(t*.63+seed*1.2)+(isGroom?-.12:isBride?.105:0);
      head.rotation.x=.031*wave;
      head.rotation.z=.029*slow;
      // Choreography shares a few tempos, but each table starts on a different beat.
      const conversation = (.5 + .5 * Math.cos(t * .8 + seed)) ** 3;
      const greet = (.5 + .5 * Math.cos(t * .68 + seed)) ** 4;
      const applause = (.5 + .5 * Math.cos(t * .73 + seed)) ** 2;
      const beat = t * 3.6 + (index === 16 ? .28 : 0);
      const stride = t / 1.19;
      if (seated) {
        // Guests stay in their assigned chairs. Head and shoulders turn to their neighbour.
        const towardNeighbor = (index % 2 ? 1 : -1) * conversation;
        head.rotation.y += towardNeighbor * .49;
        body.rotation.y = towardNeighbor * .19;
        head.rotation.x += .072 * conversation * Math.sin(t * 4.1 + seed);
      } else if (walking) {
        const radius = .91, speed = .74 / 1.19, arc = t * speed / radius;
        root.position.set(homeX + radius * Math.sin(arc), 0, homeZ + radius * (1 - Math.cos(arc)));
        root.rotation.y = Math.PI / 2 - arc;
        const bob = -.011 * Math.cos(stride * TAU * 2);
        body.position.y = bob;
        body.rotation.set(.038, .07 * Math.sin(stride * TAU), .024 * Math.cos(stride * TAU));
        legs.forEach((leg, n) => walkingStep(leg, stride + n * .5, bob));
      } else if (dancing) {
        const sideStep = Math.sin(beat);
        const bounce = -.023 - .022 * Math.cos(beat * 2);
        root.position.z = homeZ + .14 * sideStep;
        root.rotation.y = baseYaw + .30 * Math.sin(beat * .5 + seed);
        body.position.y = bounce;
        body.rotation.set(.04 * Math.cos(beat), .13 * sideStep, -.065 * sideStep);
        head.rotation.y += .17 * Math.cos(beat * .5 + seed);
        legs.forEach((leg, n) => {
          const footBeat = beat + n * Math.PI;
          const lift = Math.max(0, Math.sin(footBeat));
          stepLeg(leg, .09 * Math.sin(footBeat), .072 * lift * lift, bounce, -.06 * lift);
        });
      } else {
        // The wedding party occasionally turns toward each other for a portrait.
        head.rotation.y += (isBride ? .26 : isGroom ? -.27 : .23) * conversation;
        head.rotation.x += .075 * conversation * Math.cos(t * 2.8 + seed);
      }
      if (take && isBride) {
        root.rotation.y += attention*.32 + windup*.74 - throwArm*.48;
        body.rotation.x += windup*.24 - throwArm*.11;
        head.rotation.y += attention*.18 - windup*.35;
      } else if (take && o.role==='grandma') {
        // Grandma shifts her weight, follows the arc, then turns the flowers
        // toward the aisle. Holding the hand pose at contact keeps the catch clean.
        const watch=ease(t,20.5,21.65)*(1-ease(t,23.05,23.80));
        head.rotation.x -= .40*watch;
        body.rotation.x -= .075*reach;
        root.rotation.y += .14*reach + .80*celebration;
        body.position.y += .095*reach - .045*windup;
        head.rotation.z += caught*.12*Math.sin(t*3);
      } else if (take && !walking && !dancing && homeX<14) {
        head.rotation.y+=attention*.19*Math.sin(seed+.45);
        head.rotation.x-=.20*ease(t,20.9,21.8)*(1-ease(t,23,24));
      }
      arms.forEach(({sh,elbow},a)=>{
        const s=a?1:-1, isHolding=o.glass && a===1;
        let shoulder=seated?-.24:-.08;
        let bend=seated?-.65:gowned?-.37:-.29;
        let spread=s*(seated?.12:.09);
        if(isBride) {shoulder=-.31; bend=-.71; spread=-s*.19;}
        if(isGroom && a===0){shoulder=-.28;bend=-.62;spread=.18;}
        if(isHolding){shoulder=-.48;bend=-.99;}
        if (walking) {
          const swing = Math.cos((stride + a * .5) * TAU);
          shoulder = -.09 + .36 * swing;
          bend = -.48 + .16 * swing;
        } else if (dancing && !isHolding) {
          shoulder = -.46 + .26 * Math.cos(beat + s);
          bend = -.97 + .25 * Math.sin(beat + s);
          spread += s * (.25 + .14 * Math.sin(beat * .5 + s));
        } else if (seated && phase !== 'bouquet') {
          if (index % 3 === 1) {
            // Clapping hands meet ahead of the chest. Use inward upper-arm adduction.
            const clap = (.5 + .5 * Math.cos(t * 8.2 + seed)) * applause;
            shoulder -= .72 * applause;
            bend -= .45 * applause;
            spread -= s * (.24 * applause + .44 * clap);
          } else if (a === index % 2) {
            shoulder -= 1.93 * greet;
            bend -= .80 * greet;
            spread += s * greet * (.42 + .24 * Math.sin(t * 7.2 + seed));
          }
        } else if (!isBride && !isGroom && !isHolding && a === index % 2) {
          // A hand opens toward a conversation partner, then lowers between phrases.
          shoulder -= .51 * conversation;
          bend -= .75 * conversation;
          spread += s * .21 * conversation;
        }
        if(phase==='toast' && isHolding){
          const lift=Math.min(1,local*2.2);
          shoulder-=lift*(.75+.08*wave);bend-=lift*.25;spread+=s*.13*lift;
          head.rotation.x-=.047;
        }
        if(phase==='bouquet' && isBride && a===1){
          const wind=Math.sin(Math.PI*Math.min(1,bouquetCycle/1.05));
          const release=Math.max(0,1-Math.abs(bouquetCycle-1.37)/.42);
          shoulder+=.78*wind-1.49*release;
          bend+=.57*release;
        }
        if(phase==='bouquet' && waiting.has(root.name)){
          const reach=Math.max(0,1-Math.abs(bouquetCycle-2.65)/.93);
          shoulder-=1.73*reach; spread+=s*.21*reach;
        }
        if(take && isBride && a===1){
          shoulder+=1.14*windup-2.1*throwArm;
          bend-=.47*windup;
          bend+=.68*throwArm;
        }else if(take && o.role==='grandma'){
          // Both arms frame the arriving bouquet. The right hand keeps hold
          // while she lifts the flowers for the photographers after the catch.
          shoulder=THREE.MathUtils.lerp(shoulder,-2.48,reach);
          bend=THREE.MathUtils.lerp(bend,-.24,reach);
          const lift=caught*(1-reach);
          shoulder=THREE.MathUtils.lerp(shoulder,a===1?-1.58:-.68,lift);
          bend=THREE.MathUtils.lerp(bend,a===1?-1.02:-1.13,lift);
          spread=THREE.MathUtils.lerp(spread,s*.08,reach);
        }else if(take && !isHolding && !walking && !dancing && homeX<14){
          // The front row reaches, then the surrounding party applauds the catch.
          if(waiting.has(root.name))shoulder-=1.46*reach;
          const clap=(.5+.5*Math.cos((t-TOSS_CATCH)*9+seed))*celebration;
          shoulder-=.76*celebration;
          bend-=.50*celebration;
          spread-=s*(.24*celebration+.41*clap);
        }
        sh.rotation.set(shoulder+.036*wave,s*.032*slow,spread);
        elbow.rotation.set(bend+.04*slow,0,s*(gowned?.104:.051));
      });
    });
  }
  function restInHand(hand) {
    if (bouquet.parent!==hand) hand.add(bouquet);
    bouquet.position.set(0,0,0);
    bouquet.quaternion.copy(gripRotation);
  }

  // Pose the two people at the exact event boundaries and bake their hand transforms.
  posePeople(TOSS_RELEASE,'bouquetTake',TOSS_RELEASE,0);
  holder.getWorldPosition(releasePosition);
  holder.getWorldQuaternion(releaseRotation).multiply(gripRotation);
  posePeople(TOSS_CATCH,'bouquetTake',TOSS_CATCH,0);
  catcher.getWorldPosition(catchPosition);
  catcher.getWorldQuaternion(catchRotation).multiply(gripRotation);
  const dayRelease=219.6,dayCatch=222.8;
  const dayLaunch=new THREE.Vector3(),dayLanding=new THREE.Vector3();
  const dayLaunchRotation=new THREE.Quaternion(),dayLandingRotation=new THREE.Quaternion();
  for(const [time,hand,pos,rot] of [[dayRelease,holder,dayLaunch,dayLaunchRotation],[dayCatch,catcher,dayLanding,dayLandingRotation]]){
    posePeople(time,'weddingDay',time,0);
    day.pose(time);
    hand.getWorldPosition(pos);
    hand.getWorldQuaternion(rot).multiply(gripRotation);
  }
  day.clear();

  function update(t,phase='portraits',playerPosition,itineraryTime) {
    if(phase!==lastPhase){phaseStart=t;lastPhase=phase;}
    const local=t-phaseStart;
    const bouquetCycle=((local%5.2)+5.2)%5.2;
    posePeople(t,phase,local,bouquetCycle);
    updatePortraitExpressions(newlyweds,t,phase,itineraryTime);
    if(phase==='weddingDay'){
      day.pose(t,playerPosition);
      if(Number.isFinite(itineraryTime))itinerary.update(itineraryTime);
      bouquet.visible=(t>=106&&t<125)||(t>=201&&t<=235);
      if(t>=dayRelease&&t<dayCatch){
        const u=(t-dayRelease)/(dayCatch-dayRelease);
        if(bouquet.parent!==scene)scene.add(bouquet);
        bouquet.position.lerpVectors(dayLaunch,dayLanding,u);
        bouquet.position.y+=1.85*4*u*(1-u);
        bouquet.quaternion.slerpQuaternions(dayLaunchRotation,dayLandingRotation,u)
          .multiply(spin.setFromAxisAngle(spinAxis,TAU*u));
        bouquet.scale.setScalar(1.7);
        bouquet.userData.stage='airborne';
      }else{
        restInHand(t<dayCatch?holder:catcher);
        bouquet.scale.setScalar(1.7/(t<dayCatch?bride:grandma).root.scale.y);
        bouquet.userData.stage=t<dayCatch?'held':'caught';
      }
      return;
    }
    day.clear();
    if (phase==='bouquetTake') {
      const u=THREE.MathUtils.clamp((t-TOSS_RELEASE)/(TOSS_CATCH-TOSS_RELEASE),0,1);
      bouquet.visible=true;
      if (t<TOSS_RELEASE) {
        restInHand(holder);
        bouquet.scale.setScalar(1.72/bride.root.scale.y);
        bouquet.userData.stage='held';
      } else if (t<TOSS_CATCH) {
        if(bouquet.parent!==scene)scene.add(bouquet);
        bouquet.position.lerpVectors(releasePosition,catchPosition,u);
        bouquet.position.y+=1.61*4*u*(1-u);
        bouquet.quaternion.slerpQuaternions(releaseRotation,catchRotation,u)
          .multiply(spin.setFromAxisAngle(spinAxis,TAU*u));
        bouquet.scale.setScalar(1.72);
        bouquet.userData.stage='airborne';
      } else {
        restInHand(catcher);
        bouquet.scale.setScalar(1.72/grandma.root.scale.y);
        bouquet.userData.stage='caught';
      }
      return;
    }
    bouquet.scale.setScalar(1);
    if(phase==='bouquet' && bouquetCycle>=1.36 && bouquetCycle<3.24){
      if(bouquet.parent!==scene) {
        holder.getWorldPosition(start);scene.add(bouquet);
      }
      const u=(bouquetCycle-1.36)/1.88;
      position.lerpVectors(start,target,u);position.y+=2.25*4*u*(1-u);
      bouquet.position.copy(position);
      bouquet.rotation.set(.65+u*TAU,u*3.5,u*.65);
      bouquet.visible=true;
      bouquet.userData.stage='airborne';
    } else {
      bouquet.userData.stage='held';
      if(bouquet.parent!==holder) {holder.add(bouquet);bouquet.position.set(0,0,0);bouquet.rotation.set(.65,0,0);}
      bouquet.visible=phase!=='bouquet' || bouquetCycle<3.24 || bouquetCycle>4.48;
    }
  }
  const bridalVeil=bride.head.getObjectByName('Tulle veil');
  update(0,'portraits');
  return {
    subjects,
    daySubjects:id=>{const original=day.subjects(id);return original.length?original:itinerary.subjects(id);},
    dayOccluders:day.occluders,
    animateVeil:(t,reduced)=>animateVeil(bridalVeil,t,reduced),
    bouquet,
    update
  };
}
