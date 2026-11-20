// Judge Dean LLC
import * as THREE from 'three';
import { buildWeddingGuest } from './guests.js';

const tau=2*Math.PI, {lerp,smoothstep,clamp}=THREE.MathUtils;
const ivory=0xfff2de, butter=0xf1ddc0, pink=0xc98a93;
const baking=new Map();
const cutMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,side:THREE.DoubleSide});
function baked(parent,geometry,color){
  if(!baking.has(color))baking.set(color,new THREE.MeshStandardMaterial({color,roughness:.76,side:THREE.DoubleSide}));
  const mesh=new THREE.Mesh(geometry,baking.get(color));
  mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function sugarRose(p,x,y,z,size,color){
  p('ball',color,x,y,z,size*.53,size*.58,size*.53);
  for(let i=0;i<6;i++){
    const a=i*2.4,r=size*(.26+.06*i);
    p('gem',color,x+Math.sin(a)*r,y+.03*size*(5-i),z+Math.cos(a)*r,
      size*.58,size*.39,size*.26,[.5,a,.15]);
  }
}
function cakeSection(parent,r,h,start,end,rigid){
  const fraction=end-start;
  const section=new THREE.Group();parent.add(section);
  function disc(radius,y,height,color){
    const sides=Math.max(8,Math.round(fraction*8));
    const m=baked(section,new THREE.CylinderGeometry(radius,radius,height,sides,1,false,start,fraction),color);
    m.position.y=y;
  }
  disc(r,h*.5,h,ivory);disc(r+.009,.018,.032,butter);
  disc(r+.012,h-.02,.034,ivory);
  if(fraction<tau-.001){
    // Each strip becomes visible when the matching two slices separate.
    const coords=[],colors=[];
    const levels=[[0,butter],[.06,0xd5a06b],[.29,0x9c5361],[.33,0xf6e5c8],[.42,0xe2b484],[.67,0x985564],[.71,0xf4e2c5],[.79,0xdcaf7b],[.96,ivory],[1,ivory]];
    for(const a of [start,end]){
      const x=Math.sin(a)*r*.994,z=Math.cos(a)*r*.994;
      for(let i=0;i<levels.length-1;i++){
        const y0=h*levels[i][0],y1=h*levels[i+1][0],tint=new THREE.Color(levels[i][1]);
        coords.push(0,y0,0,x,y0,z,x,y1,z,0,y0,0,x,y1,z,0,y1,0);
        for(let j=0;j<6;j++)colors.push(tint.r,tint.g,tint.b);
      }
    }
    const cut=new THREE.BufferGeometry();
    cut.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
    cut.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));cut.computeVertexNormals();
    const inside=new THREE.Mesh(cut,cutMaterial);inside.castShadow=inside.receiveShadow=true;section.add(inside);
  }
  rigid(section,(p,rail)=>{
    const festoons=Math.round(r*15);
    for(let i=0;i<festoons;i++){
      const a0=i*tau/festoons, a1=(i+1)*tau/festoons;
      if((a0+a1)*.5<start||(a0+a1)*.5>=end)continue;
      for(let j=0;j<7;j++){
        const a=lerp(a0,a1,j/7),b=lerp(a0,a1,(j+1)/7);
        const knot=u=>h*(.81-.28*Math.sin(Math.PI*u));
        rail(butter,[Math.sin(a)*(r+.004),knot(j/7),Math.cos(a)*(r+.004)],
          [Math.sin(b)*(r+.004),knot((j+1)/7),Math.cos(b)*(r+.004)],.012);
      }
      p('gem',ivory,Math.sin(a0)*(r+.01),h*.806,Math.cos(a0)*(r+.01),.024,.025,.021);
    }
    const edge=Math.ceil(r*70);
    for(let i=0;i<edge;i++){
      const a=tau*i/edge;if(a<start||a>=end)continue;
      p('gem',0xfff4e2,Math.sin(a)*r,h+.002,Math.cos(a)*r,.025,.019,.023);
    }
  });
  return section;
}

function terraceGuests(scene){
  const records=[
    ['The terrace guest in plum','dress',36.5,3.39,1.42,0x80455e,5,'chignon',false,false,false,1.03,'dance'],
    ['The guest with the dinner napkin','suit',37.43,.10,-.46,0x374954,1,'curls',false,false,false,1.00,'dance']
  ];
  const people=records.map((r,i)=>buildWeddingGuest(scene,r,29+i));
  // A folded dinner napkin makes a very small umbrella.
  const linen=new THREE.PlaneGeometry(.35,.27,4,4),pos=linen.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setZ(i,.039*Math.cos(10*pos.getX(i))+.035*Math.sin(i*1.4));
  linen.computeVertexNormals();
  const napkin=baked(people[1].arms[1].hand,linen,0xf8e7cf);
  napkin.position.set(.025,.018,-.042);napkin.rotation.set(.82,.20,-.35);
  return t=>{
    people.forEach((a,i)=>{
      const [,,x,z,yaw]=records[i],delay=i*1.28;
      const shelter=smoothstep(t,-6.4+delay,-1.58+delay),stride=Math.sin((t-delay)*12.8);
      const run=Math.sin(shelter*Math.PI),cover=smoothstep(t,-8.0+delay,-6.45+delay)*(1-smoothstep(t,-1.1+delay,.68+delay));
      a.root.position.set(lerp(x,32.0+i*.09,shelter),.075+.045*run*Math.abs(stride),lerp(z,i?.34:2.72,shelter));
      a.root.rotation.y=lerp(yaw,-1.59,smoothstep(t,-8+delay,-6.5+delay))+1.55*smoothstep(t,-.9+delay,1.4+delay);
      a.body.rotation.x=.18*run;a.head.rotation.set(-.30*cover,.34*cover*(i?1:-1),.12*cover);
      for(let j=0;j<2;j++){
        const side=j?1:-1,arm=a.arms[j],leg=a.legs[j];
        let reach=j?(i?2.64:1.94):.46;
        arm.sh.rotation.set(-.12-cover*reach+side*stride*.53*run*(j?0:1),side*.08,side*(.13+.23*cover));
        arm.elbow.rotation.x=-.19-cover*(j?.74:.20)-run*.4;
        leg.hip.rotation.x=side*.72*stride*run;
        leg.knee.rotation.x=.09+Math.max(0,-side*stride)*.80*run;
        leg.ankle.rotation.x=-leg.knee.rotation.x*.48;
      }
    });
  };
}

export function buildReceptionCake(scene,{group,subject,rigid}){
  const display=group(scene,'Wedding cake and the diving guest',30.45,1.027,1.50);
  const target=subject(display,'Pillared wedding cake',0,.78,0,.60);
  const layers=[];
  function piece(r,h,y,start,end,flight){
    const mesh=cakeSection(display,r,h,start,end,rigid);
    mesh.position.y=y;
    if(flight)layers.push({mesh,y,...flight});
    return mesh;
  }
  const base=piece(.66,.34,0,0,tau);
  const middle=piece(.50,.285,.57,0,Math.PI*1.30,{end:[.31,.28,.31],turn:[.82,.31,-.41],duration:.82,arc:.18});
  piece(.50,.285,.57,Math.PI*1.30,tau,{end:[-1.30,-.88,-.41],turn:[.23,-.86,.26],duration:.99,arc:.52});
  const upper=piece(.355,.243,1.068,0,tau,{end:[-.65,.077,.42],turn:[.34,-.61,-.30],duration:.96,arc:.54});
  const crown=piece(.222,.184,1.472,0,tau,{end:[-1.54,-.71,.79],turn:[.49,.47,-1.66],duration:1.21,arc:.72});
  function colonnade(mesh,n,r,y,height){
    rigid(mesh,p=>{
      for(let i=0;i<n;i++){
        const a=(i+.5)*tau/n, x=Math.sin(a)*r,z=Math.cos(a)*r;
        p('disc',ivory,x,y+height*.5,z,.031,height,.031);
        for(const dy of [.014,height-.014])p('disc',butter,x,y+dy,z,.048,.028,.048);
      }
    });
  }
  colonnade(base,7,.383,.34,.23);colonnade(middle,4,.236,.285,.211);colonnade(upper,4,.14,.243,.161);
  rigid(base,p=>{
    for(let i=0;i<8;i++){
      const a=i*tau/8+.25;
      sugarRose(p,Math.sin(a)*.54,.366,Math.cos(a)*.54,.070,i%3===0?pink:0xf0bdaf);
    }
  });
  rigid(upper,p=>{
    for(let i=0;i<5;i++){
      const a=i*tau/5+.22;
      sugarRose(p,Math.sin(a)*.26,.251,Math.cos(a)*.26,.061,0xeab2a7);
    }
  });
  rigid(crown,(p,rail)=>{
    // A porcelain bride and groom ride down on the top tier.
    p('skirt',ivory,-.060,.247,.012,.084,.132,.074);
    p('ball',0xffe5c4,-.059,.366,.014,.039,.043,.039);
    p('ball',0x805642,-.057,.39,.013,.041,.02,.037);
    p('gem',0xffe9db,-.061,.345,-.015,.059,.066,.023);
    p('box',0x3b393b,.055,.264,0,.065,.148,.057,[0,0,.081]);
    p('gem',ivory,.049,.307,.028,.026,.032,.011);
    p('ball',0xe9c39b,.052,.371,0,.037,.044,.036);
    p('ball',0x543e35,.051,.395,-.002,.038,.021,.036);
    rail(0x393637,[.025,.302,.015],[-.036,.292,.018],.012);
    sugarRose(p,-.10,.192,.10,.043,pink);
  });

  const upperTarget=subject(upper,'Upper wedding cake tier',0,.125,0,.38);
  const sheltering=terraceGuests(scene);
  const dancer=group(display,'Cake guest hip pivot');
  const actor=buildWeddingGuest(dancer,['The cake-diving guest','suit',0,0,0,0x282b32,2,'part',false,false,false,1.07,'dance'],28);
  actor.root.position.y=-.87*actor.root.scale.y;
  const diveTarget=subject(actor.body,'Diving guest',0,1.37,-.095,.38);
  const frosting=group(actor.head,'Icing on the guest');
  rigid(frosting,p=>{
    p('ball',ivory,-.057,.18,.057,.079,.077,.066);
    p('ball',ivory,-.077,.099,.097,.036,.071,.020);
    p('gem',pink,-.101,.195,.079,.033,.024,.030);
  });
  const crumbs=group(display,'Flying sponge and frosting');
  const crumbGeo=new THREE.IcosahedronGeometry(1,0);
  const bits=new THREE.InstancedMesh(crumbGeo,new THREE.MeshStandardMaterial({roughness:.93}),42);
  crumbs.add(bits);bits.castShadow=true;bits.frustumCulled=false;
  const specks=[],helper=new THREE.Object3D();
  for(let i=0;i<bits.count;i++){
    const a=i*2.399963,ring=.45+((i*23)%33)/21;
    const dx=Math.sin(a)*ring,dz=.25+Math.cos(a)*ring;
    const radius=.024+(i%5)*.009;
    specks.push({dx,dz,base:Math.hypot(dx,dz)<.99?.035:-.93,
      height:.43+(i%7)*.11,duration:.46+(i%9)*.073,size:radius,a});
    bits.setColorAt(i,new THREE.Color([ivory,0xd9a875,ivory,0xa65768,0xefc9af][i%5]));
  }
  let lastDamage=null;
  function debris(t){
    const settled=clamp(t,0,1.42);
    if(settled===lastDamage)return;
    lastDamage=settled;
    for(const part of layers){
      const u=clamp(settled/part.duration,0,1),f=u*(2-u);
      part.mesh.position.set(part.end[0]*f,lerp(part.y,part.end[1],u*u)+4*part.arc*u*(1-u),part.end[2]*f);
      part.mesh.rotation.set(...part.turn.map(angle=>angle*f));
    }
    crumbs.visible=t>0;
    if(!crumbs.visible)return;
    for(let i=0;i<specks.length;i++){
      const p=specks[i],u=clamp(t/p.duration,0,1);
      const x=p.dx*u, z=lerp(-.18,p.dz,u),y=lerp(.67,p.base,u*u)+4*p.height*u*(1-u);
      helper.position.set(x,y,z);helper.rotation.set(p.a*u,3*u,p.a+u);
      helper.scale.set(p.size*1.2,p.size*(1-.36*u),p.size);helper.updateMatrix();
      bits.setMatrixAt(i,helper.matrix);
    }
    bits.instanceMatrix.needsUpdate=true;
  }
  function update(t){
    sheltering(t);
    diveTarget.visible=t>=-1.12&&t<=.83;
    debris(t);
    dancer.visible=t>=-7.3&&t<8.2;
    if(!dancer.visible)return;
    const takeoff=smoothstep(t,-1.12,-.05), fall=smoothstep(t,.07,.84);
    const stand=smoothstep(t,.84,2.7), exit=smoothstep(t,4.7,8.2);
    const run=smoothstep(t,-3.4,-.94), sprint=run*(1-takeoff);
    const kneel=Math.sin(Math.PI*smoothstep(t,-1.73,-1.02));
    const lift=4*takeoff*(1-takeoff), hop=.52*lift+.62*takeoff*(1-fall);
    const baseY=.096+.87*actor.root.scale.y;
    const hipY=baseY-1.027+hop-.16*kneel
      +.83*fall*(1-stand)+.08*Math.sin(t*15)*sprint;
    const flight=clamp((t+1.12)/1.12,0,1);
    const z=lerp(-4.20,-3.10,run)+1.71*flight+2.12*fall+.84*stand+.53*exit;
    dancer.position.set(-.045-.49*stand-3.34*exit,hipY,z);
    dancer.rotation.set(.19*sprint+1.38*takeoff*(1-stand)+.22*kneel,
      -.28*(1-run)-1.42*exit,-.22*fall*(1-stand));
    actor.head.rotation.x=-.48*takeoff*(1-stand)-.20*Math.sin(t*2.7)*stand;
    for(let i=0;i<2;i++){
      const s=i?1:-1, stride=Math.sin(t*13+s*Math.PI/2);
      const arm=actor.arms[i],leg=actor.legs[i];
      arm.sh.rotation.set(-.22+stride*.82*sprint-2.66*takeoff*(1-stand)-.87*stand*(1-exit),
        s*.09,s*(.11+.48*takeoff*(1-stand)));
      arm.elbow.rotation.x=-.38-.55*sprint-.74*stand*(1-exit);
      leg.hip.rotation.x=.44*kneel+stride*.67*(sprint+exit)-s*.32*takeoff*(1-stand);
      leg.knee.rotation.x=.17+.62*kneel+.51*Math.max(0,-stride)*(sprint+exit)+(.39+s*.39)*takeoff*(1-stand);
      leg.ankle.rotation.x=-.13-leg.knee.rotation.x*.30;
    }
    frosting.visible=t>=.06;
  }
  update(-552);
  return {targets:[target,upperTarget],diveTarget,update};
}
