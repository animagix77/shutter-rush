// Judge Dean LLC
import * as THREE from 'three';
import { ESTATE_MAP } from './estate-layout.js';

export function buildEstateExpansion(scene,build) {
  const {areaBatch,box,add,rod,occlude,colliders,lightBulb,chair,bendFrom,wind}=build;
  const {areas,paths,water}=ESTATE_MAP;
  const walls=[];
  const wood=0x815c47,walnut=0x4d3f35,sand=0xd2bb96,ivory=0xf2e5cd,
    leaf=0x71846a,olive=0x8d9669,brass=0xba965d,clay=0xc58b6d,blue=0x7d9696;
  const glass=new THREE.MeshStandardMaterial({color:0xb9d4cb,transparent:true,opacity:.22,depthWrite:false,roughness:.24,metalness:.18,side:THREE.DoubleSide});
  const mark=(name)=>areas.find(area=>area.name===name);
  let seed=72943;
  function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function solid(color,x,y,z,w,h,d) {
    box(color,x,y,z,w,h,d);
    obstacle(x,y,z,w,h,d);
  }
  function obstacle(x,y,z,w,h,d){
    walls.push({x,z,hw:w/2,hd:d/2});
    occlude(x,y,z,w,h,d);
  }
  function flooring(x,z,w,d,c,trim,level=.027,material='stone') {
    build.footing(material,x,z,w,d,level+.029);
    box(trim,x,level-.014,z,w+.19,.047,d+.19);
    box(c,x,level+.012,z,w,.034,d);
  }
  function plaque(name,x,y,z,width,rotation=0){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=134;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#334a3e';ctx.fillRect(0,0,768,134);
    ctx.strokeStyle='#c6a87a';ctx.lineWidth=2;ctx.strokeRect(7,7,754,120);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f1dfbf';ctx.font='italic 63px Georgia, serif';ctx.fillText(name,384,68,708);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width*134/768),new THREE.MeshStandardMaterial({map:tex,roughness:.8}));
    mesh.position.set(x,y,z);mesh.rotation.y=rotation;scene.add(mesh);
  }
  function pot(x,z,s=1){
    add('pot',clay,x,.30*s,z,.45*s,.60*s,.45*s);
    add('round',0xe0ac87,x,.58*s,z,.48*s,.095*s,.48*s);
    add('round',0x776851,x,.63*s,z,.425*s,.035*s,.425*s);
    bendFrom(.64*s, .085, () => {
      for(let i=0;i<10;i++){
        const a=i*2.4,dx=Math.sin(a),dz=Math.cos(a),r=(.37+.31*noise())*s,top=(1.0+.58*noise())*s;
        rod(leaf,x,.64*s,z,x+dx*r*.78,top,z+dz*r*.78,.017*s);
        add('leaf',i%2?0x839273:0x687e65,x+dx*r*.65,top-.16*s,z+dz*r*.65,.115*s,.34*s,.06*s,dz*.58,a,-dx*.58);
      }
    });
    colliders.push({x,z,r:.36*s});
  }
  function lantern(x,y,z){
    box(brass,x,y,z,.35,.042,.35);
    add('rod',0xffeac0,x,y+.22,z,.077,.37,.077);
    add('globe',0xffd388,x,y+.43,z,.035,.071,.035,0,0,0,lightBulb);
    for(const sx of [-.15,.15])for(const sz of [-.15,.15])box(brass,x+sx,y+.23,z+sz,.024,.46,.024);
    box(walnut,x,y+.46,z,.36,.055,.36);
    add('cone',brass,x,y+.53,z,.256,.13,.256,0,Math.PI/4);
  }
  function settee(x,z,color=ivory){
    for(const a of [-.91,.91])for(const b of [-.28,.28])box(wood,x+a,.15,z+b,.077,.30,.077);
    solid(color,x,.43,z,2.16,.37,.75);
    box(color,x,.75,z-.31,2.16,.55,.17);
    for(const s of [-1,1]){
      box(color,x+s*.99,.62,z,.17,.27,.76);
      box(s>0?0xb5a58e:0xa29a83,x+s*.63,.77,z-.18,.42,.39,.17,.13,0,s*.15);
    }
  }
  function consoleTable(x,z,w=3,d=1,color=wood){
    solid(color,x,.89,z,w,.12,d);
    for(const sx of [-1,1])for(const sz of [-1,1])box(color,x+sx*(w/2-.12),.44,z+sz*(d/2-.12),.13,.88,.13);
  }
  function rug(x,z,w,d,colors){
    flooring(x,z,w,d,colors[0],colors[1],.062,'carpet');
    const line=(dx,dz,sx,sz,c,y=.095)=>box(c,x+dx,y,z+dz,sx,.004,sz);
    for(const s of [-1,1])for(const inset of [.15,.33]){
      line(0,s*(d/2-inset),w-2*inset,.055,colors[1]);
      line(s*(w/2-inset),0,.055,d-2*inset,colors[1]);
    }
    for(let k=-2;k<=2;k++)for(let j=-1;j<=1;j++){
      if((k+j)%2===0){
        const xx=x+k*.90,zz=z+j*.93;
        box(colors[2],xx,.099,zz,.62,.004,.62,0,Math.PI/4);
        box(colors[0],xx,.103,zz,.43,.004,.43,0,Math.PI/4);
      }
    }
    for(let j=0;j<=24;j++)for(const side of [-1,1])
      line((j/24-.5)*(w-.17),side*(d/2+.052),.027,.15,colors[1],.079);
  }
  function gatheredCurtain(x,z,side,c) {
    const verts=[],idx=[],cols=7,rows=9;
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const v=j/rows,u=i/cols,gather=Math.exp(-((v-.53)**2)/.023);
      const width=.95-.54*gather;
      verts.push(x+side*(.31+gather*.39)+(u-.5)*width,3.87-v*3.04,
        z+.145*Math.cos(u*6*Math.PI)*(.83-.6*gather)+.08*v);
    }
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const a=j*(cols+1)+i,b=a+cols+1;idx.push(a,b,a+1,b,b+1,a+1);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,c);m.castShadow=true;
    wind.cloth(m, i => {
      const v=Math.floor(i/(cols+1))/rows;
      return v<.53 ? .054*Math.sin(Math.PI*v/.53) : .121*((v-.53)/.47)**1.2;
    });
    scene.add(m);
    box(brass,x+side*.72,2.24,z+.035,.46,.068,.21);
  }
  function room(name,wallColor,shutters){
    const {x,z,w,d}=mark(name),h=4.45,sill=.94,eave=4.1;
    areaBatch(name);
    flooring(x,z,w,d,0xc9b498,0xbaa386,.027,'wood');
    for(let v=-d/2+.4;v<d/2;v+=.48)box(0xbda88d,x,.061,z+v,w,.005,.012);
    // Each wall has a generous central passage and glazed sidelights.
    for(const alongX of [false,true])for(const side of [-1,1]){
      const span=alongX?w:d,off=(alongX?d:w)/2;
      function part(u,y,len,height,thick,c,blocking=false) {
        const wx=x+(alongX?u:side*off),wz=z+(alongX?side*off:u);
        (blocking?solid:box)(c,wx,y,wz,alongX?len:thick,height,alongX?thick:len);
      }
      const edge=span/2,gap=2.8;
      part(0,eave,span+.24,.46,.38,wallColor);
      part(0,h,span+.6,.22,.50,ivory);
      for(const s of [-1,1]) {
        const a=s*(gap+(edge-gap)/2),len=edge-gap;
        part(a,sill/2,len,sill,.34,wallColor,true);
        part(a,sill+.035,len+.02,.11,.42,ivory);
        for(const u of [gap+.10,edge-.18])part(s*u,2.38,.35,2.97,.35,wallColor,true);
        part(a,2.44,.085,2.96,.09,shutters);
        part(a,2.84,len,.073,.09,shutters);
        part(s*(gap+.2),2.26,.14,4.45,.43,ivory);
      }
      if(alongX&&side===1)plaque(name,x,4.11,z+d/2+.208,4.25);
      if(!alongX&&side===1)plaque(name,x+w/2+.208,4.11,z,4.25,Math.PI/2);
    }
    const pitch=.23,rise=d*.5*pitch;
    for(const s of [-1,1]){
      box(0x9e6751,x,h+rise/2+.04,z+s*d/4,w+.83,.19,d*.54,s*Math.atan(pitch));
      for(let xx=-w/2-.2;xx<w/2+.30;xx+=.58)
        rod(0xb77c60,x+xx,h+rise+.18,z,x+xx,h+.12,z+s*(d/2+.36),.06);
    }
    for(let a=-w/2+.5;a<w/2;a+=3.4) {
      box(walnut,x+a,h-.16,z,.16,.16,d-.45);
      for(const s of [-1,1])rod(wood,x+a,h-.05,z+s*(d/2-.35),x+a,h+rise-.14,z,.095);
    }
    for(const s of [-1,1])pot(x+w/2+.75,z+s*3.75,1.05);
    return {x,z,w,d};
  }

  const suite=room('Bridal suite',0xe2bab0,0xa38d76);
  {
    const {x,z}=suite;
    // Lit makeup vanities face inward on the west wall.
    for(const dz of [-4.15,4.15]){
      const tx=x-8.8,tz=z+dz;
      consoleTable(tx,tz,1.12,3.75,0xb28e77);
      box(brass,tx-.43,1.95,tz,.115,1.69,3.22);
      box(0xa6b9b4,tx-.355,1.95,tz,.06,1.48,3.02);
      for(let n=-3;n<=3;n++)for(const y of [1.17,2.74])
        add('globe',0xffedd2,tx-.29,y,tz+n*.47,.052,.062,.062,0,0,0,lightBulb);
      for(let n=0;n<7;n++){
        const zz=tz-1.1+n*.31;
        add('round',n%2?0xc6918c:0x978b85,tx+.17,1.06,zz,.073,.17,.073);
        add('rod',brass,tx+.17,1.18,zz,.048,.068,.048);
      }
      add('round',0xe1b6ae,tx+1.22,.54,tz,.35,.16,.35);
      add('round',brass,tx+1.22,.27,tz,.087,.48,.087);
      colliders.push({x:tx+1.22,z:tz,r:.31});
    }
    settee(x+5.7,z-6.5,0xd8b3a9);pot(x+7.75,z-6.6,1.13);
    rug(x,z,8,7.2,[0xc9a69b,0xe6cfb6,0xae8f7b]);
    const linen=new THREE.MeshStandardMaterial({color:0xe3bdad,roughness:.95,side:THREE.DoubleSide});
    for(const s of [-1,1])for(const k of [-1,1]){
      const zz=z+s*8.72,xx=x+k*5.9;
      rod(brass,xx-2.96,3.93,zz,xx+2.96,3.93,zz,.047);
      for(const end of [-1,1])gatheredCurtain(xx+end*2.02,zz,end,linen);
    }
    // Slim gilt frames back the vanities with painted plaster.
    for(const s of [-1,1]){
      const xx=x-9.73,zz=z+s*5.65;
      box(0xd1a79b,xx,2.33,zz,.065,2.72,5.45);
      for(const sy of [-1,1])box(0xdbc1a6,xx+.044,2.33+sy*1.16,zz,.042,.066,5.10);
      for(const sz of [-1,1])box(0xdbc1a6,xx+.044,2.33,zz+sz*2.55,.042,2.39,.065);
    }
  }
  const lodge=room('Tailor lodge',0xd4c7af,0x6b8072);
  {
    const {x,z}=lodge;
    for(const a of [-4.9,4.9]){
      const gx=x-6.5,gz=z+a;
      for(const s of [-1,1]) {
        rod(brass,gx+s*1.28,.08,gz,gx+s*1.28,2.06,gz,.055);
        box(wood,gx+s*1.28,.06,gz,.25,.08,.73);
      }
      rod(brass,gx-1.33,2.06,gz,gx+1.33,2.06,gz,.047);
      bendFrom(2.07, -.026, () => {
        for(let n=0;n<6;n++){
          const xx=gx-1.0+n*.40,c=[0x626e65,0x374a50,0x5b5552,0x685f54][n%4];
          rod(brass,xx,2.07,gz,xx,1.89,gz,.018);
          for(const s of [-1,1])rod(wood,xx,1.9,gz,xx+s*.21,1.77,gz,.019);
          box(c,xx,1.31,gz,.29,.94,.22,0,.14,.03);
          for(const s of [-1,1])box(c,xx+s*.155,1.41,gz+.010,.102,.70,.19,0,.08,s*.13);
          box(ivory,xx,1.69,gz+.12,.073,.16,.015);
        }
      });
      obstacle(gx,1,gz,2.8,2.0,.63);
    }
    consoleTable(x+4.75,z+6.15,4.2,1.36);settee(x+4.8,z-6.3,0x77877b);
    for(let i=0;i<8;i++){
      const xx=x+3.20+i*.43;
      add('rod',brass,xx,1.13,z+6.32,.066,.37,.066);
      add('round',[0xb28378,0x5a7270,0xddd0ae][i%3],xx,1.12,z+6.32,.13,.22,.13);
    }
    rug(x,z,6.8,6.7,[0x7b8577,0xc9b998,0xe0d2ad]);
    for(const s of [-1,1]){
      const xx=x+s*5.4,zz=z-7.71;
      box(0x828d7d,xx,2.30,zz,4.81,2.71,.06);
      box(wood,xx,2.37,zz+.053,1.36,1.57,.057);
      box(0xe4d2b4,xx,2.37,zz+.091,1.20,1.41,.04);
      // Framed tailoring patterns hung above the wainscot.
      for(const n of [-1,1]){
        box(0x7b8978,xx+n*.22,2.46,zz+.119,.27,.51,.012,0,0,n*.19);
        box(0x8d9886,xx+n*.19,2.10,zz+.121,.24,.34,.012,0,0,-n*.14);
      }
    }
  }
  {
    const {x,z,w,d}=mark('Glasshouse');areaBatch('Glasshouse');
    flooring(x,z,w,d,0xc6c4a9,0x8f9e89);
    for(const side of [-1,1]){
      const wallZ=z+side*d/2;
      for(const sign of [-1,1]) {
        const cx=x+sign*(w/4+1.48),len=w/2-2.96;
        solid(0xa5b6a3,cx,.43,wallZ,len,.86,.28);
        add('box',0xc7e1d4,cx,2.4,wallZ,len,3.1,.055,0,0,0,glass);
        box(0x526c61,cx,2.36,wallZ,len,.058,.12);
        for(let i=0;i<=4;i++)box(0x536f61,cx+(i/4-.5)*len,2.36,wallZ,.06,3.9,.13);
      }
      box(0x597467,x,4.33,wallZ,w+.44,.20,.23);
      for(let xx=-w/2;xx<=w/2;xx+=2.2){
        rod(0x587163,x+xx,4.34,wallZ,x+xx,6.52,z,.072);
      }
      add('box',0xc0ddcd,x,5.43,z+side*d/4,w+.24,.07,d*.528,side*Math.atan(2.18/(d/2)),0,0,glass);
      for(const sign of [-1,1]){
        const cx=x+side*w/2,cz=z+sign*(d/4+1.4),len=d/2-2.8;
        solid(0x9dab9b,cx,.43,cz,.28,.86,len);
        add('box',0xc7e1d4,cx,2.46,cz,.055,3.18,len,0,0,0,glass);
        for(const k of [-1,0,1])box(0x566e62,cx,2.41,cz+k*(len/2-.055),.14,3.84,.08);
      }
    }
    rod(0x587163,x-w/2-.13,6.51,z,x+w/2+.13,6.51,z,.10);
    plaque('Glasshouse',x,4.29,z+d/2+.14,3.8);
    for(const sx of [-1,1])for(const sz of [-1,1]){
      for(const k of [0,1,2])pot(x+sx*(8.7-k*1.55),z+sz*6.28,.91+.25*(k%2));
      add('round',sand,x+sx*8.85,.44,z+sz*4.17,.56,.87,.56);
      add('round',ivory,x+sx*8.85,.91,z+sz*4.17,.72,.12,.72);
    }
  }

  function oak(x,z,h=4.8){
    const r=h*.217;
    rod(wood,x,0,z,x+.15,h*.71,z-.08,.16);
    bendFrom(h*.50, .071, () => {
      for(let i=0;i<7;i++){
        const a=i*2.4,dx=Math.cos(a)*r*.71,dz=Math.sin(a)*r*.71,hh=h*(.76+.2*noise());
        if(i%2===0)rod(wood,x+.13,h*.50,z-.08,x+dx,hh,z+dz,.087);
        add('crown',[leaf,olive,0x7e906a,0x9aa281][i%4],x+dx,hh,z+dz,r*.88,r*.68,r*.91,.06,a);
      }
    });
    colliders.push({x,z,r:.21});
  }
  function cypress(x,z,h=5){
    add('rod',wood,x,h*.19,z,.125,h*.38,.125);
    bendFrom(h*.12, .046, () => {
      add('crown',0x60775a,x,h*.48,z,h*.122,h*.41,h*.121,0,.6);
      add('crown',0x748761,x-.05,h*.64,z+.04,h*.103,h*.36,h*.093);
      add('cone',0x70835c,x,h*.85,z,h*.072,h*.28,h*.08);
    });
    colliders.push({x,z,r:h*.074});
  }
  {
    const {x,z,w,d}=mark('Vineyard overlook');areaBatch('Vineyard');
    flooring(x,z,w,d,0xc1ac88,0xae976e);
    for(const sign of [-1,1]){
      const xx=x+sign*8.75;
      settee(xx,z-5.3,0xa39a76);
      pot(xx,z+4.78,1.18);
    }
    for(let j=0;j<6;j++){
      const xx=-94+j*3.05;
      box(0xa38c68,xx,.013,5,1.59,.026,23.7);
      for(let k=0;k<=5;k++){
        const zz=-6+k*4.4;
        box(wood,xx,.72,zz,.16,1.44,.18);
        if(k===5)continue;
        for(const y of [.57,1.18])rod(0x746c56,xx,y,zz,xx,y,zz+4.4,.032);
        bendFrom(.32, .077, () => {
          for(let q=0;q<4;q++){
            const v=zz+(q+.45)*1.07;
            add('crown',q%2?0x718552:0x879562,xx,.97,v,.55,.52,.78,.13,q*.81);
            if(q%2===0)for(let n=0;n<5;n++)add('pebble',0x6b626b,xx+.39,.72-.07*n,v+.045*Math.sin(n*2.4),.10-.011*n,.086,.09);
          }
        });
      }
      obstacle(xx,.81,5,.86,1.4,22.7);
    }
  }

  function skirtTable(x,z,r,tall=false){
    const y=tall?1.18:.94;
    add('round',brass,x,y*.48,z,.15,y*.96,.15);
    add('round',ivory,x,y-.065,z,r,.13,r);
    add('flowerpot',0xe7d9be,x,y*.53,z,r*.96,y*.90,r*.96);
    colliders.push({x,z,r:r*.93});occlude(x,y*.55,z,r*1.54,y*.9,r*1.54);
  }
  function tumbler(x,y,z,c=0xc2b793){
    add('pot',c,x,y+.084,z,.050,.16,.050);
    add('round',0xe3d9c1,x,y+.167,z,.049,.010,.049);
  }
  function parasol(x,z,color){
    add('rod',wood,x,1.52,z,.07,3.04,.07);
    add('round',sand,x,.10,z,.43,.20,.43);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
      const p=[[x,3.35,z],[x+Math.sin(a)*2.01,2.88,z+Math.cos(a)*2.01],[x+Math.sin(b)*2.01,2.88,z+Math.cos(b)*2.01]];
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(p.flat(),3));geo.computeVertexNormals();
      const mat=i%2?parasolCream:color;
      const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;
      wind.cloth(mesh, (_i,_x,y) => Math.max(0,3.35-y)*.082);
      scene.add(mesh);
    }
    colliders.push({x,z,r:.36});
  }
  const parasolCream=new THREE.MeshStandardMaterial({color:ivory,side:THREE.DoubleSide,roughness:1});
  const parasolSage=new THREE.MeshStandardMaterial({color:0x86a298,side:THREE.DoubleSide,roughness:1});
  {
    const {x,z,w,d}=mark('Cocktail terrace');areaBatch('Cocktail terrace');
    flooring(x,z,w,d,0xcab79d,0xdcc9a7);
    for(let i=-4;i<=4;i++)for(let j=-3;j<=3;j++)
      box((i+j)%2===0?0xd3c1aa:0xc8b298,x+i*2.25,.064,z+j*2.25,2.21,.012,2.21);
    const bx=x-7.2,bz=z-6.45;
    solid(0x788d7c,bx,.54,bz,7.3,1.05,1.25);box(ivory,bx,1.10,bz,7.6,.14,1.53);
    for(let i=-3;i<=3;i++){
      box(brass,bx+i*.96,.57,bz+.637,.038,.78,.04);
      const xx=bx+i*.56;
      add('rod',i%2?0x596f57:0xa87553,xx,1.4,bz-.14,.092,.42,.092);
      add('rod',brass,xx,1.67,bz-.14,.042,.13,.042);
      tumbler(xx,1.18,bz+.35);
    }
    for(const [dx,dz] of [[7.9,-5.2],[7.9,5.15],[-7.53,5.2]]){
      skirtTable(x+dx,z+dz,.85,true);
      tumbler(x+dx+.3,1.18,z+dz-.21);
      parasol(x+dx-1.45,z+dz+.58,parasolSage);
    }
    for(const s of [-1,1])pot(x+s*(w/2-.79),z+.15,1.13);
  }

  {
    const {x,z,w,d}=mark('Lake pier'),lake=water[0];areaBatch('Lake pier');
    // The old lake's stone embankment is cut by a broad timber landing.
    box(0xb6b594,lake.x,-.005,lake.z,lake.w+.6,.06,lake.d+.6);
    wind.water(scene,lake.x,.058,lake.z,lake.w,lake.d,0x729b9c);
    // Block the lake, leaving the entire deck accessible from shore.
    walls.push({x:lake.x,z:42.25,hw:lake.w/2,hd:4.75},{x:lake.x,z:63.75,hw:lake.w/2,hd:4.75},
      {x:94,z:53,hw:5,hd:6});
    const deckStart=71.5,deckEnd=x+w/2;
    build.footing('wood',(deckStart+deckEnd)/2,z,deckEnd-deckStart,d,.13);
    box(wood,(deckStart+deckEnd)/2,.057,z,deckEnd-deckStart,.095,d);
    for(let xx=deckStart+.15;xx<deckEnd;xx+=.31)
      box(Math.floor(xx*8)%2===0?0xb79672:0xad8c6c,xx,.113,z,.294,.030,d-.06);
    for(const s of [-1,1]){
      for(const px of [74.3,79.15,84.1,88.65]){
        const zz=z+s*(d/2-.16);
        add('rod',wood,px,.52,zz,.105,1.04,.105);
        add('round',sand,px,.96,zz,.135,.15,.135);
        if(px<88){
          const end=Math.min(px+4.9,88.65);
          rod(0xb4a58b,px,.88,zz,(px+end)/2,.69,zz,.035);
          rod(0xb4a58b,(px+end)/2,.69,zz,end,.88,zz,.035);
        }
        colliders.push({x:px,z:zz,r:.12});
      }
    }
    // A white-and-coral lifebuoy hangs from a dock piling.
    const lifeX=88.65,lifeZ=z+5.79;
    for(let k=0;k<16;k++){
      const a=k*Math.PI/8,b=(k+1)*Math.PI/8;
      rod(k%4<2?0xcd7358:ivory,lifeX+Math.cos(a)*.31,.74+Math.sin(a)*.31,lifeZ-.055,
        lifeX+Math.cos(b)*.31,.74+Math.sin(b)*.31,lifeZ-.055,.073);
    }
    for(let j=0;j<4;j++)for(let k=0;k<14;k++){
      const a=k*Math.PI/7,b=(k+1)*Math.PI/7,r=.245-j*.047;
      rod(0xc0a680,84.3+Math.cos(a)*r,.152,58.36+Math.sin(a)*r,
        84.3+Math.cos(b)*r,.152,58.36+Math.sin(b)*r,.021);
    }
    function dinghy(bx,bz,c){
      const rings=[[-1.98,.08],[-1.47,.61],[-.63,.78],[.57,.80],[1.38,.65],[1.86,.40]];
      const verts=[],idx=[];const colors=[];
      for(const [offset,r] of rings){
        for(const [xx,h] of [[-r,.53],[-r*.71,.19],[0,.07],[r*.71,.19],[r,.53]]){
          verts.push(bx+xx,h,bz+offset);
          const color=new THREE.Color(c);colors.push(color.r,color.g,color.b);
        }
      }
      for(let j=0;j<rings.length-1;j++)for(let i=0;i<4;i++){const k=j*5+i;idx.push(k,k+5,k+1,k+1,k+5,k+6);}
      const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geom.setIndex(idx);geom.computeVertexNormals();
      const boat=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.84,side:THREE.DoubleSide}));scene.add(boat);
      for(let i=1;i<rings.length;i++)for(const s of [-1,1]){
        const [z0,r0]=rings[i-1],[z1,r1]=rings[i];
        rod(ivory,bx+s*r0,.55,bz+z0,bx+s*r1,.55,bz+z1,.047);
      }
      for(const k of [-.90,.20,.93])box(wood,bx,.41,bz+k,1.16,.09,.27);
      rod(wood,bx-.43,.53,bz-1.30,bx+.42,.59,bz+1.36,.042);
      box(sand,bx+.47,.56,bz+1.53,.25,.047,.58,0,.31);
    }
    dinghy(86.33,61.35,0x728c82);dinghy(90.8,50.8,0xb97863);
    for(const [xx,zz] of [[76,39],[83,38.55],[96.5,39],[95,66.5],[77.2,67.6]]){
      bendFrom(.05, .14, () => {
        for(let n=0;n<16;n++){
          const px=xx+noise()*1.63,pz=zz+noise()*.6,ht=.55+noise()*.63;
          rod(0x929169,px,.05,pz,px+.10,ht,pz+.03,.019);
          add('rod',0x8f7855,px+.105,ht+.084,pz+.03,.049,.23,.049,0,0,-.1);
        }
      });
    }
  }
  {
    const {x,z,w,d}=mark('Supper pavilion');areaBatch('Supper pavilion');
    flooring(x,z,w,d,0xc3ae8d,0xcbb594);
    const canvas=new THREE.MeshStandardMaterial({color:0xffead2,roughness:1,side:THREE.DoubleSide});
    const stripe=new THREE.MeshStandardMaterial({color:0xd8b695,roughness:1,side:THREE.DoubleSide});
    const stripeWidth=(w+1.35)/16;
    for(const s of [-1,1])for(const materialIndex of [0,1]){
      const verts=[],idx=[];
      for(let i=materialIndex;i<16;i+=2){
        const a=x-w/2-.675+i*stripeWidth,b=a+stripeWidth;
        for(const [zz,h,slack] of [[0,6.66,.045],[d*.25,5.35,.13],[d*.5+.6,4.7,.2],[d*.5+.6,4.25,.23]]){
          const hem=h<=4.25?.19:0;
          verts.push(a,h,z+s*zz,(a+b)/2,h-slack-hem,z+s*zz,b,h,z+s*zz);
        }
        const base=verts.length/3-12;
        for(let j=0;j<3;j++)for(let k=0;k<2;k++){
          const a=base+j*3+k;idx.push(a,a+3,a+1,a+1,a+3,a+4);
        }
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
      const m=new THREE.Mesh(g,materialIndex?stripe:canvas);m.castShadow=true;
      wind.cloth(m, (_i,_x,y) => Math.max(0,4.7-y)*.17);
      scene.add(m);
    }
    for(const s of [-1,1])for(const offs of [-w/2,-w/4,0,w/4,w/2]){
      const px=x+offs,pz=z+s*(d/2-.09);
      solid(wood,px,2.33,pz,.21,4.67,.21);
      rod(wood,px,4.62,pz,px,6.57,z,.073);
      box(ivory,px+.14,2.28,pz,.26,4.56,.36,.016,0,-.07);
      box(brass,px+.14,1.46,pz,.30,.08,.40);
    }
    for(const s of [-1,1]){
      const tz=z+s*6.14;
      for(const dx of [-7.15,7.15]){
        const tx=x+dx;
        solid(ivory,tx,.77,tz,5,.36,1.54);
        for(const offX of [-2.15,2.15])for(const offZ of [-.54,.54])box(wood,tx+offX,.32,tz+offZ,.15,.64,.15);
        for(const k of [-1.65,0,1.65]){
          for(const b of [-1,1]){
            chair(tx+k,tz+b*1.24,b>0?0:Math.PI);
            add('round',ivory,tx+k,.966,tz+b*.47,.193,.018,.193);
            add('rod',0xa99a78,tx+k+.28,.977,tz+b*.44,.013,.33,.013,Math.PI/2);
            tumbler(tx+k+.29,.958,tz+b*.25);
          }
          lantern(tx+k,.955,tz);
        }
      }
    }
    for(let j=-1;j<=1;j++){
      const xx=x+j*7.0;
      rod(walnut,xx,6.53,z,xx,3.98,z,.026);
      add('round',brass,xx,3.68,z,.63,.65,.63);
      add('round',0xffdfa0,xx,3.44,z,.62,.085,.62,0,0,0,lightBulb);
      for(let k=0;k<12;k++){
        const a=k*Math.PI/6;rod(wood,xx+.632*Math.sin(a),3.39,z+.632*Math.cos(a),xx+.632*Math.sin(a),4.01,z+.632*Math.cos(a),.022);
      }
    }
    plaque('Supper pavilion',x,4.48,z+d/2+.621,4.75);
  }
  {
    const {x,z,w,d}=mark('Sparkler lawn');areaBatch('Sparkler lawn');
    flooring(x,z,w,d,0x84936b,0xadb48b,.027,'grass');
    flooring(x,z,4.16,d+.9,0xd5bf9e,0xcfb899,.055,'gravel');
    for(const s of [-1,1]){
      for(const zz of [-8.7,-4.8,0,4.8,8.7]){
        const lx=x+s*7.4,lz=z+zz;
        add('round',sand,lx,.23,lz,.36,.45,.36);
        lantern(lx,.47,lz);
        colliders.push({x:lx,z:lz,r:.34});
      }
      for(const off of [-d/2,d/2]){
        const lx=x+s*11.9,lz=z+off;
        solid(walnut,lx,2.38,lz,.20,4.76,.20);
        for(let i=0;i<18;i++){
          const a=i/18,b=(i+1)/18,y=u=>4.70-.73*4*u*(1-u);
          rod(walnut,lx,y(a),lz-off*2*a,lx,y(b),lz-off*2*b,.014);
          if(off>0)add('globe',0xffd59c,lx,y(a)-.092,lz-off*2*a,.058,.078,.058,0,0,0,lightBulb);
        }
      }
    }
    for(let row=0;row<2;row++)for(const side of [-1,1])settee(x+side*10.35,z-6.3+row*12.6,0xa6af92);
  }

  // The lanes follow the same survey coordinates as both estate maps.
  areaBatch('Estate lanes');
  for(const track of paths){
    for(let i=1;i<track.length;i++){
      const a=track[i-1],b=track[i],dx=b.x-a.x,dz=b.z-a.z;
      const length=Math.hypot(dx,dz),cx=(a.x+b.x)/2,cz=(a.z+b.z)/2;
      if(cx>-22&&cx<34&&cz<22.7)continue;
      const yaw=Math.atan2(dx,dz);
      build.footing('gravel',cx,cz,4.48,length+.33,.017,yaw);
      box(0xbba888,cx,-.017,cz,4.48,.046,length+.33,0,yaw);
      box(0xcfc0a4,cx,.0005,cz,4.1,.033,length+.27,0,yaw);
    }
  }
  function estateCar(x,z,c){
    solid(c,x,.51,z,1.75,.62,3.62);
    box(0x728381,x,1.01,z-.12,1.45,.56,1.85);
    box(c,x,1.34,z-.12,1.52,.10,1.75);
    for(const s of [-1,1])for(const t of [-1,1]){
      add('rod',0x4f504b,x+s*.849,.34,z+t*1.09,.29,.16,.29,0,0,Math.PI/2);
      box(t===1?0xe4d9a9:0xab6654,x+s*.57,.60,z+t*1.82,.24,.16,.04);
    }
  }
  areaBatch('Motor court');
  flooring(28,92,19.4,13.5,0xa9a492,0xc9bca5);
  for(let i=0;i<7;i++)box(ivory,20+i*2.6,.071,92,.054,.007,6.4);
  for(let i=0;i<5;i++)estateCar(21.32+i*2.64,92.3,[blue,ivory,0xae816e,0x657b74,0xb5a790][i]);
  // Orchards and tree lines frame vistas without filling the walking lanes.
  areaBatch('Tree lines');
  for(const [x,z] of [[-85,88],[-81,94],[-63,95],[-56,87],[-86,65],[-88,56],[-62,55],[-51,49],[-35,41],[-38,19],[-25,4],[-29,53],[-14,59],[-13,73],[15,63],[21,58],[36,52],[42,67],[40,88],[74,88],[88,83],[93,72],[71,13],[61,13],[45,15],[17,39],[-30,92]])oak(x,z,4.8+noise()*1.8);
  for(const sign of [-1,1])for(let i=0;i<12;i++)cypress(sign*96.7, -8+i*9.85,4.2+noise()*2.1);
  for(let i=0;i<21;i++)cypress(-96+i*9.3,104.8,5.4+noise()*1.8);
  for(let i=0;i<12;i++)cypress(-52+i*8.7,-10,4.3+noise()*1.8);
  for(const side of [-1,1])for(let n=0;n<5;n++)oak(side*18+n*1.45,31+n*6.8,4.1+noise());
  // A distant, non-playable orchard continues the landscape past the boundary.
  for(let side=0;side<3;side++)for(let n=0;n<12;n++){
    const px=side===0?-111:side===1?113:-95+n*17.9,pz=side===2?119:-2+n*10;
    const h=4.8+noise()*2.7;
    add('rod',wood,px,h*.31,pz,.18,h*.58,.18);
    bendFrom(h*.42, .072, () => {
      add('crown',0x8b966e,px,h*.81,pz,2.32,h*.33,2.20,0,noise()*3);
    });
  }

  // The outer routes look across ridged orchards in every direction.
  const hillsMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide});
  const hillColors=[0x96a087,0x89977b,0xa5ae94,0x929e86].map(c=>new THREE.Color(c));
  for(const face of ['west','east','south']){
    const verts=[],colors=[],indices=[];
    for(let j=0;j<3;j++)for(let i=0;i<=40;i++){
      const u=i/40,v=j/2;
      const height=(1.8+Math.abs(Math.sin(u*16.7+(face==='east'?1.6:0)))*4.1+Math.sin(u*32+1)*1.23)*v;
      const edge=(face==='south'?119:111)+v*16+2.3*Math.sin(u*27+.6);
      const lateral=(face==='south'?-147:-30)+u*(face==='south'?294:177);
      verts.push(face==='south'?lateral:face==='east'?edge:-edge,height-.3,face==='south'?edge:lateral);
      const c=hillColors[(j*5+i*7)%4];colors.push(c.r,c.g,c.b);
      if(i<40&&j<2){const a=j*41+i;indices.push(a,a+1,a+41,a+1,a+42,a+41);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
    scene.add(new THREE.Mesh(g,hillsMaterial));
  }

  function blocks(x,z){
    const r=.23;
    return walls.some(b=>Math.abs(x-b.x)<b.hw+r&&Math.abs(z-b.z)<b.hd+r);
  }
  function locationAt(x,z){
    for(const a of areas){
      if(Math.abs(x-a.x)<=a.w/2&&Math.abs(z-a.z)<=a.d/2)return a.name;
    }
    if(z>=84&&x>17&&x<40)return 'Motor court';
    if(x<-74&&z<23)return 'Vineyard rows';
    if(x>69&&z>34&&z<73)return 'Lakeside path';
    return 'Estate grounds';
  }
  return {blocks,locationAt,bounds:ESTATE_MAP.bounds};
}
