// Judge Dean LLC
import * as THREE from 'three';
import { buildServiceRig, servicePose } from './service-rig.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = THREE.MathUtils.clamp;
const shapeMaterial = (color, roughness = .65, metalness = .10) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// A bevel catches the sun on the body casting, grip plates, and flash housing.
function rounded(width, height, depth, radius = .04, bevel = .012) {
  if(radius<=.004&&bevel<=.003)return new THREE.BoxGeometry(width,height,depth);
  const tiny=Math.min(width,height)<.065;
  radius = Math.min(radius, width * .49, height * .49);
  const a = width / 2, b = height / 2, r = radius;
  const outline = new THREE.Shape();
  outline.moveTo(-a + r, -b);
  outline.lineTo(a - r, -b);
  outline.quadraticCurveTo(a, -b, a, -b + r);
  outline.lineTo(a, b - r);
  outline.quadraticCurveTo(a, b, a - r, b);
  outline.lineTo(-a + r, b);
  outline.quadraticCurveTo(-a, b, -a, b - r);
  outline.lineTo(-a, -b + r);
  outline.quadraticCurveTo(-a, -b, -a + r, -b);
  return new THREE.ExtrudeGeometry(outline, {
    depth, bevelEnabled: bevel > 0, bevelSegments: tiny?1:2,
    bevelSize: bevel, bevelThickness: bevel, curveSegments: tiny?2:3
  }).translate(0, 0, -depth / 2);
}

function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(x, y, z);
  parent.add(result);
  return result;
}

function box(parent, material, x, y, z, w, h, d, r, bevel) {
  return mesh(parent, rounded(w, h, d, r, bevel), material, x, y, z);
}

function oval(parent, material, x, y, z, rx, ry, rz) {
  const target = mesh(parent, new THREE.SphereGeometry(1, 16, 12), material, x, y, z);
  target.scale.set(rx, ry, rz);
  return target;
}

function tube(parent, material, start, end, ra, rb = ra, sides = 16) {
  const axis = end.clone().sub(start);
  const geometry = new THREE.CylinderGeometry(rb, ra, axis.length(), sides);
  const midpoint = start.clone().add(end).multiplyScalar(.5);
  const result = mesh(parent, geometry, material, midpoint.x, midpoint.y, midpoint.z);
  result.quaternion.setFromUnitVectors(v(0, 1, 0), axis.normalize());
  return result;
}

function flutedRing(parent, material, x, y, z, radius, thickness, ridges, axis = 'z') {
  const positions = [], indices = [];
  for (let i = 0; i < ridges * 4; ++i) {
    const theta = i / (ridges * 4) * Math.PI * 2;
    const radiusAtTheta = radius - (i % 4 < 2 ? .012 : 0);
    for (const offset of [0, thickness]) {
      positions.push(Math.cos(theta) * radiusAtTheta, Math.sin(theta) * radiusAtTheta, offset);
    }
    const next = (i + 1) % (ridges * 4) * 2, current = i * 2;
    indices.push(current, next, next + 1, current, next + 1, current + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  if (axis === 'y') geo.rotateX(-Math.PI / 2);
  return mesh(parent, geo, material, x, y, z);
}

// Each immobile assembly is rendered once per material, including all dial teeth.
function batchParts(parent) {
  parent.updateWorldMatrix(true, true);
  const inverse = parent.matrixWorld.clone().invert(), matrix = new THREE.Matrix4();
  const collections = new Map();
  for (const part of parent.children.slice()) {
    if (!part.isMesh) continue;
    let set = collections.get(part.material);
    if (!set) {
      set = { positions: [], normals: [], uvs: [] };
      collections.set(part.material, set);
    }
    const baked = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    baked.applyMatrix4(matrix.multiplyMatrices(inverse, part.matrixWorld));
    const p = baked.getAttribute('position'), n = baked.getAttribute('normal'), uv = baked.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      set.positions.push(p.getX(i), p.getY(i), p.getZ(i));
      set.normals.push(n.getX(i), n.getY(i), n.getZ(i));
      set.uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    parent.remove(part);
    baked.dispose();
    part.geometry.dispose();
  }
  for (const [material, data] of collections) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
    mesh(parent, geometry, material);
  }
}

// Stitched shell with bulk at the elbow, bias-cut folds and a gathered wrist cuff.
function fieldSleeve() {
  const rows=28, sides=24, pos=[],uv=[],colors=[],indices=[];
  const knots=[[0,1.54],[.38,1.35],[.63,1.19],[.77,1.32],[.83,1.33],
    [.854,1.06],[.876,1.10],[.96,1.10],[.977,1.13],[1,1.01]];
  const zip=new THREE.Color(0xaeb2a8), shell=new THREE.Color(0xffffff), cuff=new THREE.Color(0x8e948c);
  // Extra edge loops preserve the compressed seam where the cuff joins the sleeve.
  const heights=[...new Set([...Array.from({length:rows+1},(_,i)=>i/rows),...knots.map(k=>k[0])])].sort((a,b)=>a-b);
  for(let j=0;j<heights.length;j++){
    const t=heights[j], next=knots.findIndex(k=>k[0]>=t), [b,rb]=knots[next],[a,ra]=knots[Math.max(0,next-1)];
    const r=THREE.MathUtils.lerp(ra,rb,b===a?0:(t-a)/(b-a));
    for(let i=0;i<=sides;i++){
      const u=i/sides,theta=u*Math.PI*2;
      const folds=t>.85?0:(.055*Math.cos(18*t+2.5*Math.sin(theta+.9))+.035*Math.cos(41*t-1.7*Math.cos(theta*2)))*Math.sin(t*Math.PI);
      const radius=r+folds+(t>.82&&t<.86?.026*Math.sin(theta*7):0);
      pos.push(Math.sin(theta)*radius,t-.5,Math.cos(theta)*radius*.91);
      uv.push(u*3,t*5);
      const color=t>.855?cuff:i===4||i===5?zip:shell;
      colors.push(color.r,color.g,color.b);
      if(i&&j){
        const d=j*(sides+1)+i,c=d-1,b=d-sides-1,a=b-1;
        indices.push(a,b,c,b,d,c);
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

// A small, fixed reflection map gives lacquer, coated glass and brushed metal
// something to reflect between the bright sky, shaded trees and limestone ground.
function estateReflections() {
  const tex=canvasTexture(256,128,ctx=>{
    const sky=ctx.createLinearGradient(0,0,0,128);
    for(const [stop,color] of [[0,'#8298af'],[.34,'#c0cfdb'],[.48,'#e8e7df'],[.54,'#474e45'],[.61,'#767968'],[1,'#978d75']])sky.addColorStop(stop,color);
    ctx.fillStyle=sky;ctx.fillRect(0,0,256,128);
    ctx.fillStyle='#e8e4d8';ctx.fillRect(54,49,23,25);ctx.fillRect(79,49,9,25);
    ctx.fillStyle='#525950';ctx.fillRect(167,52,37,13);
  });
  tex.mapping=THREE.EquirectangularReflectionMapping;return tex;
}

export function buildRig(rigScene, liveTexture) {
  const group = new THREE.Group();
  group.name = 'Photographer and mirrorless camera';
  const root = new THREE.Group();
  root.add(group);
  rigScene.add(root);
  rigScene.environment=estateReflections();rigScene.environmentIntensity=.52;
  const graphite = shapeMaterial(0x292d30, .43, .56);
  const edge = shapeMaterial(0x424a4b, .43, .60);
  const black = shapeMaterial(0x15181a, .79, .12);
  const silver = shapeMaterial(0x9ca6a0, .4, .7);
  const orange = shapeMaterial(0xff6535, .48, .28);
  const rubber = shapeMaterial(0x222423, .89, .06);
  const coating = shapeMaterial(0x232e3d, .20, .58);
  const glove = shapeMaterial(0x393a33, .92, .03);
  const sleeve = shapeMaterial(0x5b5d50, .89, 0);
  const skin = shapeMaterial(0xbc8464, .88, 0);

  const grain = canvasTexture(128, 128, ctx => {
    let seed = 58;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const pixels = ctx.createImageData(128, 128);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = Math.floor(95 + random() * 72);
      pixels.data.set([value, value, value, 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
  });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.colorSpace = THREE.NoColorSpace;
  rubber.bumpMap = glove.bumpMap = grain;
  rubber.bumpScale = .004;
  glove.bumpScale = .003;
  const weave=canvasTexture(96,96,ctx=>{
    const pixels=ctx.createImageData(96,96);
    for(let y=0;y<96;y++)for(let x=0;x<96;x++){
      const crossing=(Math.floor(x/4)+Math.floor(y/4))%2;
      const strand=((crossing?x:y)%4);
      const value=120+34*Math.sin((strand+.5)*Math.PI/4)+((x+y)%3)*4;
      pixels.data.set([value,value,value,255],4*(y*96+x));
    }
    ctx.putImageData(pixels,0,0);
  });
  weave.colorSpace=THREE.NoColorSpace;weave.wrapS=weave.wrapT=THREE.RepeatWrapping;
  const wovenSleeve=sleeve.clone();wovenSleeve.bumpMap=weave;wovenSleeve.bumpScale=.0015;wovenSleeve.vertexColors=true;
  const pebble=canvasTexture(128,128,ctx=>{
    // Tile a pebbled rubber skin. The dips between individual grains read when
    // the side panel falls into shade as well as under a strong rim light.
    ctx.fillStyle='#c3c1ba';ctx.fillRect(0,0,128,128);
    let seed=113;const rand=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
    for(let i=0;i<2450;i++){
      const x=rand()*128,y=rand()*128,r=.5+rand()*1.20,brightness=Math.round(184+55*rand());
      ctx.fillStyle='rgb('+brightness+','+brightness+','+brightness+')';
      ctx.beginPath();ctx.ellipse(x,y,r*.65,r,rand()*Math.PI,0,Math.PI*2);ctx.fill();
    }
  });
  pebble.wrapS=pebble.wrapT=THREE.RepeatWrapping;pebble.repeat.set(2.2,2.2);
  rubber.map=pebble;glove.map=pebble;
  const darkDisplay = new THREE.MeshBasicMaterial({color: 0x414f40});
  const directPlane = (parent, mat, x, y, z, w, h) =>
    mesh(parent, new THREE.PlaneGeometry(w,h), mat, x,y,z);
  const ivory = shapeMaterial(0xd9d3bd, .41, .42);
  const titanium = shapeMaterial(0xa8b2ad, .40, .52);
  const leather = shapeMaterial(0x34453e, .92, .06);
  const screenMat = new THREE.MeshBasicMaterial({
    map: liveTexture || null, color: liveTexture ? 0xffffff : 0x728886, toneMapped: false
  });
  leather.map=pebble;leather.bumpMap=grain;leather.bumpScale=.007;rubber.roughness=.78;
  const opticalGlass=new THREE.MeshPhysicalMaterial({color:0x173336,metalness:.40,roughness:.15,clearcoat:.85,clearcoatRoughness:.08,
    iridescence:.52,iridescenceIOR:1.32,iridescenceThicknessRange:[240,385]});
  const sideMarking=canvasTexture(192,288,ctx=>{
    ctx.fillStyle='#c9c7ae';ctx.textAlign='center';ctx.font='700 28px monospace';
    ctx.fillText('MIC',96,70);ctx.fillText('USB-C',96,198);
    ctx.lineWidth=5;ctx.strokeStyle='#c9c7ae';ctx.strokeRect(71,213,50,16);
    ctx.fillRect(88,83,16,29);ctx.beginPath();ctx.arc(96,100,16,0,Math.PI);ctx.stroke();
  });
  const stampedPorts=new THREE.MeshBasicMaterial({map:sideMarking,transparent:true,depthWrite:false});
  const screens = [];
  function makeCamera(wide) {
    const body = new THREE.Group();
    body.name = wide ? '24 mm compact rangefinder' : '85 mm professional camera';
    group.add(body);
    function label(x, y, z, w, h, str, color = '#d1d5cb') {
      const tex = canvasTexture(384, 64, ctx => {
        ctx.fillStyle = color;
        ctx.font = 'bold 49px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(str,192,34,375);
      });
      const mat = new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false});
      return directPlane(body, mat, x,y,z,w,h);
    }
    // Main magnesium casting and separately molded grip.
    box(body, wide ? leather : graphite, -.03,-.01,0, 1.49,.82,.53,.085,.027);
    box(body, rubber, .595,-.045,-.08, .47,.80,.82,.12,.038);
    box(body, black, -.04,-.425,.026, 1.41,.058,.51,.025,.014);
    box(body, wide ? titanium : graphite, -.03,.40,-.025, 1.45,wide ? .17 : .13,.54,.052,.017);
    box(body, rubber, -.706,-.032,.015, .12,.64,.54,.057,.016);
    // Split terminals are recessed in a sealed bridge on the camera's visible left shoulder.
    const sidePlate=(mat,x,y,z,w,h,d,r=.014)=>{
      const m=box(body,mat,x,y,z,w,h,d,r,.003);m.rotation.y=-Math.PI/2;return m;
    };
    sidePlate(black,-.79,-.039,-.186,.17,.57,.020,.025);
    for(const [y,h] of [[.09,.24],[-.175,.244]]){
      sidePlate(rubber,-.806,y,-.186,.151,h,.020,.014);
      sidePlate(edge,-.820,y-.07,-.244,.013,.055,.008,.005);
    }
    directPlane(body,stampedPorts,-.822,-.041,-.184,.139,.463).rotation.y=-Math.PI/2;
    for(const y of [-.344,.282]){
      tube(body,edge,v(-.782,y,-.17),v(-.797,y,-.17),.024,.026,12);
      sidePlate(black,-.8,y,-.17,.032,.006,.002,.001).rotation.x=.4;
    }
    box(body, rubber, .651,.17,.285, .30,.31,.095,.09,.017).rotation.z = -.17;
    // Tilt-out monitor with a metal hinge, bezel, and live image.
    box(body, black, -.18,-.08,.296, .95,.63,.09,.035,.013);
    box(body, edge, -.18,-.08,.348, .917,.601,.012,.026,.006);
    box(body, graphite, -.18,-.08,.365, .893,.574,.018,.019,.005);
    // Keep the LCD separate from the baked casing so its UV can follow the sensor orientation.
    const monitor = new THREE.Group();
    body.add(monitor);
    body.userData.monitor=monitor;
    const screen = directPlane(monitor, screenMat, -.18,-.040,.386,.75,.50);
    screens.push(screen.geometry.attributes.uv);
    const lcdOverlay = canvasTexture(576,312,ctx => {
      const shine=ctx.createLinearGradient(0,0,195,312);
      shine.addColorStop(0,'rgba(217,237,246,.12)');shine.addColorStop(.60,'rgba(185,221,244,.019)');
      shine.addColorStop(1,'rgba(9,16,18,.018)');ctx.fillStyle=shine;ctx.fillRect(0,0,576,312);
      ctx.fillStyle = 'rgba(13,21,21,.85)';
      ctx.fillRect(0,278,576,34);
      ctx.fillStyle = '#d6e8dc';
      ctx.font = 'bold 21px monospace';
      ctx.fillText(wide ? '24 mm     F2.8     ISO 400' : '85–200    F2.8     ISO 400',12,304);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f0f5eb';
      for (const [x,y,sx,sy] of [[255,115,1,1],[321,115,-1,1],[255,173,1,-1],[321,173,-1,-1]]) {
        ctx.beginPath();ctx.moveTo(x+sx*11,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*11);ctx.stroke();
      }
    });
    const finderGraphics=new THREE.MeshBasicMaterial({map:lcdOverlay,transparent:true,depthWrite:false});
    directPlane(monitor,finderGraphics,-.18,-.040,.387,.75,.50);body.userData.finderGraphics=finderGraphics;
    label(-.18,-.323,.386,.47,.037,'JUDGE DEAN LLC');
    tube(body, silver,v(-.662,-.25,.315),v(-.662,.15,.315),.018);
    // The image in the eyepiece fills the optical opening as it reaches the eye.
    const evfHeight=wide?.074:.100;
    const evf=directPlane(monitor,screenMat,wide?-.52:-.16,wide?.346:.425,
      wide?.367:.362,evfHeight*1.5,evfHeight);
    body.userData.evf=evf;
    screens.push(evf.geometry.attributes.uv);
    if (wide) {
      // Flat-top rangefinder with an offset eyepiece, exposed shoe and alloy top plate.
      box(body,black,-.52,.346,.268,.30,.177,.15,.039,.007);
      box(body,titanium,-.52,.346,.348,.238,.121,.014,.024,.004);
      box(body,coating,-.52,.346,.361,.19,.087,.008,.016,.002);
      for(const side of [-1,1]){
        // Hot-shoe floor, locking rails and contact pins show through the open shoe.
        box(body,titanium,side*.088,.506,-.11,.035,.016,.227,.005,.002);
      }
      box(body,black,0,.501,-.11,.206,.017,.232,.012,.003);
      for(const [x,z] of [[0,-.13],[-.055,-.065],[.055,-.065],[-.05,-.175],[.05,-.175]])
        tube(body,silver,v(x,.504,z),v(x,.515,z),.011,.012,8);
      for (const rail of [-.124,.124]) {
        box(body,edge,rail,.509,-.11,.038,.043,.25,.006,.003);
      }
      label(.08,.39,.282,.30,.044,'FIELD 24','#1f2a23');
    } else {
      // Eyecup has real recessed glass, a gasket, and a raised brow.
      box(body, graphite, -.16,.45,-.055,.58,.28,.51,.075,.025);
      box(body, rubber, -.16,.425,.252,.46,.245,.15,.065,.015);
      box(body, black, -.16,.425,.338,.345,.166,.016,.037,.006);
      box(body, coating, -.16,.425,.351,.245,.109,.012,.023,.004);
      // Flash foot, pivot knuckle and the broad speedlight reflector.
      box(body, silver,-.16,.608,-.085,.28,.022,.30,.015,.006);
      box(body, black,-.16,.68,-.08,.26,.13,.24,.026,.012);
      box(body, graphite,-.16,.79,-.095,.35,.21,.29,.045,.012);
      tube(body, edge, v(-.387,.81,-.10),v(.07,.81,-.10),.106);
      const flash = new THREE.Group();
      flash.position.set(-.16,.87,-.13);
      flash.rotation.set(-.19,-.14,.015);
      body.add(flash);
      // The rubber bellows still connects the rotating speedlight head to its yoke when tilted.
      box(flash, black,0,-.075,.015,.306,.167,.291,.036,.008);
      box(flash, graphite,0,.076,-.015,.635,.273,.55,.049,.026);
      box(flash, rubber,0,.077,-.295,.633,.268,.064,.041,.009);
      box(flash, silver,0,.073,-.341,.567,.201,.012,.028,.003);
      for (let i=0;i<5;i++)
        box(flash,black,0,.014+i*.031,-.351,.54,.006,.004,.002,.001);
      box(flash, black,0,.069,.27,.545,.19,.019,.024,.005);
      box(flash, edge,-.045,.081,.283,.32,.098,.005,.012,.002);
      box(flash,darkDisplay,-.045,.081,.289,.28,.066,.005,.003,.001);
      const readout=canvasTexture(256,64,ctx=>{
        ctx.fillStyle='#a2ac92';ctx.fillRect(0,0,256,64);
        ctx.fillStyle='#334237';ctx.font='bold 38px monospace';ctx.fillText('TTL',7,47);
        ctx.font='bold 32px monospace';ctx.fillText('85mm',91,46);
        for(let i=0;i<4;i++)ctx.fillRect(192+10*i,42-7*i,7,10+7*i);
      });
      directPlane(flash,new THREE.MeshBasicMaterial({map:readout}),-.045,.081,.295,.279,.067);
      for(const sx of [-1,1])for(let j=0;j<5;j++)
        box(flash,black,sx*.32,.045+j*.027,-.10,.012,.009,.23,.003,.001);
      oval(flash,orange,.177,.096,.29,.026,.026,.008);
      for(let i=0;i<4;i++)
        box(flash,black,-.245+i*.039,-.013,.28,.021,.013,.014,.003,.002);
      batchParts(flash);
    }
    // A rounded lip shades the EVF and keeps the live optical opening clear.
    const ex=wide?-.52:-.16,ey=wide?.346:.425,ez=wide?.365:.361;
    for(const side of [-1,1]){
      box(body,rubber,ex+side*(wide?.122:.167),ey,ez,wide?.049:.067,wide?.148:.207,.032,.019,.004);
      box(body,rubber,ex,ey+side*(wide?.056:.080),ez,wide?.240:.326,.030,.032,.012,.004);
    }
    const lensX = -.17, lensY = .045;
    let barrelParent=body;
    const segment = (mat, back, front, r1, r2 = r1) =>
      tube(barrelParent, mat, v(lensX,lensY,back),v(lensX,lensY,front),r1,r2,48);
    segment(edge,-.26,-.35,.353);
    segment(wide ? silver : orange,-.34,-.372,.345);
    if (wide) {
      segment(graphite,-.365,-.50,.314,.347);
      segment(rubber,-.50,-.72,.35);
      flutedRing(body,black,lensX,lensY,-.71,.365,.192,60);
      segment(titanium,-.72,-.75,.356);
      segment(black,-.75,-.825,.368,.425);
      segment(coating,-.825,-.841,.342);oval(body,opticalGlass,lensX,lensY,-.839,.315,.315,.035);
      // Four short petals shade the wide front element at the corners.
      const hood = [];
      for (let i=0; i<64; i++) {
        const a=i*Math.PI/32, b=(i+1)*Math.PI/32;
        function rim(theta, tip) {
          const r=tip ? .45 : .42;
          const z=tip ? -.873-.105*Math.pow(Math.abs(Math.cos(theta*2)),3) : -.801;
          return [lensX+Math.cos(theta)*r,lensY+Math.sin(theta)*r,z];
        }
        hood.push(...rim(a,false),...rim(a,true),...rim(b,false),
          ...rim(b,false),...rim(a,true),...rim(b,true));
      }
      const petals=new THREE.BufferGeometry();
      petals.setAttribute('position',new THREE.Float32BufferAttribute(hood,3));
      petals.computeVertexNormals();
      const hoodMaterial=shapeMaterial(0x272c29,.75);
      hoodMaterial.side=THREE.DoubleSide;
      mesh(body,petals,hoodMaterial);
    } else {
      // A long ivory casting with a rotating tripod collar and separate rubber rings.
      segment(ivory,-.372,-.78,.323,.35);
      segment(graphite,-.77,-.84,.359);
      segment(ivory,-.84,-1.11,.36);
      segment(edge,-1.11,-1.14,.37);
      segment(rubber,-1.14,-1.49,.375);
      const zoomRing=new THREE.Group();zoomRing.name='Zoom ring';
      zoomRing.position.set(lensX,lensY,0);body.add(zoomRing);body.userData.zoomRing=zoomRing;
      flutedRing(zoomRing,black,0,0,-1.49,.389,.345,68);
      const stops=[85,105,135,170,200];
      const scale=canvasTexture(512,64,ctx=>{
        ctx.fillStyle='#26282a';ctx.fillRect(0,0,512,64);
        ctx.fillStyle='#e4ddc8';ctx.textAlign='center';ctx.font='bold 26px monospace';
        stops.forEach(f=>{const x=25+(f-85)/115*462;ctx.fillRect(x-2,2,4,15);ctx.fillText(f,x,47);});
      });
      const scaleFace=new THREE.PlaneGeometry(1,1,22,1), verts=scaleFace.attributes.position;
      for(let i=0;i<verts.count;i++){
        const angle=2.15+.94*(verts.getX(i)+.5), z=-1.165-.050*(.5-verts.getY(i));
        verts.setXYZ(i,.396*Math.cos(angle),.396*Math.sin(angle),z);
      }
      scaleFace.computeVertexNormals();
      mesh(zoomRing,scaleFace,new THREE.MeshBasicMaterial({map:scale,side:THREE.DoubleSide}));
      batchParts(zoomRing);
      const indexAngle=2.15+.94*25/512;
      const mark=(z)=>v(lensX+.378*Math.cos(indexAngle),lensY+.378*Math.sin(indexAngle),z);
      tube(body,orange,mark(-1.147),mark(-1.115),.008,.008,6);
      // Overlapping inner barrel stays under the front tube through the entire throw.
      segment(black,-1.47,-1.99,.354);
      const extension=new THREE.Group();body.add(extension);body.userData.extension=extension;
      barrelParent=extension;
      segment(ivory,-1.49,-1.89,.377,.409);
      segment(rubber,-1.89,-2.05,.413);
      flutedRing(extension,black,lensX,lensY,-2.04,.427,.141,78);
      segment(ivory,-2.05,-2.28,.416,.461);
      segment(graphite,-2.28,-2.33,.468);
      segment(coating,-2.33,-2.341,.412);
      oval(extension,opticalGlass,lensX,lensY,-2.343,.385,.385,.046);
      // Flush zoom index, distance window, switch sliders and a collar lock.
      segment(edge,-1.515,-1.536,.383);
      for(let j=0;j<6;j++){
        const a=2.72+j*.094;
        tube(extension,black,v(lensX+.381*Math.cos(a),lensY+.381*Math.sin(a),-1.54),
          v(lensX+.381*Math.cos(a),lensY+.381*Math.sin(a),-1.54-(j%2?.029:.053)),.006,.006,5);
      }
      const band=canvasTexture(512,64,ctx=>{
        ctx.fillStyle='#252c28';ctx.fillRect(0,0,512,64);ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillStyle='#f3ecce';ctx.font='bold 36px monospace';ctx.fillText('85–200   1:2.8',256,33);
      });
      const legend=new THREE.MeshBasicMaterial({map:band});
      // Wrap the engraving over the left shoulder of the zoom barrel.
      const panel=new THREE.PlaneGeometry(.43,.068,12,1),points=panel.attributes.position;
      for(let i=0;i<points.count;i++){
        const z=points.getX(i),h=points.getY(i),a=2.63-h/.398, radius=.404-z*.08;
        points.setXYZ(i,lensX+radius*Math.cos(a),lensY+radius*Math.sin(a),-1.69+z);
      }
      panel.computeVertexNormals();legend.side=THREE.DoubleSide;mesh(extension,panel,legend);
      batchParts(extension);
      box(body,black,lensX,.393,-.622,.27,.032,.137,.014,.007);
      box(body,coating,lensX,.412,-.622,.234,.012,.099,.01,.003);
      for(let i=0;i<5;i++)box(body,ivory,lensX-.08+i*.037,.42,-.615,.008,.006,.045,.002,0);
      tube(body,graphite,v(-.486,.11,-.961),v(-.589,.11,-.961),.076,.061,16);
      tube(body,edge,v(-.588,.11,-.961),v(-.605,.11,-.961),.066,.061,16);
      box(body,ivory,lensX,-.342,-.97,.077,.21,.14,.02,.006);
      box(body,graphite,lensX,-.46,-.98,.16,.052,.42,.012,.004);
      box(body,black,-.531,.06,-.64,.024,.147,.201,.008,.002);
      for(const y of [.02,.086]) box(body,silver,-.546,y,-.645,.018,.022,.074,.006,.001);
    }
    // Mode dial: top markings travel around its edge and stay upright when viewed from behind.
    function dial(x,y,z,r) {
      tube(body,black,v(x,y,z),v(x,y+.055,z),r);
      flutedRing(body,edge,x,y+.005,z,r+.006,.055,34,'y');
      tube(body,graphite,v(x,y+.045,z),v(x,y+.069,z),r*.93);
    }
    dial(-.55,wide ? .495 : .468,-.04,.155);
    const dialFace = canvasTexture(192,192,ctx=>{
      ctx.fillStyle='#31373a';ctx.fillRect(0,0,192,192);
      ctx.translate(96,96); ctx.textAlign='center';ctx.textBaseline='middle';
      for(const [i,str] of ['M','S','A','P','C1','C2','●','AUTO'].entries()){
        ctx.save();ctx.rotate(i*Math.PI/4);ctx.fillStyle=i===0?'#ff8a4d':'#eeeeeb';
        ctx.font='bold 23px monospace';ctx.fillText(str,0,-62);ctx.restore();
      }
    });
    const dialTop = mesh(body,new THREE.CircleGeometry(.143,32),
      new THREE.MeshBasicMaterial({map:dialFace}),-.55,wide ? .566 : .539,-.04);
    dialTop.rotation.x=-Math.PI/2;
    dial(.565,.463,.105,.126);
    if(!wide){
      const stats=canvasTexture(256,104,ctx=>{
        ctx.fillStyle='#959f90';ctx.fillRect(0,0,256,104);ctx.fillStyle='#25372c';
        ctx.font='bold 43px monospace';ctx.fillText('250',10,51);ctx.fillText('2.8',133,51);
        ctx.font='bold 22px monospace';ctx.fillText('ISO 400',11,87);
        ctx.strokeStyle='#25372c';ctx.lineWidth=4;ctx.strokeRect(176,65,52,17);ctx.fillRect(231,69,4,9);
        for(let i=0;i<3;i++)ctx.fillRect(181+i*14,69,11,9);
      });
      box(body,rubber,.342,.477,-.095,.34,.024,.17,.015,.003);
      directPlane(body,new THREE.MeshBasicMaterial({map:stats}),.342,.497,-.095,.302,.130).rotation.x=-Math.PI/2;
    }
    tube(body,edge,v(.61,.47,-.245),v(.61,.52,-.245),.096);
    const release=tube(body,black,v(.61,.518,-.245),v(.61,.545,-.245),.071);
    const trigger=new THREE.Group();trigger.name='Two-stage shutter release';body.add(trigger);trigger.add(release);
    body.userData.trigger=trigger;
    oval(body,orange,.42,.475,-.25,.045,.018,.045);
    // Rear directional wheel, function buttons, and a small status light.
    const rearButton=(x,y,r,mat=black,z=.305) =>
      tube(body,mat,v(x,y,z-.013+(x>0?.095:0)),v(x,y,z+.015+(x>0?.095:0)),r,r*.94,24);
    rearButton(.425,-.093,.135,edge);
    flutedRing(body,rubber,.425,-.093,.396,.130,.039,44);
    rearButton(.425,-.093,.111,rubber,.329);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      box(body,silver,.425+.095*Math.cos(a),-.093+.095*Math.sin(a),.443,.023,.006,.003,.002,0).rotation.z=a;
    }
    rearButton(.425,-.093,.053,graphite,.349);
    for(const [x,y] of [[.336,.203],[.473,.207],[.355,-.303],[.505,-.302],[-.56,.355],[-.68,.354]])
      rearButton(x,y,.046);
    rearButton(.37,.085,.062,edge);
    rearButton(.375,.085,.041,rubber,.329);
    label(.425,-.094,.463,.071,.025,'SET');
    label(.429,-.238,.388,.212,.024,'PLAY   DISP');
    oval(body,new THREE.MeshBasicMaterial({color:0xc7e193}),.664,-.318,.308,.013,.013,.009);
    // Lugs and a short loop of woven strap.
    for (const side of [-1,1]) {
      const x = side < 0 ? -.79 : .842;
      tube(body,silver,v(x-side*.06,.25,-.04),v(x+side*.035,.25,-.04),.028);
      const ring = mesh(body,new THREE.TorusGeometry(.048,.012,6,18),edge,x+side*.022,.22,-.039);
      ring.rotation.y=.25;
    }
    const strapPath = new THREE.CatmullRomCurve3([v(-.819,.22,-.04),v(-.874,.03,-.02),
      v(-.83,-.37,.04),v(-.65,-.65,.195),v(-.5,-.77,.35)]);
    mesh(body,new THREE.TubeGeometry(strapPath,22,.026,6,false),glove);
    // Right index rests on the shutter; the thumb braces the back grip.
    tube(body,glove,v(1.02,-.441,.27),v(.915,-.32,.155),.202,.185);
    oval(body,glove,.847,-.073,-.013,.182,.313,.227).rotation.z=.17;
    oval(body,glove,.796,.092,.237,.16,.16,.154);
    tube(body,glove,v(.85,.081,.263),v(.71,.206,.323),.085,.076);
    oval(body,skin,.694,.209,.331,.084,.077,.067).rotation.z=.28;
    for (const [y,x] of [[.029,.844],[-.105,.841],[-.239,.833]]) {
      tube(body,glove,v(x,y,-.11),v(x-.029,y+.012,-.34),.071,.064);
      oval(body,skin,x-.075,y+.02,-.344,.102,.058,.078).rotation.y=-.39;
    }
    const finger=new THREE.Group();finger.name='Shutter finger';body.add(finger);
    finger.position.set(.876,.145,-.16);
    tube(finger,glove,v(0,0,0),v(-.070,.228,-.069),.077,.075);
    tube(finger,skin,v(-.070,.228,-.069),v(-.184,.427,-.082),.069,.062);
    oval(finger,skin,-.219,.437,-.084,.079,.047,.057);
    const nail=shapeMaterial(0xcc9579,.53,.0);
    oval(finger,nail,-.228,.469,-.083,.043,.012,.041);
    batchParts(finger);body.userData.finger=finger;
    for(const x of [-.602,.23])for(const y of [-.325,.20]){
      tube(body,edge,v(x,y,.376),v(x,y,.382),.014,.014,10);
      box(body,black,x,y,.383,.019,.003,.002,.001,0).rotation.z=x<0?.57:-.42;
    }
    batchParts(body);
    return body;
  }
  const tele = makeCamera(false), wide = makeCamera(true);
  const service=buildServiceRig(root,group,{box,oval,tube,mesh,batchParts,canvasTexture},
    {black,edge,graphite,rubber,silver,orange,glove,skin,sleeve});
  const hemi = new THREE.HemisphereLight(0xfff2d9,0x86969c,1.9);
  const key = new THREE.DirectionalLight(0xffe6c3,2.75);
  key.position.set(-3,5,2);
  const rim = new THREE.DirectionalLight(0xd1e5ff,1.65);
  rim.position.set(4,2,-4);
  rigScene.add(hemi,key,rim);
  // Sleeves stay attached to the hands when the photographer turns the body on its side.
  const wristRight=v(.96,-.365,.19), wristLeft=v(-.526,-.476,-.53);
  const sleeveGeo=fieldSleeve();
  const arms=[.19,.167].map(radius=>{
    const arm=mesh(root,sleeveGeo,wovenSleeve);arm.userData.radius=radius;return arm;
  });
  const wristWorld=v(0,0,0), axis=v(0,0,0), up=v(0,1,0);
  function placeSleeve(arm, wrist, base, armScale) {
    wristWorld.copy(wrist).applyMatrix4(group.matrix);
    axis.subVectors(wristWorld,base);
    arm.scale.set(arm.userData.radius*armScale,axis.length(),arm.userData.radius*armScale);
    arm.position.addVectors(wristWorld,base).multiplyScalar(.5);
    arm.quaternion.setFromUnitVectors(up,axis.normalize());
  }
  const leftBase=v(0,0,0), rightBase=v(0,0,0);
  const posePosition=v(0,0,0),eyeOffset=v(0,0,0);
  const inverseView=new THREE.Quaternion();
  let smoothWalk=0, rotation=0, lcdPortrait=null;
  function update({time=0,walk=0,aim=0,nudge=0,shutter=0,reload=0,reloadKind='card',reloadSerial=1,
    kit='tele',focalLength=85,portrait=false,swapDip=0,lagX=0,lagY=0,crouch=0,dt=1/60,reducedMotion=false,blackout=false,lighting,viewQuaternion}={}) {
    const aspect = rigScene.userData.aspect || window.innerWidth / window.innerHeight;
    const viewportScale = Math.min(1,aspect / 1.36);
    const isWide=kit==='wide';
    tele.visible=!isWide;
    wide.visible=isWide;
    const active=isWide?wide:tele;
    screenMat.color.setScalar(blackout?.009:1);
    active.userData.finderGraphics.opacity=blackout?.015:1;
    const press=clamp(shutter,0,1);
    active.userData.finger.rotation.z=.10*press;
    active.userData.trigger.position.y=-.017*press;
    if(lighting&&viewQuaternion){
      inverseView.copy(viewQuaternion).invert();
      key.position.copy(lighting.keyDirection).applyQuaternion(inverseView);
      key.color.copy(lighting.keyColor);key.intensity=lighting.keyIntensity;
      hemi.color.copy(lighting.skyColor);hemi.groundColor.copy(lighting.groundColor);hemi.intensity=lighting.fillIntensity;
      rim.color.copy(lighting.skyColor);rim.intensity=.16+lighting.fillIntensity*.21;
      rigScene.environmentRotation.setFromQuaternion(inverseView);
      rigScene.environmentIntensity=.16+.16*lighting.fillIntensity;
    }
    const step=Math.min(dt,.1);
    const smoothAim=clamp(Number(aim),0,1);
    const zoom=clamp((focalLength-85)/115,0,1);
    tele.userData.extension.position.z=-.49*zoom;
    tele.userData.zoomRing.rotation.z=-.94*(462/512)*zoom;
    smoothWalk=THREE.MathUtils.damp(smoothWalk,Number(walk),12,step);
    rotation=reducedMotion ? Number(portrait) : THREE.MathUtils.damp(rotation,Number(portrait),18,step);
    if(lcdPortrait!==portrait) {
      // The body rolls anticlockwise. The portrait sensor's top edge is the LCD's local right.
      const coords=portrait ? [0,0, 0,1, 1,0, 1,1] : [0,1, 1,1, 0,0, 1,0];
      for(const uv of screens){uv.array.set(coords);uv.needsUpdate=true;}
      lcdPortrait=portrait;
    }
    const cycle=clamp(Number(reload)||0,0,1), serviceWeight=servicePose(cycle);
    const motion=reducedMotion ? 0 : 1;
    const sway=Math.sin(time*8.9)*smoothWalk*motion*(1-.56*crouch);
    const turnX=clamp(lagX,-1,1)*motion, turnY=clamp(lagY,-1,1)*motion;
    const serviceScale=.50*Math.min(1,aspect/.98);
    const restScale=THREE.MathUtils.lerp((isWide?.376:.445)*viewportScale,serviceScale,serviceWeight);
    const evfHeight=(isWide?.074:.100)*(portrait?1.5:1);
    const opticalAspect=portrait?2/3:1.5;
    const finderHalfAngle=Math.tan(55*Math.PI/360)*.92*Math.min(1,aspect/opticalAspect);
    // Keep the eye glass ahead of the near plane, also for a phone-sized camera model.
    const gearScale=THREE.MathUtils.lerp(restScale,Math.max(restScale,2*.050*finderHalfAngle/evfHeight),smoothAim);
    group.scale.setScalar(gearScale);
    group.position.set(
      aspect*(.347-.19*smoothAim) + viewportScale*(.008*sway+.029*turnX-.035*rotation),
      -.442-.32*(1-viewportScale)+.20*smoothAim+.026*crouch+.128*rotation
        +.009*smoothWalk*Math.abs(Math.cos(time*8.9))*motion+.003*Math.sin(time*1.65)*motion
        +.021*turnY-.77*swapDip,
      -1.46+.006*shutter*motion+.065*smoothAim);
    group.rotation.set(
      -.06+.014*sway+.016*shutter*motion+.042*turnY-.35*swapDip,
      (isWide ? .51 : .54)*(1-.65*smoothAim)+.005*sway+.08*turnX,
      -.045+.011*sway+rotation*Math.PI/2+.012*turnX);
    // The eyecup is the pivot. Bring its glass to the centerline and then to the
    // eye so the last part of the raise fills the screen across both orientations.
    const align=THREE.MathUtils.smoothstep(smoothAim,.04,.88);
    const lift=THREE.MathUtils.smootherstep(smoothAim,0,.98);
    group.rotation.x*=1-align;group.rotation.y*=1-align;
    group.rotation.z=THREE.MathUtils.lerp(group.rotation.z,rotation*Math.PI/2,align);
    eyeOffset.set(isWide?-.52:-.16,isWide?.346:.425,isWide?.367:.362)
      .multiplyScalar(gearScale).applyQuaternion(group.quaternion);
    posePosition.copy(eyeOffset).multiplyScalar(-1);
    // At contact, the live image exactly spans the sensor's on-screen guides.
    // This keeps subject size continuous as the renderer switches to the finder.
    posePosition.z-=evfHeight*gearScale/(2*finderHalfAngle);
    group.position.lerp(posePosition,lift);
    const isBattery=reloadKind==='battery';
    // Turn the actual port toward the photographer before reaching for the latch.
    group.position.lerp(posePosition.set(aspect*.125,isBattery?.02:-.11,-1.58),serviceWeight);
    group.rotation.set(
      THREE.MathUtils.lerp(group.rotation.x,isBattery?-1.12:-.105,serviceWeight),
      THREE.MathUtils.lerp(group.rotation.y,isBattery?.28:.85,serviceWeight),
      THREE.MathUtils.lerp(group.rotation.z,isBattery?-.28:.13,serviceWeight));
    const powered=!(isBattery&&cycle>=.30&&cycle<.88);
    tele.userData.monitor.visible=wide.userData.monitor.visible=powered;
    tele.userData.evf.visible=wide.userData.evf.visible=smoothAim>.16;
    service.update({cycle,nudge,kind:reloadKind||'card',serial:reloadSerial,aspect,gearScale,wide:isWide,wristLeft});
    rightBase.set(aspect*(.57+.21*rotation),-1.23,-.78);
    leftBase.set(aspect*(.086-.31*serviceWeight),-1.38,-.90);
    placeSleeve(arms[0],wristRight,rightBase,gearScale);
    placeSleeve(arms[1],wristLeft,leftBase,gearScale);
  }
  update();
  return {group:root,update};
}
