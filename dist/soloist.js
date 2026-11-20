// Slash at the chapel steps · Judge Dean LLC
import * as THREE from 'three';
import { Part } from './guests.js';
import { guitarGesture } from './guitar-score.js';

const skin=0xb17b5b, highlight=0xbe8768, curls=0x251c1b, leather=0x24282c;
const silver=0xb8b9b4, brass=0xb89657, denim=0x516477, black=0x252427;
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.67,metalness:.07,side:THREE.DoubleSide});
const up=new THREE.Vector3(0,1,0), tau=Math.PI*2;
function node(parent,name,x=0,y=0,z=0){
  const group=new THREE.Group();group.name=name;group.position.set(x,y,z);parent.add(group);return group;
}
function wire(p,points,r,col,segments=points.length*3){
  const curve=new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a)));
  p.add(new THREE.TubeGeometry(curve,segments,r,5,false),col);
}
function instrument(group){
  const p=new Part();
  const contour=new THREE.Shape();
  contour.moveTo(-.030,.177);
  contour.bezierCurveTo(-.09,.235,-.177,.198,-.155,.110);
  contour.bezierCurveTo(-.145,.058,-.094,.045,-.143,-.024);
  contour.bezierCurveTo(-.234,-.159,-.117,-.267,-.007,-.265);
  contour.bezierCurveTo(.132,-.265,.218,-.174,.155,-.038);
  contour.bezierCurveTo(.116,.032,.094,.052,.138,.138);
  contour.bezierCurveTo(.154,.173,.133,.201,.096,.208);
  contour.bezierCurveTo(.109,.152,.061,.108,.027,.147);
  contour.lineTo(.025,.191);contour.lineTo(-.030,.177);
  const shell=new THREE.ExtrudeGeometry(contour,{depth:.038,bevelEnabled:true,bevelSegments:2,
    steps:1,bevelSize:.004,bevelThickness:.005,curveSegments:10});
  p.add(shell,0x653a29,[0,0,-.025]);
  // Concentric carved maple contours blend from a cherry rim to an amber centre.
  const rim=contour.getSpacedPoints(76).slice(0,-1), pos=[],color=[],idx=[];
  const rings=[[1,.016,0xe9c596],[.981,.018,0x833a23],[.930,.023,0xa74b21],[.82,.030,0xd07730],
    [.65,.036,0xe5a446],[.39,.041,0xf0bd5c],[.10,.043,0xf1bd62],[.001,.044,0xf1bc62]];
  for(let j=0;j<rings.length;j++){
    const [factor,z,col]=rings[j],base=new THREE.Color(col);
    for(let i=0;i<rim.length;i++){
      const v=rim[i],x=v.x*factor,y=(v.y+.043)*factor-.043;
      pos.push(x,y,z);
      const grain=1+.028*Math.sin(y*260+Math.sin(x*12)*.7);
      color.push(base.r*grain,base.g*grain,base.b*grain);
      if(j){
        const a=(j-1)*rim.length+i,b=(j-1)*rim.length+(i+1)%rim.length,c=a+rim.length,d=b+rim.length;
        idx.push(a,c,b,b,c,d);
      }
    }
  }
  const top=new THREE.BufferGeometry();
  top.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));top.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
  top.setIndex(idx);top.computeVertexNormals();p.add(top,0xffffff);
  p.box([0,.394,.006],[.058,.553,.042],0x79523a);
  p.box([0,.395,.032],[.061,.546,.015],0xd6b783);
  p.box([0,.395,.042],[.054,.546,.008],0x493127);
  const scale=.658, nut=.662;
  for(let fret=1;fret<=22;fret++){
    const y=nut-scale*(1-2**(-fret/12));
    p.box([0,y,.048],[.055,.0018,.002],silver);
    if([3,5,7,9,12,15,17,19,21].includes(fret)){
      const next=nut-scale*(1-2**(-(fret-1)/12)),v=(y+next)/2;
      p.poly([[-.014,v-.006,.049],[.013,v-.006,.049],[.009,v+.007,.049],
        [-.014,v-.006,.049],[.009,v+.007,.049],[-.009,v+.007,.049]],0xebdfbd);
    }
  }
  const crown=new THREE.Shape();
  crown.moveTo(-.027,.652);crown.lineTo(-.045,.708);crown.lineTo(-.058,.811);
  crown.quadraticCurveTo(-.032,.799,-.017,.821);crown.quadraticCurveTo(0,.800,.016,.820);
  crown.quadraticCurveTo(.038,.801,.056,.810);crown.lineTo(.044,.708);crown.lineTo(.026,.652);crown.closePath();
  p.add(new THREE.ExtrudeGeometry(crown,{depth:.027,bevelEnabled:false}),0x2d2928,[0,0,.005]);
  p.box([0,nut,.046],[.057,.009,.012],0xf1e4c8);
  for(const s of [-1,1])for(let j=0;j<3;j++){
    const x=s*(.034+.003*j),y=.702+j*.039;
    p.stick([x,y,.018],[x+s*.035,y,.018],.006,.006,silver,7);
    p.oval([x+s*.038,y,.018],[.010,.014,.006],0xd2b980);
    p.oval([x,y,.041],[.006,.006,.004],silver);
  }
  for(const y of [.075,-.015]){
    p.box([0,y,.050],[.108,.047,.011],0xf1d4a1);
    p.box([0,y,.058],[.093,.034,.013],silver);
    for(let n=0;n<6;n++)p.oval([-.035+n*.014,y+.009,.067],[.0027,.0027,.0026],0x605749,3,5);
  }
  p.poly([[.057,.124,.041],[.118,.057,.040],[.077,-.032,.044],[.057,.124,.041],[.077,-.032,.044],[.052,-.016,.048]],0xe7ce9c);
  p.box([0,-.072,.056],[.099,.018,.018],silver,[0,0,-.047]);
  p.box([0,-.113,.054],[.113,.017,.022],silver);
  for(const [x,y] of [[.091,-.114],[.121,-.095],[.073,-.162],[.111,-.154]]){
    p.oval([x,y,.046],[.013,.013,.011],brass,6,10);
    p.oval([x,y,.055],[.010,.010,.004],0xc79c4d,5,9);
  }
  for(let i=0;i<6;i++)p.stick([-.021+i*.0084,-.111,.068],[-.019+i*.0076,.661,.057],.00053,.00043,0xd9d8bc,4);
  p.mesh(group,material);
}

function dressBody(p){
  // The jacket is genuinely open; its front edges follow the chest down to the belt.
  const rows=[[-.030,.154,.102,.17],[.044,.170,.111,.15],[.207,.154,.108,.18],
    [.375,.18,.115,.47],[.503,.217,.118,.53],[.540,.198,.105,.60],[.567,.093,.084,.64]];
  p.profile(rows.map(([y,x,z])=>[y,x*.956,z*.944]),skin,32);
  const vertices=[],indices=[];
  for(let j=0;j<rows.length;j++){
    const [y,rx,rz,gap]=rows[j];
    for(let i=0;i<=36;i++){
      const a=gap+(tau-gap*2)*i/36;
      vertices.push(Math.sin(a)*rx,y,Math.cos(a)*rz);
      if(i&&j){const c=37*j+i,b=c-1;indices.push(b-37,c-37,b,c-37,c,b);}
    }
  }
  const jacket=new THREE.BufferGeometry();
  jacket.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));jacket.setIndex(indices);
  jacket.computeVertexNormals();p.add(jacket,leather);
  for(const s of [-1,1]){
    const a=[s*.138,.540,.080],b=[s*.058,.516,.126],c=[s*.038,.307,.119],d=[s*.087,.374,.115];
    p.poly([a,b,c,a,c,d],s<0?0x525459:0x40434a);
    p.poly([[s*.138,.540,.080],[s*.075,.570,.089],[s*.052,.510,.128]],0x34363a);
    p.stick([s*.096,.339,.114],[s*.018,.258,.116],.004,.004,silver,5);
    p.stick([s*.117,.196,.094],[s*.070,.171,.111],.004,.004,silver,5);
  }
  p.profile([[.018,.166,.113],[.061,.168,.114]],0x393333,20);
  p.box([.012,.040,.118],[.063,.039,.012],silver);
  p.box([.012,.040,.127],[.047,.025,.008],0x343332);
  p.stick([0,.52,.013],[0,.64,.012],.066,.063,skin,12);
  wire(p,[[-.067,.531,.088],[-.041,.434,.130],[.004,.398,.140],[.054,.465,.123],[.073,.532,.085]],.004,brass);
  p.oval([.004,.392,.140],[.013,.021,.004],silver,6,8);
  // Broad woven strap descends over the fretting shoulder to the upper bout.
  p.poly([[.16,.517,.085],[.121,.531,.095],[-.067,.196,.137],[.16,.517,.085],[-.067,.196,.137],[-.031,.185,.138]],0x3d302b);
  p.stick([.094,.423,.117],[.065,.431,.119],.004,.004,brass);
}
function trousers(p){
  p.profile([[.743,.122,.110],[.85,.165,.107],[.948,.161,.102]],denim,18);
  for(const side of [-1,1]){
    const hip=[side*.09,.805,0],knee=[side*.169,.465,side*.068+.045],ankle=[side*.25,.105,side*.077];
    p.oval([side*.088,.815,.006],[.092,.085,.095],denim,9,14);
    p.stick(hip,knee,.093,.064,denim,12);p.oval(knee,[.073,.072,.072],denim,6,12);
    p.stick(knee,ankle,.068,.065,denim,12);
    for(let j=0;j<3;j++){
      const k=.22*j+.20;
      const x=knee[0]+(ankle[0]-knee[0])*k,y=knee[1]+(ankle[1]-knee[1])*k,z=knee[2]+(ankle[2]-knee[2])*k;
      p.oval([x,y,z],[.068,.015,.067],j%2?0x485d71:0x5c7181,5,12,[side*.15,0,.08*side]);
    }
    p.stick([side*.15,.87,.039],[side*.141,.811,.078],.003,.003,0x96a0a0,5);
    p.oval([ankle[0],.068,ankle[2]+.037],[.079,.070,.144],0x353335,6,12,[0,side*.16,0]);
    p.box([ankle[0],.024,ankle[2]+.042],[.141,.024,.210],0x423d38,[0,side*.16,0]);
    p.box([ankle[0],.027,ankle[2]-.046],[.127,.045,.070],0x29292c);
  }
}
function headDetails(p){
  p.profile([[-.027,.050,.054],[.004,.073,.069],[.043,.094,.084],[.107,.104,.099],[.167,.103,.101],
    [.218,.086,.084],[.238,.050,.061]],skin,21);
  p.oval([0,.085,.092],[.021,.038,.024],highlight,8,12);
  p.oval([0,.063,.111],[.027,.013,.016],highlight);
  p.oval([-.001,.032,.081],[.031,.0065,.009],0x80554a);
  p.oval([.001,.024,.080],[.025,.005,.008],highlight);
  for(const s of [-1,1]){
    p.oval([s*.046,.119,.085],[.049,.032,.025],brass,7,14,[0,s*.22,s*.07]);
    p.oval([s*.046,.119,.091],[.047,.030,.023],0x242a2d,7,14,[0,s*.22,s*.07]);
    p.stick([s*.085,.132,.081],[s*.113,.132,-.021],.003,.004,brass);
    p.stick([s*.048,.137,.111],[s*.073,.138,.099],.0015,.0015,0x828882,4);
  }
  p.stick([-.015,.132,.104],[.015,.132,.104],.003,.003,brass);
  p.oval([0,.145,-.055],[.142,.167,.118],curls,9,18);
  // Short tight curls fringe the brow; longer ringlets layer over the shoulder.
  for(let j=0;j<49;j++){
    const a=(j+.33)*tau/49,side=Math.sin(a),forward=Math.cos(a);
    const front=THREE.MathUtils.smoothstep(forward,.52,.97);
    const span=.118+.015*Math.sin(j*2.37),len=(.224+.079*(.5+.5*Math.cos(j*2.19)))*(1-front*.78);
    const pts=[],phase=j*.83;
    for(let i=0;i<=28;i++){
      const t=i/28, turn=t*tau*(2.1+1.25*(1-front)+.48*Math.sin(j))+phase;
      const r=.005+.010*Math.sin(Math.PI*t*.82);
      pts.push([side*(span+.038*t)+r*Math.cos(turn),.210-len*t+.004*Math.cos(turn),-.022+forward*(.108+.019*t)+r*Math.sin(turn)]);
    }
    wire(p,pts,.0087,[0x2e2420,0x382c25,0x49372a,0x302622,0x28211e][j%5],32);
  }
  for(const side of [-1,1])for(let j=0;j<3;j++){
    const pts=[];
    for(let i=0;i<19;i++){
      const t=i/18,angle=t*tau*(1.4+j*.15)+j;
      pts.push([side*(.076+j*.014+.027*t)+.008*Math.cos(angle),.166-(.126+j*.030)*t,
        .058+.017*t+.009*Math.sin(angle)]);
    }
    wire(p,pts,.0092,[0x382b25,0x402f25,0x2c2421][j],23);
  }
  p.oval([0,.223,-.005],[.191,.019,.145],black,6,24,[.025,0,-.055]);
  const hat=new THREE.LatheGeometry([[.001,0],[.116,0],[.118,.027],[.109,.13],[.117,.173],[.110,.18],[.001,.18]]
    .map(([r,h])=>new THREE.Vector2(r,h)),26);
  p.add(hat,0x2e2d30,[0,.228,-.010],[1,1,.86],[.025,0,-.055]);
  p.oval([0,.254,-.008],[.122,.019,.106],0x44362c,5,22);
  for(let j=-2;j<=2;j++){
    const a=j*.48;
    p.oval([.118*Math.sin(a),.255,.098*Math.cos(a)-.008],[.012,.011,.005],silver,5,8,[0,a,0]);
  }
}

function limb(parent,a,b,side){
  const upper=new Part(),lower=new Part(),palm=new Part();
  // Unit-length links point in +Y. Their Y scale follows the solved elbow pose.
  upper.stick([0,0,0],[0,1,0],.084,.063,leather,12);
  upper.oval([0,.15,0],[.087,.2,.085],0x303438,6,10);
  upper.stick([0,.83,0],[0,.99,0],.067,.063,0x3f4142,12);
  lower.stick([0,0,0],[0,.88,0],.054,.038,skin,12);
  lower.stick([0,.71,0],[0,.91,0],.041,.040,side<0?0x343231:silver,12);
  lower.oval([0,.99,0],[.036,.09,.034],skin,6,9);
  palm.oval([0,0,0],[.036,.045,.025],highlight,6,10);
  for(let i=0;i<4;i++){
    const x=-.024+i*.015,y=-.014-Math.sin(i*.9)*.008;
    palm.stick([x,y,.013],[x+.009,y-.031,.026],.007,.0065,highlight);
    palm.oval([x+.008,y-.030,.025],[.0065,.007,.008],highlight);
  }
  palm.stick([side*.028,.008,.009],[side*.043,-.016,.023],.009,.008,skin);
  if(side<0)palm.poly([[.021,-.023,.029],[.039,-.026,.030],[.029,-.042,.029]],0xf1cc9a);
  return {upper:upper.mesh(parent,material),lower:lower.mesh(parent,material),palm:palm.mesh(parent,material),
    shoulder:new THREE.Vector3(...a),bias:new THREE.Vector3(...b)};
}
const delta=new THREE.Vector3(),point=new THREE.Vector3(),normal=new THREE.Vector3(),elbow=new THREE.Vector3();
function link(mesh,a,b){
  delta.subVectors(b,a);
  const length=delta.length();mesh.position.copy(a);mesh.scale.y=length;
  mesh.quaternion.setFromUnitVectors(up,delta.multiplyScalar(1/Math.max(.00001,length)));
}
function poseArm(arm,hand){
  const a=arm.shoulder;
  normal.subVectors(hand,a);
  const dist=Math.max(.001,normal.length());normal.divideScalar(dist);
  point.copy(arm.bias).addScaledVector(normal,-normal.dot(arm.bias)).normalize();
  const along=THREE.MathUtils.clamp((.278**2-.255**2+dist**2)/(2*dist),0,.278);
  elbow.copy(a).addScaledVector(normal,along).addScaledVector(point,Math.sqrt(Math.max(.001,.278**2-along**2)));
  link(arm.upper,a,elbow);link(arm.lower,elbow,hand);arm.palm.position.copy(hand);
}

export function buildSlash(scene,mark){
  const root=node(scene,'Slash at the chapel steps',mark.x,.008,mark.z);
  root.rotation.y=.25;root.scale.setScalar(1.07);
  const legs=new Part();trousers(legs);legs.mesh(root,material);
  const torso=node(root,'Leather jacket',0,.89,0),coat=new Part();dressBody(coat);coat.mesh(torso,material);
  const face=node(torso,'Hat, curls and sunglasses',0,.624,.013),features=new Part();headDetails(features);features.mesh(face,material);
  const guitar=node(torso,'Sunburst single-cut electric',-.088,.137,.177);instrument(guitar);
  const pick=limb(torso,[-.193,.496,0],[-1,-.7,.42],-1);
  const fret=limb(torso,[.193,.496,0],[1,-.73,-.09],1);
  const target=node(torso,'Slash and his guitar',.044,.32,.13);
  target.userData.radius=.56;
  const subject={object:root,head:node(face,'Slash’s face',0,.115,.086),name:'Slash',kind:'guest'};
  const right=new THREE.Vector3(),left=new THREE.Vector3();
  function update(t,active){
    root.visible=active;
    if(!active)return;
    const time=t-359, playing=time>=0 && time<=20, cue=guitarGesture(time);
    const oscillation=Math.sin(time*2.618);
    const bend=playing?cue.bend:0, hero=playing?Math.exp(-((time-11)**2)/1.65):0;
    torso.rotation.z=(playing?.028:.009)*oscillation+hero*.063;
    torso.rotation.x=-.024-(playing?.012:.004)*Math.sin(time*1.31)-hero*.073;
    torso.position.y=.89+(playing?.007:.002)*oscillation;
    face.rotation.set(.14-.046*Math.sin(time*1.5)-hero*.31,-.17+.13*Math.sin(.79*time),-.08+.04*oscillation);
    guitar.rotation.set(-.055,.010,-.978+hero*.26+(playing?.030:.007)*oscillation);
    guitar.updateMatrix();
    const finger=playing?cue.fret:.39;
    left.set(-.004,.580-.30*finger,.059).applyMatrix4(guitar.matrix);
    left.y-=.020-bend*.009;left.z+=.009;
    right.set(-.021+.031*(playing?cue.pick:0),-.015,.096).applyMatrix4(guitar.matrix);
    right.y+=.014;right.z+=.009;
    poseArm(pick,right);poseArm(fret,left);
    pick.palm.rotation.set(-.45,-.19,-1.14+(playing?.24*cue.pick:0));
    fret.palm.rotation.set(-.19,-.35,.67+bend*.09);
  }
  update(359,true);
  return {target,subject,update};
}
