// Judge Dean LLC
import * as THREE from 'three';
import { buildReceptionHall } from './reception-hall.js';
import { buildEstateExpansion } from './estate-expansion.js';
import { createEstateLighting } from './estate-lighting.js';
import { createEstateWind } from './estate-wind.js';

export function buildVenue(scene) {
  let seed = 61084;
  const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  const range = (min, max) => min + random() * (max - min);
  const pick = (values) => values[Math.floor(random() * values.length)];
  const TAU = Math.PI * 2;
  const colliders = [];
  const instances = new Map();
  let batchArea='Courtyard';
  const wind = createEstateWind();
  let activeBend = null;
  function bendFrom(anchorY, slope, build) {
    const previous = activeBend;
    activeBend = [anchorY, slope, 0];
    build();
    activeBend = previous;
  }
  const geometry = {
    box: new THREE.BoxGeometry(1, 1, 1),
    rod: new THREE.CylinderGeometry(1, 1, 1, 8),
    round: new THREE.CylinderGeometry(1, 1, 1, 32),
    cone: new THREE.ConeGeometry(1, 1, 9),
    pot: new THREE.CylinderGeometry(1, 0.76, 1, 12),
    flowerpot: new THREE.CylinderGeometry(1, 0.53, 1, 16),
    pebble: new THREE.IcosahedronGeometry(1, 0),
    crown: new THREE.IcosahedronGeometry(1, 1),
    globe: new THREE.SphereGeometry(1, 10, 8),
    leaf: new THREE.OctahedronGeometry(1, 0)
  };
  const occluders = [];
  const occlusionMaterial = new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  function occlude(x,y,z,w,h,d,yaw=0) {
    const proxy=new THREE.Mesh(geometry.box,occlusionMaterial);
    proxy.position.set(x,y,z);
    proxy.scale.set(w,h,d);
    proxy.rotation.y=yaw;
    proxy.updateMatrixWorld(true);
    occluders.push(proxy);
  }
  const clay = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.88, flatShading: true});
  const lightBulb = new THREE.MeshBasicMaterial({color: 0xfff5cd});
  const scratch = new THREE.Object3D();
  const colorScratch = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);
  const transformPoint = new THREE.Vector3();
  function add(shape, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, material = clay) {
    const key = batchArea + ':' + shape + ':' + material.uuid;
    if (!instances.has(key)) instances.set(key, {geometry: geometry[shape], material, matrices: [], colors: []});
    const batch = instances.get(key);
    scratch.position.set(x, y, z);
    scratch.rotation.set(rx, ry, rz);
    scratch.scale.set(sx, sy, sz);
    scratch.updateMatrix();
    batch.matrices.push(scratch.matrix.clone());
    batch.colors.push(colorScratch.set(color).clone());
    if (activeBend && !batch.flex) batch.flex = Array((batch.matrices.length - 1) * 3).fill(0);
    if (batch.flex) {
      if (activeBend) batch.flex.push(...activeBend);
      else batch.flex.push(0, 0, 0);
    }
  }
  const box = (color, x,y,z, w,h,d, rx=0,ry=0,rz=0) => add('box',color,x,y,z,w,h,d,rx,ry,rz);
  function rod(color, ax,ay,az,bx,by,bz,r) {
    const delta = transformPoint.set(bx-ax,by-ay,bz-az);
    const length = delta.length();
    if (!length) return;
    const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up,delta.normalize()));
    add('rod',color,(ax+bx)/2,(ay+by)/2,(az+bz)/2,r,length,r,euler.x,euler.y,euler.z);
  }
  // Store the same footprint as the visible floor, including rotated estate lanes.
  // At a seam the upper layer wins, so a rug or a timber deck masks its base.
  const floors=[];
  function footing(material,x,z,w,d,top,yaw=0){
    floors.push({material,x,z,hw:w/2,hd:d/2,top,c:Math.cos(yaw),s:Math.sin(yaw)});
  }
  function footingAt(x,z){
    let top=-Infinity,material='grass';
    for(const f of floors){
      if(f.top<top)continue;
      const dx=x-f.x,dz=z-f.z;
      if(Math.abs(dx*f.c-dz*f.s)<=f.hw&&Math.abs(dx*f.s+dz*f.c)<=f.hd){
        top=f.top;material=f.material;
      }
    }
    return material;
  }
  function flagstone(x,z,w,d) {
    footing('stone',x,z,w+.01,d+.01,.038);
    box(pick([0xcbb29a,0xc3aa90,0xc9af96,0xcfb99d]),x,0.011,z,w,0.054,d,0,0.002*random());
  }

  scene.background = new THREE.Color(0xf1c7a1);
  scene.fog = new THREE.FogExp2(0xe5c7ad, 0.015);
  const lighting=createEstateLighting(scene);

  const skyMaterial = new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false, fog:false, uniforms:{ dusk:{value:0}, storm:{value:0}, sunDirection:{value:lighting.direction} },
    vertexShader:`varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 direction; uniform float dusk,storm;uniform vec3 sunDirection;
      float hash(vec2 p){return fract(sin(dot(p,vec2(41.34,113.97)))*18315.231);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      void main(){vec3 n=normalize(direction);float h=max(n.y,0.);vec3 c=mix(vec3(.94,.75,.60),vec3(.32,.61,.79),smoothstep(-.04,.64,h));c=mix(c,vec3(.17,.41,.65),smoothstep(.58,1.,h)*.7);
      vec2 uv=n.xz/(h+.12)*vec2(1.4,5.);float f=noise(uv)*.55+noise(uv*2.11)*.28+noise(uv*4.23)*.13+noise(uv*8.2)*.04;
      float clouds=smoothstep(.53,.78,f)*smoothstep(.015,.18,h)*(1.-smoothstep(.65,1.,h));c=mix(c,vec3(1.,.91,.79),clouds*.55);
      float sunDot=max(dot(n,sunDirection),0.);
      float glow=pow(sunDot,26.);c+=vec3(.30,.16,.055)*glow;
      vec3 night=mix(vec3(.33,.19,.27),vec3(.028,.046,.115),smoothstep(-.02,.45,h));
      c=mix(c,night,dusk);
      float disk=smoothstep(.99987,.99995,sunDot);
      c+=(1.-dusk)*(1.-storm)*(vec3(1.,.74,.42)*disk+.075*vec3(1.,.77,.52)*pow(sunDot,280.));
      if(storm>0.) {
        float cloud=noise(uv*.67)+.27*noise(uv*2.8);
        vec3 rainSky=mix(vec3(.073,.095,.133),vec3(.29,.32,.36),smoothstep(.25,1.,cloud));
        c=mix(c,rainSky,storm*.86);
      }
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(92,48,20),skyMaterial);
  sky.renderOrder = -10;
  scene.add(sky);

  // The valley skyline uses several overlapping ridges with individually lit facets.
  const ridgeMaterial=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
  const ridgeDay=new THREE.Color(0xffffff),ridgeNight=new THREE.Color(0x7c8094),ridgeRain=new THREE.Color(0x91a5b8);
  function ridge(z, base, amplitude, wave, colors, phase) {
    const vertices = [], vertexColors = [];
    const heights = [];
    for(let i=0; i<=66; i++) {
      const x=-99+i*3;
      const y=base+(Math.sin(x*wave+phase)*.52+Math.sin(x*wave*.40+phase*.7)*.31+Math.cos(x*wave*1.73)*.17)*amplitude+range(-.28,.28);
      heights.push(y);
    }
    function tri(a,b,c,col) {
      vertices.push(...a,...b,...c);
      const color = new THREE.Color(col);
      for(let j=0;j<3;j++) vertexColors.push(color.r,color.g,color.b);
    }
    for(let i=0;i<66;i++) {
      const x=-99+i*3;
      const a=[x,heights[i],z],b=[x+3,heights[i+1],z],d=[x+range(-1.5,1.5),-1,z+5],e=[x+3,-1,z+5];
      tri(a,d,b,pick(colors));tri(b,d,e,colors[1]);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(vertexColors,3));
    const m=new THREE.Mesh(g,ridgeMaterial);
    scene.add(m);
  }
  ridge(-65,8.7,5.3,.105,[0xb5afb0,0xb5abad,0xbdb1b0],2.9);
  ridge(-48,5.8,3.6,.15,[0x9c9e98,0xa6a39d,0xa5a39a],1.2);
  ridge(-33,2.7,2.8,.17,[0x91977f,0x9d9e88,0x9b9f8d],3.9);

  // Fine-grained gravel and closely cut turf are continuous walkable surfaces.
  function grainTexture() {
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#e7e4dc';ctx.fillRect(0,0,256,256);
    for(let i=0;i<9200;i++) {
      const a=range(.04,.17);ctx.fillStyle=random()<.53?'rgba(92,74,52,'+a+')':'rgba(255,255,255,'+a+')';
      ctx.fillRect(random()*256,random()*256,range(.5,2.2),range(.5,1.8));
    }
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.repeat.set(85,70);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    return texture;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(350,288),new THREE.MeshStandardMaterial({color:0xb6aa7d,roughness:1,map:grainTexture()}));
  ground.rotation.x=-Math.PI/2;ground.position.set(0,-.035,44);ground.receiveShadow=true;scene.add(ground);
  // Rows of limestone pavers surround the central gravel garden.
  for(let i=-12;i<=12;i++) for(let j=-5;j<11;j++) {
    const x=i*1.12+(j%2)*.56, z=j*1.18;
    if(Math.abs(x)>5.4 || z<-4.8 || z>6.8) flagstone(x,z,1.115,1.175);
  }
  for(let side of [-1,1]) {
    box(0x8b8b66,side*3.52,-.004,2.1,3.75,.046,9.25);
    for(let j=0;j<14;j++) flagstone(side*1.67,-6.4+j*1.16,.23,1.15);
  }
  footing('carpet',0,1.1,3.10,15.8,.046);
  box(0xf4dfbf,0,.026,1.1,3.10,.04,15.8);
  for(let side of [-1,1]) {
    box(0xc5a578,side*1.48,.053,1.1,.015,.008,15.8);
    box(0xd5b98f,side*1.445,.053,1.1,.012,.008,15.8);
  }

  // Stone villa with segmented Roman arches, cornices and terracotta pantiles.
  function villa(cx,cz,width,depth,height,body,roof,windows) {
    const front=cz+depth/2;
    occlude(cx,height*.5,cz,width,height,depth);
    box(body,cx,height*.5,cz,width,height,depth);
    box(0xc0a387,cx,.21,front,width,.42,.14);
    box(0xb69b83,cx,height-.27,cz,width+.14,.17,depth+.14);
    box(0xe6ceb1,cx,height-.09,cz,width+.32,.17,depth+.32);
    const rise=depth*.18;
    for(let side of [-1,1]) box(roof,cx,height+rise*.48,cz+side*depth*.25,width+.6,.18,depth*.556,side*Math.atan(rise/(depth*.5)));
    const tileRows=Math.ceil(width/.30);
    for(let i=0;i<=tileRows;i++) {
      const x=cx-width*.5+i*width/tileRows;
      for(let side of [-1,1]) rod(pick([roof,0xa5583e,0xbb7353,0xa96549]),x,height+rise+.08,cz,x,height+.07,cz+side*(depth*.5+.16),.049);
    }
    rod(0xc3805b,cx-width*.5-.25,height+rise+.1,cz,cx+width*.5+.25,height+rise+.1,cz,.105);
    for(let i=0;i<windows;i++) {
      const x=cx-width*.5+(i+.5)*width/windows;const winY=height-1.45;
      box(0xdfc6a6,x,winY,front+.08,1.08,1.61,.10);
      box(0x384e4d,x,winY+.03,front+.155,.83,1.37,.06);
      box(0x8c8871,x,winY+.04,front+.19,.043,1.35,.04);
      box(0x8c8871,x,winY+.09,front+.19,.81,.04,.04);
      for(const side of [-1,1]) {
        box(0x65766a,x+side*.66,winY+.04,front+.08,.42,1.38,.14);
        for(let j=0;j<8;j++) box(0x4a6257,x+side*.66,winY-.46+j*.14,front+.161,.35,.025,.02);
      }
      box(0xdec7a7,x,winY-.77,front+.15,1.17,.12,.25);
      if(height>4.9) loggia(x,front,1.82,1.35);
    }
    const chimneyX=cx+width*.31;
    box(body,chimneyX,height+rise+.35,cz,.45,.89,.5);
    box(roof,chimneyX,height+rise+.79,cz,.62,.13,.67);
  }
  function loggia(x,front,span,leg) {
    const r=span*.49;
    box(0x5a5148,x,leg*.5,front+.09,r*2,leg,.10);
    // A circular upper window with a lower rectangle forms a solid arched opening.
    add('round',0x5a5148,x,leg,front+.08,r,.11,r,Math.PI/2);
    for(let i=0;i<11;i++){
      const a=Math.PI*(i+.5)/11;
      box(i%3===0?0xd7bc99:0xe1c7a2,x+Math.cos(a)*(r+.095),leg+Math.sin(a)*(r+.095),front+.19,(r+.095)*Math.PI/11*.98,.21,.25,0,0,a-Math.PI/2);
    }
    for(let s of [-1,1]) {
      box(0xdcc3a7,x+s*(r+.095),leg*.5,front+.19,.21,leg,.25);
      box(0xe9d4b6,x+s*(r+.095),leg-.02,front+.23,.30,.11,.28);
    }
    for(let k=-1;k<=1;k++) box(0x837763,x+k*r*.54,leg*.5,front+.17,.033,leg,.05);
  }
  villa(10.5,-17.3,14,5.9,5.5,0xc79a78,0xac6243,6);
  villa(18.3,-14.2,5.6,4.8,4.6,0xdebb8e,0xab654b,3);
  villa(-16.9,-15.5,9.4,5.6,4.3,0xd3ae87,0xaa6449,4);
  villa(11.7,-19.5,3.7,3.8,8.6,0xcaa27d,0xb56d4a,2);
  occlude(0,.59,-11.7,30,1.18,.40);
  for(let k=-14;k<15;k+=2) {
    box(0xbba286,k,0.56,-11.7,1.99,1.14,.4);
    box(0xdfc6a8,k,1.15,-11.7,2.02,.11,.56);
    if(k%4===0) {box(0xc6af91,k,.68,-11.7,.55,1.36,.62);box(0xe2c9a7,k,1.40,-11.7,.68,.13,.74);}
  }
  // Italian cypress, umbrella pines and silver-leaf olive trees give the courtyard its scale.
  function cypress(x,z,h,w) {
    if(z>-13){occlude(x,h*.50,z,w*.94,h*.8,w*.94);colliders.push({x,z,r:w*.53});}
    const shades=[0x465c44,0x546846,0x5c704b,0x64774d,0x748459];
    add('rod',0x715944,x,h*.22,z,w*.12,h*.45,w*.12);
    bendFrom(h*.14, .045, () => {
      add('crown',0x4e654b,x,h*.50,z,w,h*.45,w,0,range(0,TAU));
      for(let j=0;j<12;j++) {
        const f=j/12, a=j*2.4;
        add('crown',pick(shades),x+Math.cos(a)*w*.33*(1-f),h*(.25+.63*f),z+Math.sin(a)*w*.33*(1-f),w*(.88-.55*f),h*(.19-.06*f),w*(1-.56*f),0,a,.05*Math.sin(a));
      }
      add('cone',0x637750,x,h*.87,z,w*.39,h*.24,w*.39);
    });
  }
  for(let i=0;i<33;i++) cypress(-30+i*1.9+range(-.9,.9),range(-26,-21),range(3.4,6.3),range(.4,.69));
  for(const [x,z,h,w] of [[-10,-9,5.8,.72],[-7.1,-9.9,4.8,.58],[6.6,-9.7,5.5,.61],[8.3,-10.4,6.9,.63],[-14,-1,7,.79],[13,-8.4,6,.8],[-15,7,6.2,.74],[14,9,5.6,.69]]) cypress(x,z,h,w);
  function olive(x,z,h,size) {
    if(z>-13){occlude(x+.09,h*.24,z,.27*size,h*.48,.27*size);colliders.push({x,z,r:.20*size});}
    const rootColor=0x716650;
    rod(rootColor,x,0,z,x+.29,h*.48,z-.16,.16*size);
    rod(0x8c7960,x+.03,.075,z+.07,x-.08,h*.45,z,.12*size);
    bendFrom(h*.37, .078, () => {
      for(let i=0;i<8;i++) {
        const a=i*TAU/8+range(-.16,.16), dist=range(.65,1.45)*size;
        const dx=Math.cos(a)*dist,dz=Math.sin(a)*dist;
        const top=h*range(.77,1.07);
        rod(rootColor,x+.2,h*.37,z-.1,x+dx*.67,h*.67,z+dz*.67,.085*size);
        rod(0x8a7a62,x+dx*.67,h*.67,z+dz*.67,x+dx,top,z+dz,.062*size);
        for(let j=0;j<7;j++) {
          const rad=range(.43,.74)*size;
          add('crown',pick([0x819070,0x8b977b,0x9ca487,0x748666,0x768667,0x8d9b7f]),x+dx+range(-.54,.54)*size,top+range(-.19,.24)*size,z+dz+range(-.52,.52)*size,rad,rad*range(.56,.8),rad*range(.8,1.2),range(-.25,.25),a);
        }
      }
    });
  }
  olive(-8.4,-4.2,4.2,1.45);olive(11,-6.4,4.0,1.27);olive(-12.7,6.1,5.0,1.56);olive(12.1,11.9,4.8,1.28);
  for(let i=0;i<13;i++) olive(-28+i*4.4+range(-1.4,.4),range(-19,-16),range(2.6,4.2),range(.73,1.38));
  function pine(x,z,h) {
    rod(0x7a6251,x,0,z,x+.18,h*.76,z,.24);
    bendFrom(h*.63, .042, () => {
      for(let i=0;i<13;i++) {
        const a=i*2.4, r=Math.sqrt(i/13)*h*.37;
        const dx=Math.cos(a)*r,dz=Math.sin(a)*r;
        rod(0x746451,x,h*.63,z,x+dx,h*.94-r*.14,z+dz,.095);
        add('crown',pick([0x62765a,0x6e805c,0x788760,0x566e54]),x+dx,h-r*.19,z+dz,h*range(.15,.24),h*range(.08,.13),h*range(.16,.23),0,a);
      }
    });
  }
  pine(-10.9,-14,8.7);pine(-20.5,-19.2,10.5);pine(20,-18.9,9.9);
  for(let side of [-1,1]) for(let i=0;i<15;i++) {
    if(side===1 && i>=4 && i<=11)continue; // Keep the reception doors and their approach open.
    if(side===-1 && i>=6 && i<=9)continue; // West garden gate.
    const hx=side*(side===1?13.12:14)+range(-.38,.38), hz=-10+i*1.62;
    bendFrom(0, .055, () => {
      add('crown',pick([0x65764f,0x75855b,0x7b895a]),hx,.56,hz,1.1,range(.6,1.0),1.06,0,range(0,TAU));
    });
    colliders.push({x:hx,z:hz,r:.75});occlude(hx,.6,hz,1.25,1.15,1.25);
  }

  // Bentwood chairs have turned legs, spindle backs and a padded linen seat.
  function chair(x,z,yaw) {
    const local=(a,h,b)=>[x+a*Math.cos(yaw)+b*Math.sin(yaw),h,z-a*Math.sin(yaw)+b*Math.cos(yaw)];
    const stick=(a,h,b,c,j,d,r,col=0xb69364)=>rod(col,...local(a,h,b),...local(c,j,d),r);
    const seat=local(0,.49,0);
    occlude(...seat,.53,.14,.48,yaw);
    occlude(...local(0,.955,.255),.48,.13,.047,yaw);
    box(0xf4dfbb,...seat,.53,.09,.48,0,yaw);
    box(0xac8758,...local(0,.424,0),.51,.064,.47,0,yaw);
    for(const s of [-1,1]) {
      stick(s*.205,.445,-.17,s*.245,.031,-.238,.026);
      stick(s*.20,.445,.18,s*.23,.03,.23,.026);
      stick(s*.20,.46,.18,s*.235,1.01,.265,.023);
      stick(s*.222,.22,-.20,s*.22,.22,.2,.014);
      add('globe',0xc29b62,...local(s*.235,1.015,.265),.034,.029,.034);
    }
    stick(-.228,1.0,.265,.228,1.0,.265,.031);
    stick(-.225,.89,.246,.225,.89,.246,.021);
    stick(-.216,.67,.213,.216,.67,.213,.02);
    for(let i=-2;i<=2;i++) stick(i*.068,.67,.213,i*.07,.89,.246,.011);
    colliders.push({x,z,r:.32});
  }
  for(const s of [-1,1]) for(let row=0;row<5;row++) for(let col=0;col<3;col++) {
    chair(s*(2.20+col*.85),-.50+row*1.35+(col%2)*.028,s*(-.05-col*.024));
  }

  const leaves=[0x617756,0x849470,0x657e65,0x889a80,0x9aaa8c];
  const bloomColors=[[0xda896d,0xe4a189,0xf2b497],[0xd59291,0xe7b1a7,0xf1c7b4],[0xe8ceb4,0xf6e1ca,0xffecd7],[0xca715a,0xd8876f,0xe4a084]];
  function rose(x,y,z,r,palette) {
    add('pebble',palette[0],x,y,z,r*.82,r*.66,r*.78,0,random()*TAU);
    const spin=random()*TAU;
    for(let k=0;k<5;k++){
      const a=k*TAU/5+spin;
      add('pebble',palette[1+k%2],x+Math.cos(a)*r*.48,y+Math.sin(a)*r*.41,z+r*.19,r*.53,r*.50,r*.4,.42,a,a);
    }
    add('pebble',palette[0],x+.04*r,y+r*.05,z+r*.50,r*.42,r*.39,r*.30,.16,spin);
  }
  function leaf(x,y,z,len,w,a,b,color=pick(leaves)) {
    add('leaf',color,x,y,z,w,len,w*.35,b,a,a);
  }
  function gardenSpray(x,y,z,size,n=13) {
    bendFrom(y, batchArea==='Reception' ? .044 : .115, () => {
      for(let k=0;k<n;k++) {
        const a=random()*TAU, radius=range(.12,.58)*size;
        const dx=Math.cos(a)*radius,dz=Math.sin(a)*radius,dy=range(.24,.98)*size;
        rod(0x768565,x,y,z,x+dx,y+dy,z+dz,.008*size);
        for(let i=1;i<=4;i++){
          const f=i*.19,dir=i%2===0?1:-1;
          leaf(x+dx*f+.045*dir*size,y+dy*f,z+dz*f,.094*size,.044*size,dir*(.45+a*.08),a+i);
        }
        if(k%3!==0) rose(x+dx,y+dy,z+dz,range(.063,.107)*size,pick(bloomColors));
        else for(let j=0;j<6;j++){
          const angle=j*2.4;
          add('pebble',pick([0xf2d7b9,0xffe7c8,0xe8c5b5]),x+dx+Math.cos(angle)*.055*size,y+dy+j*.020*size,z+dz+Math.sin(angle)*.055*size,.035*size,.038*size,.035*size);
        }
      }
    });
  }
  function urn(x,z,s) {
    occlude(x,.34*s,z,.46*s,.68*s,.46*s);
    colliders.push({x,z,r:.29*s});
    add('round',0xbd936b,x,.055*s,z,.33*s,.11*s,.33*s);
    add('flowerpot',0xc49b74,x,.22*s,z,.135*s,.27*s,.135*s);
    add('flowerpot',0xe0bfa0,x,.46*s,z,.35*s,.30*s,.35*s);
    add('round',0xe9ccab,x,.61*s,z,.36*s,.072*s,.36*s);
    add('round',0x625b49,x,.652*s,z,.306*s,.02*s,.306*s);
    gardenSpray(x,.64*s,z,s*.99,21);
  }

  // Timber ceremony arbor. The fabric is a pleated surface suspended from its attachment points.
  const az=-6.0, aw=2.3, ah=3.45;
  for(const side of [-1,1]) {
    occlude(side*aw,ah/2,az,.15,ah,.18);
    box(0xb78f64,side*aw,ah/2,az,.14,ah,.17);
    box(0x9b7757,side*aw,ah/2,az-.57,.14,ah,.17);
    rod(0xb29269,side*aw,.06,az+.25,side*aw,.06,az-.86,.14);
    box(0xc49c73,side*aw,ah,az-.28,.2,.17,.96);
    rod(0xad855f,side*aw,ah-.68,az,side*(aw-.65),ah,az,.058);
    colliders.push({x:side*aw,z:az,r:.22});
  }
  box(0xb88e64,0,ah,az,aw*2+.46,.19,.22);
  box(0xa38161,0,ah,az-.56,aw*2+.46,.15,.17);
  const silk=new THREE.MeshStandardMaterial({color:0xffead7,roughness:.92,side:THREE.DoubleSide,flatShading:false});
  function fabricSurface(nx,ny,point,weight) {
    const pts=[],indices=[];
    for(let j=0;j<=ny;j++) for(let i=0;i<=nx;i++) pts.push(...point(i/nx,j/ny));
    for(let j=0;j<ny;j++) for(let i=0;i<nx;i++) {
      const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,b,b+1,a+1);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(indices);g.computeVertexNormals();
    const m=new THREE.Mesh(g,silk);m.castShadow=true;m.receiveShadow=true;
    wind.cloth(m, i => weight((i % (nx+1))/nx, Math.floor(i/(nx+1))/ny));
    scene.add(m);
  }
  fabricSurface(64,12,(u,v)=>{
    const sag=Math.sin(u*Math.PI);
    return [-aw+aw*2*u,ah+.065-sag*(.07+.52*v)-v*.09,az+.12+.047*Math.sin(v*7*Math.PI+sag*1.7)+sag*.06];
  }, (u,v) => Math.sin(u*Math.PI)*(.028+.115*v));
  for(const s of [-1,1]) fabricSurface(14,38,(u,v)=>{
    const gather=Math.exp(-Math.pow((v-.48)*6.3,2));
    const width=.55-gather*.42+v*.16;
    return [s*(aw-.16+gather*.28)+(u-.5)*width,ah*(1-v)+.035,az+.09+Math.sin(u*9*Math.PI+v*8)*.045*(1-.65*gather)+Math.sin(v*Math.PI)*.16];
  }, (u,v) => v < .48 ? .105*Math.sin(v*Math.PI/.48) : .26*((v-.48)/.52)**1.3);
  function garland(x,y,z,scale,angle) {
    // Each cluster mixes eucalyptus sprays, roses in three stages, and ivory buds.
    bendFrom(y-.38*scale, .083, () => {
      for(let i=0;i<17;i++) {
        const a=range(0,TAU),r=range(.04,.29)*scale;
        const lx=x+Math.cos(a)*r,ly=y+Math.sin(a)*r,lz=z+range(-.09,.08)*scale;
        leaf(lx,ly,lz,.16*scale,.068*scale,a+angle,range(-.77,.77));
        if(i%4===0) rose(lx,ly,lz+.095*scale,range(.065,.113)*scale,pick(bloomColors));
        if(i%6===0) {
          rod(0x849478,lx,ly,lz,lx+.17*Math.cos(a)*scale,ly+.17*Math.sin(a)*scale,lz+.024,.007*scale);
          add('pebble',0xffe2c6,lx+.17*Math.cos(a)*scale,ly+.17*Math.sin(a)*scale,lz+.024,.042*scale,.043*scale,.037*scale);
        }
      }
    });
  }
  for(let i=0;i<15;i++) {
    const u=i/14;
    garland(-aw+u*3.0,ah+.02+Math.sin(u*Math.PI)*.085,az+.17,(1.31-.64*u)*(1+.13*Math.sin(u*5)),.3);
    if(i<10) garland(-aw+.02,ah-.18-i*.132,az+.17,1.13-i*.068,-.65);
  }
  for(let i=0;i<10;i++) {
    const u=i/9;garland(aw-(1-u)*.92,ah+.05-.92*Math.pow(u,3),az+.17,.76+.11*Math.sin(u*Math.PI),-.7);
  }
  urn(-aw-.53,az+.10,1.23);urn(aw+.53,az+.10,1.23);
  for(let s of [-1,1]) {
    gardenSpray(s*1.83,.07,-4.87,.92,18);
    for(let i=0;i<4;i++) {
      const z=-1.27+i*2.06;
      gardenSpray(s*1.77,.05,z,.56+random()*.13,9);
    }
    urn(s*1.97,6.66,.88);
  }
  // Opaque glass candles framed with brushed brass.
  function lantern(x,z,s) {
    box(0x856b4d,x,.041*s,z,.29*s,.07*s,.29*s);
    add('round',0xf3dbaf,x,.195*s,z,.073*s,.25*s,.073*s);
    add('globe',0xffefc9,x,.336*s,z,.019*s,.039*s,.019*s,0,0,0,lightBulb);
    for(const i of [-1,1]) for(const j of [-1,1]) box(0xb09564,x+i*.13*s,.25*s,z+j*.13*s,.016*s,.43*s,.016*s);
    box(0xa68b5d,x,.475*s,z,.29*s,.034*s,.29*s);
    add('cone',0xb19a72,x,.531*s,z,.209*s,.091*s,.209*s,0,Math.PI/4);
  }
  for(let s of [-1,1]) for(let i=0;i<4;i++) lantern(s*1.76,-3.03+i*2.72,range(.72,1.03));

  // Delicate strings sweep over the clearing. Bulbs are small pear-shaped solids.
  function stringLight(start,end,dip,steps) {
    function point(t) {return [THREE.MathUtils.lerp(start[0],end[0],t),THREE.MathUtils.lerp(start[1],end[1],t)-4*t*(1-t)*dip,THREE.MathUtils.lerp(start[2],end[2],t)];}
    bendFrom(start[1], -.076, () => {
      for(let i=0;i<steps;i++){
        const a=point(i/steps),b=point((i+1)/steps);rod(0x534f44,...a,...b,.011);
        const [x,y,z]=point((i+.5)/steps);
        rod(0x5b5646,x,y,z,x,y-.092,z,.013);
        add('rod',0x877558,x,y-.093,z,.024,.043,.024);
        add('globe',0xffe5a5,x,y-.166,z,.047,.067,.047,0,0,0,lightBulb);
      }
    });
  }
  for(let s of [-1,1]) for(const z of [-6.9,1.6,10]) {
    rod(0x8b7756,s*7.35,0,z,s*7.35,4.94,z,.066);
    add('globe',0xcfaa67,s*7.35,4.95,z,.086,.085,.086);
    colliders.push({x:s*7.35,z,r:.16});
  }
  stringLight([-7.35,4.91,-6.9],[7.35,4.91,-6.9],.88,22);
  stringLight([-7.35,4.91,1.6],[7.35,4.91,-6.9],1.04,25);
  stringLight([-7.35,4.91,-6.9],[7.35,4.91,1.6],1.08,25);
  stringLight([-7.35,4.91,10],[7.35,4.91,1.6],.99,25);
  stringLight([-7.35,4.91,1.6],[7.35,4.91,10],.99,25);
  stringLight([-7.35,4.91,10],[7.35,4.91,10],.84,23);

  function receptionTable(x,z) {
    const height=.92,radius=1.0;
    occlude(x,height*.53,z,radius*1.46,height*.93,radius*1.46);
    add('round',0xa58262,x,.44,z,.14,.86,.14);
    add('round',0xdec8a6,x,height-.035,z,radius,.10,radius);
    const vertices=[],indices=[];
    for(let level=0;level<=5;level++) for(let i=0;i<=96;i++) {
      const a=TAU*i/96,f=level/5;
      const r=radius*(1-.1*f)+.034*f*Math.sin(18*a)+.016*f*Math.sin(11*a+1.7);
      vertices.push(x+Math.cos(a)*r,height-.04-f*.78+.05*f*(.5+.5*Math.cos(a*9)),z+Math.sin(a)*r);
    }
    for(let j=0;j<5;j++) for(let i=0;i<96;i++){const n=j*97+i;indices.push(n,n+1,n+97,n+1,n+98,n+97);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const m=new THREE.Mesh(g,silk);m.castShadow=true;m.receiveShadow=true;
    const hemMotion = batchArea==='Reception' ? .028 : .091;
    wind.cloth(m, (_i,_x,y) => hemMotion*Math.max(0,(height-.04-y)/.78)**1.3);
    scene.add(m);
    add('round',0xd0ad8b,x,height+.13,z,.14,.24,.14);
    gardenSpray(x,height+.23,z,.47,12);
    for(let k=0;k<6;k++) {
      const a=k*TAU/6+.2;
      add('round',0xf7e7c9,x+Math.cos(a)*.70,height+.026,z+Math.sin(a)*.70,.138,.023,.138);
      const gx=x+Math.cos(a+.25)*.72,gz=z+Math.sin(a+.25)*.72;
      add('rod',0xd9cfb6,gx,height+.07,gz,.012,.10,.012);
      add('pot',0xdac9b3,gx,height+.15,gz,.039,.08,.039);
    }
    colliders.push({x,z,r:radius+.08});
  }
  for(let s of [-1,1]) for(let i=0;i<3;i++) receptionTable(s*(8.8+(i%2)*.6),-2+i*5);
  // Breeze-scattered flower petals along the aisle.
  for(let i=0;i<178;i++){
    const x=(random()<.5?-1:1)*range(.62,1.56);
    add('pebble',pick([0xebc5b2,0xd6998a,0xffead5,0xf4d7c4]),x,.058,range(-5.1,7.31),range(.012,.029),.005,range(.013,.034),0,range(0,TAU));
  }
  // Separate distant rooms so the camera can cull their instanced furnishings.
  batchArea='Reception';
  const hall=buildReceptionHall(scene,{footing,exterior:()=>{batchArea='Estate';},box,rod,add,occlude,colliders,chair,receptionTable,urn,
    gardenSpray,olive,cypress,lightBulb,flagstone,bendFrom,wind});
  const outer=buildEstateExpansion(scene,{footing,areaBatch:name=>{batchArea=name;},box,add,rod,occlude,colliders,lightBulb,chair,bendFrom,wind});
  for(const [key,batch] of instances) {
    const geometry=batch.flex ? batch.geometry.clone() : batch.geometry;
    const mesh=new THREE.InstancedMesh(geometry,batch.material,batch.matrices.length);
    if (batch.flex) wind.dress(mesh,new THREE.InstancedBufferAttribute(new Float32Array(batch.flex),3));
    batch.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,batch.colors[i]);});
    mesh.name=key.split(':',2).join(' ');mesh.castShadow=batch.material===clay;mesh.receiveShadow=mesh.castShadow;
    mesh.computeBoundingSphere();if (batch.flex) mesh.boundingSphere.radius+=.6;scene.add(mesh);
  }
  function update(seconds,day=false,player=null,duration=300,rain=0){
    sky.position.set(player?.x??0,0,player?.z??0);
    const t=day?THREE.MathUtils.clamp(seconds/duration,0,1):-1;
    const dusk=lighting.update(t,player,rain,hall);
    skyMaterial.uniforms.dusk.value=dusk;
    ridgeMaterial.color.copy(ridgeDay).lerp(ridgeNight,dusk).lerp(ridgeRain,.65*rain);
    skyMaterial.uniforms.storm.value=rain;
    ground.material.roughness=1-.62*rain;
  }
  function blocks(x,z){
    return hall.blocks(x,z)||outer.blocks(x,z);
  }
  return {footingAt,colliders,occluders,bounds:outer.bounds,blocks,rigLight:lighting.rigLight,locationAt:outer.locationAt,update,animateAtmosphere:wind.update,
    dressFoliage:(mesh, weight) => wind.cloth(mesh, weight, true)};
}
