// Chapel and courtyard performance · Judge Dean LLC
import * as THREE from 'three';
import { Part } from './guests.js';
import { buildSlash } from './soloist.js';

const chalk=0xf4efe0, oyster=0xd9d7c5, wood=0x75634e, slate=0x50595c, brass=0xab834d;
const chapelX=-29, chapelZ=18.4;
export const SOLO_MARK = Object.freeze({x:-26.9,z:24.2});
const baseMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.84,side:THREE.DoubleSide});

function chapel(p){
  const w=6.4,d=7,h=3.4,rise=2.03,front=d/2;
  p.box([0,.12,0],[w+.26,.24,d+.22],0xc0b59d);
  p.box([0,1.8,0],[w,3.24,d],0xcccbbd);
  // Narrow clapboards stop at the gables, exposing a shadow at each lower lip.
  for(let i=0;i<23;i++){
    const y=.27+i*.136;
    const c=[chalk,0xf0ecdd,0xeae7d9,0xf1eede][i%4];
    for(const s of [-1,1]){
      p.box([s*(w/2+.012),y+.072,0],[.055,.14,d],c,[0,0,s*.06]);
      p.box([0,y+.072,s*(front+.014)],[w,.14,.055],c,[-s*.06,0,0]);
    }
  }
  for(const side of [-1,1])for(const end of [-1,1]){
    p.box([side*(w/2-.03),1.82,end*(front-.03)],[.18,3.23,.18],chalk);
  }
  for(const s of [-1,1]){
    p.poly([[-w/2,h,s*front],[w/2,h,s*front],[0,h+rise,s*front]],chalk);
    for(let i=0;i<14;i++){
      const y=h+i*.139;
      const length=w*(1-(y-h+.04)/rise);
      p.box([0,y+.054,s*(front+.017)],[length,.098,.036],i%2?0xe2e1d3:chalk);
    }
  }
  const slope=rise/(w/2), tilt=Math.atan(slope);
  for(const s of [-1,1]){
    const span=w/2+.36;
    p.box([s*span/2,h+rise-slope*span/2,0],[span*Math.hypot(1,slope),.16,d+.68],slate,[0,0,-s*tilt]);
    p.box([s*span, h+rise-slope*span-.04,0],[.12,.19,d+.68],chalk);
    for(let z=-3.72;z<3.82;z+=.46)
      p.stick([0,h+rise+.10,z],[s*span,h+rise-slope*span+.10,z],.020,.020,0x838a85,5);
    for(const z of [-front-.32,front+.32])
      p.stick([0,h+rise+.035,z],[s*span,h+rise-slope*span+.035,z],.076,.076,chalk,4);
  }
  // Three shallow limestone treads lead to a recessed pair of walnut doors.
  for(let i=0;i<3;i++)p.box([0,.06+i*.10,front+.58-i*.20],[2.17-i*.085,.12+i*.025,1.19-i*.40],i%2?0xbeb8a7:0xd6cdb8);
  const opening=(x,y,z,width,height,col,thickness=.065)=>{
    const r=width*.5, spring=height-r;
    const shape=new THREE.Shape();shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,spring);
    shape.absarc(0,spring,r,0,Math.PI,false);shape.lineTo(-r,0);
    p.add(new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:12}),col,[x,y,z]);
  };
  opening(0,.31,front+.038,1.97,2.74,0xc8c6b7);
  opening(0,.31,front+.111,1.75,2.60,chalk);
  opening(0,.32,front+.183,1.48,2.43,0x57483b);
  for(const s of [-1,1]){
    for(let j=0;j<2;j++){
      p.box([s*.36,.74+j*.68,front+.26],[.58,.53,.043],0x79634f);
      p.box([s*.36,.74+j*.68,front+.286],[.47,.42,.022],0x66533f);
    }
    p.oval([s*.105,1.17,front+.31],[.032,.044,.032],brass,6,9);
  }
  p.box([0,1.22,front+.262],[.026,1.83,.03],wood);
  for(let i=0;i<7;i++){
    const a=Math.PI*i/6;
    p.stick([0,2.02,front+.266],[.695*Math.cos(a),2.02+.695*Math.sin(a),front+.266],.013,.013,brass,5);
  }
  p.box([0,1.995,front+.267],[1.46,.045,.04],brass);
  const window=(x,z,sideWall,s)=>{
    const face=(u,y,n)=>sideWall?[x+s*n,y,z+u]:[x+u,y,z+s*n];
    const plate=(u,y,n,a,b,c,color)=>p.box(face(u,y,n),sideWall?[c,b,a]:[a,b,c],color);
    const arch=(r,y,n,color)=>{
      const q=new THREE.Shape();
      q.moveTo(-r,0);q.lineTo(r,0);q.lineTo(r,.87);q.absarc(0,.87,r,0,Math.PI,false);q.lineTo(-r,0);
      const g=new THREE.ExtrudeGeometry(q,{bevelEnabled:false,depth:.022,curveSegments:9});
      p.add(g,color,face(0,y,n),[1,1,1],[0,sideWall?s*Math.PI/2:s<0?Math.PI:0,0]);
    };
    arch(.39,1.13,.04,0xb3b4aa);arch(.335,1.17,.067,chalk);arch(.263,1.225,.092,0x657873);
    plate(0,1.82,.12,.023,1.14,.022,0xdad6bd);
    for(const y of [1.56,1.91,2.095])plate(0,y,.12,.522,.028,.022,0xdad6bd);
    for(const u of [-.15,.15])p.stick(face(0,2.10,.13),face(u,2.28,.13),.008,.008,chalk,5);
    plate(0,1.13,.07,.86,.09,.17,chalk);
  };
  for(const s of [-1,1]){
    window(s*1.99,front,false,1);
    for(const z of [-2.18,0,2.18])window(s*w/2,z,true,s);
  }
  // A through-lit belfry, bell yoke and steep four-sided spire.
  const bz=front-.88, bottom=4.94, cornice=6.47;
  p.box([0,bottom,bz],[1.34,.46,1.26],oyster);
  p.box([0,bottom+.22,bz],[1.47,.135,1.40],chalk);
  for(const s of [-1,1])for(const end of [-1,1]){
    p.box([s*.495,5.76,bz+end*.49],[.13,1.17,.13],chalk);
    p.box([s*.495,6.29,bz+end*.49],[.19,.16,.19],oyster);
  }
  p.box([0,6.19,bz],[1.05,.10,.13],wood);
  const bell=new THREE.LatheGeometry([[.04,0],[.08,-.055],[.12,-.12],[.145,-.31],[.214,-.418],[.218,-.455],[.19,-.466],[.105,-.34],[.039,-.16]].map(([x,y])=>new THREE.Vector2(x,y)),22);
  p.add(bell,brass,[0,6.13,bz],[1.13,1.12,1.13]);
  p.oval([0,5.61,bz],[.062,.076,.062],0x6a5c43);
  p.box([0,cornice,bz],[1.42,.19,1.39],chalk);
  p.add(new THREE.ConeGeometry(1.027,1.18,4),slate,[0,7.09,bz],[1,1,1],[0,Math.PI/4,0]);
  p.oval([0,7.70,bz],[.09,.09,.09],brass);
  p.box([0,7.98,bz],[.070,.66,.070],0xe0c38b);p.box([0,8.05,bz],[.39,.065,.070],0xe0c38b);
}

function yard(p,obstacle){
  // Short timber wings bracket the chapel and leave the drive and front walk open.
  for(const s of [-1,1]){
    const x=4.45*s;
    for(const z of [-1.7,.52,2.75]){
      p.stick([x,0,z],[x,.86,z],.072,.058,wood,5);
      p.add(new THREE.ConeGeometry(.068,.10,4),wood,[x,.9,z],[1,1,1],[0,Math.PI/4,0]);
    }
    for(const y of [.30,.61])p.box([x,y,.52],[.087,.102,4.54],0xa9997c);
    obstacle(x,.44,.52,.13,.88,4.55);
  }
  const ax=3.18,az=5.26;
  p.box([ax,.30,az],[.68,.55,.32],0x302f2d);
  p.box([ax,.31,az+.168],[.616,.433,.018],0x61584b);
  for(let i=0;i<38;i++)p.box([ax-.285+i*.0154,.293,az+.180],[.0034,.37,.006],0x887e6a);
  for(let i=0;i<26;i++)p.box([ax,.114+i*.0142,az+.184],[.589,.004,.004],i%2?0x8c8170:0x706857);
  for(const s of [-1,1])p.box([ax+s*.302,.312,az+.188],[.016,.49,.012],brass);
  p.box([ax,.50,az+.186],[.60,.070,.018],0x433b2f);
  for(let i=0;i<5;i++)p.oval([ax-.21+.068*i,.505,az+.207],[.015,.014,.012],0xc2ae83);
  p.box([ax,.58,az],[.245,.043,.054],0x4f4436);
  obstacle(ax,.295,az,.68,.59,.32);
  const cable=[[2.7,.047,5.95],[3.05,.035,6.03],[3.38,.035,6.12],[3.66,.038,6.00],[3.70,.041,5.80],[3.42,.038,5.74],[3.15,.038,5.86],[2.96,.039,5.78],[2.98,.050,5.49],[3.11,.45,5.44]];
  p.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cable.map(v=>new THREE.Vector3(...v))),43,.012,5,false),0x493f32);
  p.box([2.65,.07,5.99],[.17,.085,.255],0x7b6f4c,[-.06,0,0]);
  p.box([2.65,.116,5.95],[.134,.029,.130],0x302e2b);p.oval([2.65,.13,6.04],[.021,.016,.021],brass);
}

export function buildChapelSolo(scene,venue){
  const root=new THREE.Group();root.name='Timber chapel';root.position.set(chapelX,0,chapelZ);scene.add(root);
  const walls=[], proxyMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const proxyGeometry=new THREE.BoxGeometry(1,1,1);
  function occlude(x,y,z,w,h,d,tilt=0){
    const m=new THREE.Mesh(proxyGeometry,proxyMaterial);
    m.scale.set(w,h,d);m.position.set(x+chapelX,y,z+chapelZ);m.rotation.z=tilt;m.updateMatrixWorld();
    venue.occluders.push(m);
  }
  function obstacle(x,y,z,w,h,d){
    walls.push({x:x+chapelX,z:z+chapelZ,hw:w/2+.23,hd:d/2+.23});
    occlude(x,y,z,w,h,d);
  }
  const p=new Part();chapel(p);
  obstacle(0,1.75,0,6.48,3.5,7.08);
  const roofTilt=Math.atan(2.03/3.2);
  for(const s of [-1,1])occlude(s*1.78,5.43-1.78*Math.tan(roofTilt),0,3.56/Math.cos(roofTilt),.16,7.68,-s*roofTilt);
  obstacle(0,.17,3.87,2.17,.34,.94);
  yard(p,obstacle);p.mesh(root,baseMaterial);
  const oldBlocks=venue.blocks;
  venue.blocks=(x,z)=>oldBlocks(x,z)||(Math.abs(x-chapelX)<5&&Math.abs(z-chapelZ)<6&&walls.some(o=>Math.abs(x-o.x)<=o.hw&&Math.abs(z-o.z)<=o.hd));
  // Guests and the cart share the same personal-space obstacle for the soloist.
  venue.colliders.push({x:SOLO_MARK.x,z:SOLO_MARK.z,r:.22});
  const oldLocation=venue.locationAt;
  venue.locationAt=(x,z)=>x>=-33.7&&x<-23.2&&z>=14.8&&z<29.8?'Timber chapel':oldLocation(x,z);
  const solo=buildSlash(scene,SOLO_MARK);
  return solo;
}
