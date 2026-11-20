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
    depth, bevelEnabled: bevel > 0, bevelSegments: 2,
    bevelSize: bevel, bevelThickness: bevel, curveSegments: 3
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

export function buildRig(rigScene, liveTexture) {
  const group = new THREE.Group();
  group.name = 'Photographer and mirrorless camera';
  const root = new THREE.Group();
  root.add(group);
  rigScene.add(root);
  const graphite = shapeMaterial(0x282d30, .58, .46);
  const edge = shapeMaterial(0x424a4b, .43, .60);
  const black = shapeMaterial(0x15181a, .79, .12);
  const silver = shapeMaterial(0x9ca6a0, .4, .7);
  const orange = shapeMaterial(0xff6535, .48, .28);
  const rubber = shapeMaterial(0x222423, .89, .06);
  const coating = shapeMaterial(0x232e3d, .20, .58);
  const glove = shapeMaterial(0x393a33, .92, .03);
  const sleeve = shapeMaterial(0x60604e, .97, 0);
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
  const darkDisplay = new THREE.MeshBasicMaterial({color: 0x414f40});
  const directPlane = (parent, mat, x, y, z, w, h) =>
    mesh(parent, new THREE.PlaneGeometry(w,h), mat, x,y,z);
  const ivory = shapeMaterial(0xd9d3bd, .41, .42);
  const titanium = shapeMaterial(0xa8b2ad, .40, .52);
  const leather = shapeMaterial(0x34453e, .92, .06);
  const screenMat = new THREE.MeshBasicMaterial({
    map: liveTexture || null, color: liveTexture ? 0xffffff : 0x728886, toneMapped: false
  });
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
      ctx.fillStyle = '#e6efe6';
      ctx.fillRect(0,280,576,32);
      ctx.fillStyle = '#1f2826';
      ctx.font = 'bold 21px monospace';
      ctx.fillText(wide ? '24 mm     F2.8     ISO 400' : '85–200    F2.8     ISO 400',12,304);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f0f5eb';
      for (const [x,y,sx,sy] of [[255,115,1,1],[321,115,-1,1],[255,173,1,-1],[321,173,-1,-1]]) {
        ctx.beginPath();ctx.moveTo(x+sx*11,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*11);ctx.stroke();
      }
    });
    directPlane(monitor, new THREE.MeshBasicMaterial({map:lcdOverlay,transparent:true,depthWrite:false}),
      -.18,-.040,.387,.75,.50);
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
      box(flash, graphite,0,.076,-.015,.635,.273,.55,.049,.026);
      box(flash, rubber,0,.077,-.295,.633,.268,.064,.041,.009);
      box(flash, silver,0,.073,-.341,.567,.201,.012,.028,.003);
      for (let i=0;i<5;i++)
        box(flash,black,0,.014+i*.031,-.351,.54,.006,.004,.002,.001);
      box(flash, black,0,.069,.27,.545,.19,.019,.024,.005);
      box(flash, edge,-.045,.081,.283,.32,.098,.005,.012,.002);
      box(flash,darkDisplay,-.045,.081,.289,.28,.066,.005,.003,.001);
      for (const x of [-.097,-.063,-.03,.004]) box(flash,black,x,.082,.295,.014,.034,.002,.001,0);
      oval(flash,orange,.177,.096,.29,.026,.026,.008);
      for(let i=0;i<4;i++)
        box(flash,black,-.245+i*.039,-.013,.28,.021,.013,.014,.003,.002);
      batchParts(flash);
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
      segment(coating,-.825,-.841,.342);
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
      flutedRing(body,black,lensX,lensY,-1.49,.389,.345,68);
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
      batchParts(extension);
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
    tube(body,edge,v(.61,.47,-.245),v(.61,.52,-.245),.096);
    tube(body,black,v(.61,.518,-.245),v(.61,.545,-.245),.071);
    oval(body,orange,.42,.475,-.25,.045,.018,.045);
    // Rear directional wheel, function buttons, and a small status light.
    const rearButton=(x,y,r,mat=black,z=.305) =>
      tube(body,mat,v(x,y,z-.013+(x>0?.095:0)),v(x,y,z+.015+(x>0?.095:0)),r,r*.94,24);
    rearButton(.425,-.093,.135,edge);
    rearButton(.425,-.093,.111,rubber,.329);
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
    tube(body,glove,v(.876,.145,-.16),v(.806,.373,-.229),.077,.075);
    tube(body,skin,v(.806,.373,-.229),v(.674,.50,-.244),.069,.058);
    oval(body,skin,.664,.502,-.244,.075,.055,.064);
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
  const arms=[.19,.167].map(radius=>mesh(root,
    new THREE.CylinderGeometry(radius,radius*1.47,1,14),sleeve));
  const wristWorld=v(0,0,0), axis=v(0,0,0), up=v(0,1,0);
  function placeSleeve(arm, wrist, base, armScale) {
    wristWorld.copy(wrist).applyMatrix4(group.matrix);
    axis.subVectors(wristWorld,base);
    arm.scale.set(armScale,axis.length(),armScale);
    arm.position.addVectors(wristWorld,base).multiplyScalar(.5);
    arm.quaternion.setFromUnitVectors(up,axis.normalize());
  }
  const leftBase=v(0,0,0), rightBase=v(0,0,0);
  const posePosition=v(0,0,0),eyeOffset=v(0,0,0);
  let smoothWalk=0, rotation=0, lcdPortrait=null;
  function update({time=0,walk=0,aim=0,nudge=0,shutter=0,reload=0,reloadKind='card',reloadSerial=1,
    kit='tele',focalLength=85,portrait=false,swapDip=0,lagX=0,lagY=0,crouch=0,dt=1/60,reducedMotion=false}={}) {
    const aspect = rigScene.userData.aspect || window.innerWidth / window.innerHeight;
    const viewportScale = Math.min(1,aspect / 1.36);
    const isWide=kit==='wide';
    tele.visible=!isWide;
    wide.visible=isWide;
    const step=Math.min(dt,.1);
    const smoothAim=clamp(Number(aim),0,1);
    tele.userData.extension.position.z=-.49*clamp((focalLength-85)/115,0,1);
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
      -1.46+.032*shutter*motion+.065*smoothAim);
    group.rotation.set(
      -.06+.014*sway+.10*shutter*motion+.042*turnY-.35*swapDip,
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
