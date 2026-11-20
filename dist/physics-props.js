// Judge Dean LLC
import * as THREE from 'three';

const tau = Math.PI * 2;
const wood = 0x976a48, darkWood = 0x624932, brass = 0xb79659;
const cream = 0xf2debc, green = 0x344d43;
const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .76 });
const glass = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: .15, metalness: .15, transparent: true,
  opacity: .35, depthWrite: false, side: THREE.DoubleSide
});
const primitives = {
  box: new THREE.BoxGeometry(1, 1, 1),
  globe: new THREE.IcosahedronGeometry(1, 1),
  bud: new THREE.IcosahedronGeometry(1, 0),
  disc: new THREE.CylinderGeometry(1, 1, 1, 14),
  cone: new THREE.ConeGeometry(1, 1, 4)
};
const up = new THREE.Vector3(0, 1, 0);

// Bake colored trim, petals and framing into one mesh per material and moving body.
function paint() {
  const vertices = [], normals = [], colors = [];
  function add(shape, tint, pos, scale, rotation = [0, 0, 0]) {
    const geo = primitives[shape];
    const quaternion = rotation.isQuaternion ? rotation :
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation));
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...pos), quaternion, new THREE.Vector3(...scale));
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), color = new THREE.Color(tint);
    const count = geo.index?.count ?? geo.attributes.position.count;
    for (let i = 0; i < count; i++) {
      const j = geo.index ? geo.index.getX(i) : i;
      vertices.push(...v.fromBufferAttribute(geo.attributes.position, j).applyMatrix4(matrix).toArray());
      normals.push(...n.fromBufferAttribute(geo.attributes.normal, j).applyNormalMatrix(normalMatrix).toArray());
      colors.push(color.r, color.g, color.b);
    }
  }
  function triangle(tint, a, b, c) {
    const ab = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a));
    const ac = new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a));
    const normal = ab.cross(ac).normalize().toArray(), color = new THREE.Color(tint);
    vertices.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) { normals.push(...normal); colors.push(color.r, color.g, color.b); }
  }
  function quad(tint, a, b, c, d) {
    triangle(tint, a, b, c); triangle(tint, a, c, d);
  }
  function rail(tint, a, b, radius) {
    const direction = new THREE.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2]);
    const len = direction.length(), q = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize());
    add('disc', tint, a.map((v,i) => (v+b[i])/2), [radius, len, radius], q);
  }
  function finish() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }
  return { add, rail, triangle, quad, finish };
}
const box = (x, y, z) => ({ type: 'box', half: [x, y, z] });
const cylinder = (radius, height) => ({ type: 'cylinder', radius, height });

// Source pieces use ground-local coordinates. Both the intact mesh and its debris
// come from the same triangles, with the debris pivot at each piece's own center.
function design(name, kind, shape, mass, breakSpeed, pieces, decorate) {
  const centerY = shape.type === 'box' ? shape.half[1] : shape.height / 2;
  const bins = new Map();
  const shards = pieces.map(({ art, material = surface, mass: pieceMass, foliage = false }) => {
    const geometry = art.finish();
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    const center = bounds.getCenter(new THREE.Vector3());
    const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
    if (!bins.has(material)) bins.set(material, []);
    bins.get(material).push(geometry);
    return {
      geometry: geometry.clone().translate(-center.x, -center.y, -center.z),
      material, foliage, offset: [center.x, center.y-centerY, center.z],
      shape: box(...half.toArray().map(v => Math.max(.014,v))), mass: pieceMass
    };
  });
  const intact = [];
  for (const [material, sources] of bins) {
    const g = new THREE.BufferGeometry();
    for (const attr of ['position', 'normal', 'color']) {
      const arrays = sources.map(s => s.attributes[attr].array);
      const data = new Float32Array(arrays.reduce((n,a) => n + a.length, 0));
      let at = 0;
      for (const a of arrays) {data.set(a, at); at += a.length;}
      g.setAttribute(attr, new THREE.BufferAttribute(data, 3));
    }
    g.translate(0, -centerY, 0);
    intact.push({ geometry: g, material });
  }
  return { name, kind, shape, mass, breakSpeed, centerY, intact, shards: breakSpeed ? shards : [], decorate };
}

function floralUrn() {
  const pieces = [];
  // The broad foot and rolled lip carry through each of the four jagged clay pieces.
  const rings = [
    [.17,0,0], [.222,.03,-.05], [.225,.066,.03], [.18,.084,.08],
    [.197,.17,.032], [.276,.337,-.06], [.281,.364,-.03],
    [.294,.385,.055], [.311,.49,.09], [.323,.514,.05],
    [.344,.529,0], [.346,.563,-.04], [.314,.580,-.044]
  ];
  const rowColors = [0xba795b,0xd39a70,0xb37358,0xc38964,0xcb916d,0xe1b591,
    0xb17b5a,0xcc9473,0xb67a5a,0xd99d76,0xd59a73,0xe8bd95];
  function point(i, j, inner) {
    const [radius,y,twist] = rings[j], a = tau*i/24 + twist;
    const r = radius - (inner ? .026 : 0);
    return [Math.cos(a)*r, y, Math.sin(a)*r];
  }
  for (let quadrant = 0; quadrant < 4; quadrant++) {
    const art = paint(), first = quadrant*6, end = first+6;
    for (let i = first; i < end; i++) {
      for (let j = 0; j < rings.length-1; j++) {
        art.quad(rowColors[j], point(i,j), point(i,j+1), point(i+1,j+1), point(i+1,j));
        art.quad(0x9c674e, point(i,j,true), point(i+1,j,true), point(i+1,j+1,true), point(i,j+1,true));
      }
      const top = rings.length-1;
      art.quad(0xe1b48b, point(i,top), point(i,top,true), point(i+1,top,true), point(i+1,top));
      art.quad(0x955f45, point(i,0,true), point(i,0), point(i+1,0), point(i+1,0,true));
      art.triangle(0xaa7253, [0,.002,0], point(i,0), point(i+1,0));
      art.triangle(0xae7e59, [0,.019,0], point(i+1,0,true), point(i,0,true));
    }
    for (let j = 0; j < rings.length-1; j++) {
      art.quad(0xd9ad87,point(first,j),point(first,j,true),point(first,j+1,true),point(first,j+1));
      art.quad(0xd9ad87,point(end,j,true),point(end,j),point(end,j+1),point(end,j+1,true));
    }
    pieces.push({ art, mass: .43 });
  }
  const flowers = paint();
  flowers.add('globe',0x63513c,[0,.48,0],[.285,.096,.285]);
  for (let i = 0; i < 13; i++) {
    const a = 2.4*i, r = .15 + (i%4)*.041;
    const x = Math.cos(a)*r, z = Math.sin(a)*r, y = .77+.20*(.5+.5*Math.sin(2.2*i));
    flowers.rail(0x5f7655,[.24*x,.48,.24*z],[x,y,z],.013);
    for (const side of [-1,1]) {
      const dir = a+side*.64, tilt = .85*side;
      flowers.add('globe', side<0?0x6e8463:0x89966f, [x*.77+.044*Math.cos(dir),y-.13,z*.77+.045*Math.sin(dir)],
        [.044,.112,.020], [0,-dir,tilt]);
    }
    if (i%3 === 1) {
      flowers.add('globe',0xcab58c,[x,y,z],[.032,.052,.03]);
    } else {
      const petals = i%3===0 ? [0xdeaea4,0xeac4b2,0xbf8b81] : [0xffe9ca,0xf3d3b2,0xe2b491];
      for (let p=0; p<5; p++) {
        const b = tau*p/5+a;
        flowers.add('bud',petals[p%2],[x+.043*Math.cos(b),y,z+.043*Math.sin(b)],
          [.06,.042,.056],[.12,b,.17]);
      }
      flowers.add('bud',petals[2],[x,y+.032,z],[.033,.031,.034]);
    }
  }
  pieces.push({ art: flowers, mass: .56, foliage: true });
  return design('Florist’s rose urn','ceramic',cylinder(.345,.92),2.28,4.35,pieces);
}

function foldingChair() {
  const art = paint(), timber = 0xbc9470;
  for (const side of [-1,1]) {
    const x = side*.236;
    art.rail(timber,[x,.024,-.234],[x,.83,.189],.028);
    art.rail(wood,[x,.024,.237],[x,.53,-.201],.028);
    art.add('disc',brass,[side*.255,.336,-.041],[.034,.017,.034],[0,0,Math.PI/2]);
  }
  for (const z of [-.12,-.04,.04,.12]) art.add('box',timber,[0,.438,z],[.50,.036,.076]);
  for (const z of [-.157,.143]) art.rail(wood,[-.236,.16,z],[.236,.16,z],.018);
  for (const h of [.644,.76]) art.add('box',timber,[0,h,.15+(h-.644)*.49],[.51,.079,.032],[.455,0,0]);
  return design('Folding bistro chair','chair',box(.259,.415,.256),3.4,0,[{art}]);
}

function signPainting() {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 400;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#344d43'; ctx.fillRect(0,0,384,400);
  ctx.strokeStyle = '#d1b287'; ctx.lineWidth = 3; ctx.strokeRect(13,13,358,374);
  ctx.strokeStyle = '#9e9971'; ctx.lineWidth = 1; ctx.strokeRect(20,20,344,360);
  ctx.textAlign = 'center'; ctx.fillStyle = '#f5ead1';
  ctx.font = '19px Georgia'; ctx.fillText('V I L L A   L U C E',192,91);
  ctx.font = 'italic 51px Georgia'; ctx.fillText('This way',192,211);
  ctx.strokeStyle = '#e7cba3'; ctx.lineWidth = 4; ctx.beginPath();
  ctx.moveTo(122,278);ctx.lineTo(257,278);ctx.moveTo(234,263);ctx.lineTo(257,278);ctx.lineTo(234,293);ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map:texture,roughness:.9,polygonOffset:true,polygonOffsetFactor:-1});
}
function wayfindingSign() {
  const art = paint();
  const tilt = -.22;
  for (const side of [-1,1]) {
    for (const end of [-1,1]) art.rail(wood,[side*.348,.025,end*.267],[side*.348,1.16,end*.018],.032);
    art.rail(brass,[side*.345,.44,-.16],[side*.345,.44,.16],.01);
    art.add('disc',brass,[side*.37,1.138,0],[.04,.021,.04],[0,0,Math.PI/2]);
  }
  art.add('box',wood,[0,.704,.119],[.744,.787,.058],[tilt,0,0]);
  art.add('box',green,[0,.707,-.119],[.666,.697,.021],[-tilt,0,0]);
  const painted = signPainting(), front = new THREE.PlaneGeometry(.661,.702);
  function decorate(g,centerY) {
    const mesh = new THREE.Mesh(front, painted);
    mesh.position.set(0,.71-centerY,.148); mesh.rotation.x=tilt; g.add(mesh);
  }
  return design('Garden wayfinding sign','wood',box(.373,.583,.278),4.65,0,[{art}],decorate);
}

function hurricaneLantern() {
  const pieces = [], base = paint(), cap = paint();
  const iron = 0x64604e, patina = 0x8c785b;
  base.add('box',iron,[0,.028,0],[.448,.056,.448]);
  base.add('box',brass,[0,.072,0],[.392,.035,.392]);
  for (const x of [-.18,.18]) for (const z of [-.18,.18]) {
    base.add('box',patina,[x,.412,z],[.023,.65,.023]);
  }
  base.add('disc',cream,[0,.215,0],[.083,.265,.083]);
  base.add('disc',0xccb792,[.089,.163,.052],[.055,.168,.055]);
  base.add('disc',darkWood,[0,.35,0],[.004,.02,.004]);
  cap.add('box',iron,[0,.737,0],[.438,.043,.438]);
  cap.add('cone',brass,[0,.809,0],[.307,.118,.307],[0,Math.PI/4,0]);
  cap.add('box',patina,[0,.867,0],[.1,.049,.1]);
  // Carrying handle forms an open metal loop above the pitched cap.
  for (let i=0; i<14; i++) {
    const point = j => [.074*Math.cos(Math.PI*j/14),.884+.093*Math.sin(Math.PI*j/14),0];
    cap.rail(iron,point(i),point(i+1),.012);
  }
  pieces.push({art:base,mass:.71},{art:cap,mass:.23});
  for (let side=0; side<4; side++) {
    const a = side*Math.PI/2;
    function pt(u,y) { return [u*Math.cos(a)+.178*Math.sin(a),y,-u*Math.sin(a)+.178*Math.cos(a)]; }
    const A=pt(-.168,.092),B=pt(.168,.092),C=pt(.168,.721),D=pt(-.168,.721);
    const left=pt(-.168,.37), right=pt(.168,.48), mid=pt((side%2 ? .061 : -.047),.405);
    const lower = paint(), upper = paint(), tint = side%2 ? 0xbce0d8 : 0xc6e5e1;
    // Irregular diagonal fracture crosses each face, leaving two separate panes.
    lower.quad(tint,A,B,right,mid); lower.triangle(tint,A,mid,left);
    upper.quad(tint,D,left,mid,right); upper.triangle(tint,D,right,C);
    pieces.push({art:lower,material:glass,mass:.072},{art:upper,material:glass,mass:.072});
  }
  return design('Glass hurricane lantern','glass',box(.224,.489,.224),1.52,4.05,pieces);
}

function wineCrate() {
  const art = paint();
  for (const x of [-.342,.342]) for (const z of [-.232,.232]) {
    art.add('box',wood,[x,.183,z],[.056,.366,.052]);
  }
  art.add('box',darkWood,[0,.031,0],[.73,.062,.50]);
  for (let j=0; j<3; j++) {
    const tint=[0xb78f64,0xac8259,0xc49668][j], h=.097+j*.106;
    for (const z of [-.241,.241]) art.add('box',tint,[0,h,z],[.743,.092,.031]);
    for (const x of [-.352,.352]) art.add('box',tint,[x,h,0],[.031,.092,.456]);
    for (const x of [-.27,.27]) for (const z of [-.259,.259]) {
      art.add('bud',darkWood,[x,h,z],[.008,.007,.002]);
    }
  }
  // Folded linen covers the bottle shoulders during service.
  art.add('box',cream,[0,.278,0],[.621,.037,.405],[.026,0,-.011]);
  for (const x of [-.19,.004,.195]) for (const z of [-.099,.111]) {
    art.add('disc',0x4b6151,[x,.300,z],[.060,.077,.060]);
    art.add('cone',0x4b6151,[x,.359,z],[.059,.069,.059]);
    art.add('disc',0x566956,[x,.402,z],[.023,.099,.023]);
    art.add('disc',brass,[x,.449,z],[.027,.035,.027]);
  }
  return design('Cellar service crate','wood',box(.372,.231,.260),6.2,0,[{art}]);
}

function meshFrom(source) {
  const m = new THREE.Mesh(source.geometry, source.material);
  m.castShadow = source.material !== glass; m.receiveShadow = true;
  return m;
}

export function buildPhysicsProps(scene, venue) {
  const urn = floralUrn(), chair = foldingChair(), sign = wayfindingSign();
  const light = hurricaneLantern(), crate = wineCrate();
  const bent = new WeakMap();
  function dressFlowers(mesh, groundToPivot) {
    if (!venue.dressFoliage) return;
    const source = mesh.geometry;
    const shared = bent.get(source);
    if (shared) {
      mesh.geometry = shared.geometry;
      mesh.material = shared.material;
      mesh.customDepthMaterial = shared.depth;
      return;
    }
    // Weight follows the stem from the rim and is the same before and after fracture.
    venue.dressFoliage(mesh, (_index, _x, y) => Math.max(0, y + groundToPivot - .58) * .061);
    bent.set(source, { geometry:mesh.geometry, material:mesh.material, depth:mesh.customDepthMaterial });
  }
  // X/Z marks leave the itinerary's podiums, doorways, cart bay and aisle open.
  const placements = [
    ['suite-roses', urn, -74.13,78.0,.106,.17],
    ['suite-chair', chair, -78.30,75.0,.061,-.72],
    ['lane-flowers', urn, -59.68,69.1,.012,.14],
    ['lane-crate', crate, -59.89,68.24,.012,-.13],
    ['lane-lantern', light, -59.57,67.57,.012,.25],
    ['lodge-sign', sign, -68.23,43.89,.061,1.34],
    ['glasshouse-urn', urn, -43.92,35.4,.067,.64],
    ['vineyard-crate', crate, -58.42,13.83,.058,.38],
    ['olive-chair', chair, -15.36,5.52,.018,-1.10],
    ['arrival-sign', sign, -4.86,20.12,.04,-.36],
    ['ceremony-lantern', light, -1.25,4.15,.035,.13],
    ['ceremony-chair', chair, 1.70,5.76,.035,-.22],
    ['terrace-crate', crate, 46.60,24.21,.074,-.09],
    ['terrace-lantern', light, 47.51,24.36,.074,.22],
    ['pier-lantern', light, 76.76,55.07,.129,.47],
    ['pavilion-sign', sign, 50.95,86.38,.068,-.47],
    ['pavilion-crate', crate, 53.72,84.63,.066,.31],
    ['hall-roses', urn, 16.79,4.87,.09,.39],
    ['lawn-lantern', light, 7.47,87.75,.060,.55],
    ['lawn-chair', chair, 8.50,87.58,.060,-.27]
  ];
  return placements.map(([id, model, x, z, floor, yaw]) => {
    const object = new THREE.Group();
    object.name = model.name;
    object.position.set(x, floor+model.centerY, z); object.rotation.y = yaw;
    for (const batch of model.intact) {
      const mesh = meshFrom(batch);
      if (model === urn) dressFlowers(mesh, model.centerY);
      object.add(mesh);
    }
    model.decorate?.(object, model.centerY);
    scene.add(object);
    const fragments = model.shards.map((part,i) => {
      const fragment = meshFrom(part);
      if (part.foliage) dressFlowers(fragment, model.centerY + part.offset[1]);
      fragment.name = model.name+' · '+(i+1);
      fragment.visible = false; scene.add(fragment);
      return { object:fragment, shape:part.shape, mass:part.mass, offset:part.offset };
    });
    return {
      id, kind:model.kind, label:model.name, object, shape:model.shape,
      mass:model.mass, breakSpeed:model.breakSpeed || undefined, fragments
    };
  });
}
