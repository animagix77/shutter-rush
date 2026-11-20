// Judge Dean LLC
import * as THREE from 'three';
import { makeCandleGlows } from './estate-lighting.js';

export function buildReceptionHall(scene, build) {
  const {box, rod, add, occlude, colliders, chair, receptionTable, urn, gardenSpray,
    olive, cypress, lightBulb, flagstone, bendFrom, wind} = build;
  const X0=14.8,X1=32.8,Z0=-8.5,Z1=11.5,CX=(X0+X1)/2,CZ=(Z0+Z1)/2;
  const height=4.55,pitch=.205,rise=10*pitch;
  const butter=0xdcc08e,plaster=0xf0ddbc,trim=0xf9ead3,
    oak=0x6d4836, walnut=0x4e392e,sage=0x758475,brass=0xb99150;
  const barriers=[];
  function solid(color,x,y,z,w,h,d) {
    box(color,x,y,z,w,h,d);
    occlude(x,y,z,w,h,d);
    if(y-h*.5<1.65)barriers.push({x,z,hw:w/2,hd:d/2});
  }
  function borderRail(x,z,w,d) {
    box(0xc6a784,x,.47,z,w,.98,d);
    box(0xe7cdae,x,.98,z,w+.13,.1,d+.13);
    occlude(x,.50,z,w,1,d);
    barriers.push({x,z,hw:w/2,hd:d/2});
  }
  function plaque(x,y,z,width,angle,title,subtitle) {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=224;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#314b40';ctx.fillRect(0,0,768,224);
    ctx.strokeStyle='#bc9a64';ctx.lineWidth=2.5;ctx.strokeRect(11,11,746,202);
    ctx.lineWidth=1;ctx.strokeRect(18,18,732,188);
    ctx.fillStyle='#e7d7b9';ctx.textAlign='center';ctx.font='23px Georgia, serif';
    ctx.fillText(subtitle,384,70,686);
    ctx.font='italic 65px Georgia, serif';ctx.fillText(title,384,151,694);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,width*224/768),
      new THREE.MeshStandardMaterial({map:tex,roughness:.76}));
    sign.position.set(x,y,z);sign.rotation.y=angle;scene.add(sign);
  }
  function floorTexture() {
    const c=document.createElement('canvas');c.width=c.height=256;
    const g=c.getContext('2d');
    let seed=19;const noise=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    g.fillStyle='#795645';g.fillRect(0,0,256,256);
    for(let iz=0;iz<4;iz++)for(let ix=0;ix<4;ix++) {
      const vert=(ix+iz)%2===0;
      for(let k=0;k<4;k++) {
        const x=64*ix+(vert?16*k:0),y=64*iz+(vert?0:16*k),w=vert?16:64,h=vert?64:16;
        g.fillStyle='hsl('+(24+noise()*5)+' 31% '+(47+noise()*10)+'%)';g.fillRect(x,y,w-.7,h-.8);
        g.strokeStyle='rgba(71,37,20,.12)';g.lineWidth=.8;
        for(let l=0;l<5;l++){
          g.beginPath();const f=noise(),len=noise()*.35;
          if(vert){g.moveTo(x+f*w,y+h*len);g.lineTo(x+f*w+noise()*.9,y+h*(.68+noise()*.3));}
          else{g.moveTo(x+w*len,y+h*f);g.lineTo(x+w*(.68+noise()*.3),y+h*f+noise()*.9);}
          g.stroke();
        }
      }
    }
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,5);t.anisotropy=4;
    return t;
  }
  // Floor is flush with the terrace. The dance floor is differentiated by its parquet and inlay.
  build.footing('stone',CX,CZ,18,20,.07);
  build.footing('wood',CX,CZ,8.7,10.7,.111);
  box(0xdacbb0,CX,.01,CZ,18,.12,20);
  for(let x=15.5;x<X1;x+=1.1)box(0xcbbb9d,x,.072,CZ,.011,.006,19.7);
  for(let z=-8;z<Z1;z+=1.1)box(0xcbbb9d,CX,.072,z,17.8,.006,.011);
  box(walnut,CX,.084,CZ,8.7,.03,10.7);box(0xac864e,CX,.103,CZ,8.57,.012,10.57);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(8.41,10.41),
    new THREE.MeshStandardMaterial({map:floorTexture(),roughness:.77}));
  floor.position.set(CX,.111,CZ);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);

  // The front door is a real break in the wall. The glassless garden windows
  // have individual piers and sills; the raycast proxies follow these openings.
  for(const [lo,hi] of [[Z0,-1.3],[4.5,Z1]])solid(butter,X0,height/2,(lo+hi)/2,.34,height,hi-lo);
  solid(plaster,X0,(height+3.66)/2,1.6,.34,height-3.66,5.8);
  // Open French doors behind the cake connect the ballroom to the rose terrace.
  // The side windows have stone sills. The central bay is open down to the floor.
  const centerWidth=3.10,sideBay=1.62,pier=.30;
  const bays=[[CZ-centerWidth/2-pier-sideBay/2,sideBay],[CZ,centerWidth],[CZ+centerWidth/2+pier+sideBay/2,sideBay]];
  const openingTop=3.82,sill=.77;
  let eastEdge=Z0;
  for(const [z,w] of bays){
    const lo=z-w/2,hi=z+w/2;
    solid(plaster,X1,height/2,(eastEdge+lo)/2,.34,height,lo-eastEdge);
    solid(plaster,X1,(openingTop+height)/2,z,.34,height-openingTop,w);
    if(z!==CZ){
      solid(sage,X1,sill/2,z,.34,sill,w);
      box(trim,X1,sill,z,.52,.09,w+.09);
    }
    for(const s of [-1,1]){
      const pz=z+s*(w/2+.04);
      box(trim,X1-.09,1.92,pz,.40,3.84,.115);
      box(trim,X1-.14,3.80,pz,.56,.16,.23);
      box(brass,X1-.305,2.00,pz,.015,3.45,.022);
    }
    box(trim,X1,openingTop+.04,z,.56,.16,w+.22);
    eastEdge=hi;
  }
  solid(plaster,X1,height/2,(eastEdge+Z1)/2,.34,height,Z1-eastEdge);

  for(const z of [Z0,Z1]){
    const windowCenters=[18.4,23.85,29.3],halfWindow=1.55;
    let lo=X0;
    for(const x of windowCenters){
      const edge=x-halfWindow;
      solid(plaster,(lo+edge)/2,height/2,z,edge-lo,height,.34);
      solid(sage,x,.54,z,halfWindow*2,1.08,.34);
      solid(plaster,x,(height+3.53)/2,z,halfWindow*2,height-3.53,.34);
      for(const sy of [1.09,3.52])box(trim,x,sy,z,3.24,.125,.46);
      for(const sx of [-1,1])box(trim,x+sx*halfWindow,2.28,z,.09,2.43,.41);
      // Narrow bronze glazing bars leave the view of the grounds clear.
      box(brass,x,2.29,z,.032,2.38,.042);box(brass,x,2.95,z,3.08,.035,.042);
      for(const s of [-1,1]){
        const xEdge=x+s*1.71;
        for(let j=0;j<4;j++)add('pot',j%2?0xd9be9d:0xe8d0af,
          xEdge+s*(j*.058),2.26,z+(z===Z0?.25:-.25),.066,2.47,.062);
      }
      lo=x+halfWindow;
    }
    solid(plaster,(lo+X1)/2,height/2,z,X1-lo,height,.34);
    for(const x of [15.55,21.1,26.55,32.13]) {
      box(sage,x,.59,z,1.31,1.13,.39);
      box(0xb19068,x,.96,z,.98,.041,.412);box(0xb19068,x,.28,z,.98,.039,.412);
      for(const s of [-1,1])box(0xb19068,x+s*.48,.62,z,.036,.70,.412);
    }
    box(trim,CX,1.13,z,18,.11,.44);
    box(trim,CX,4.37,z,18.4,.22,.50);
  }
  for(const z of [-1.36,4.56]){
    box(trim,X0,1.85,z,.56,3.7,.24);
    box(brass,X0-.29,1.85,z,.024,3.61,.047);
    box(trim,X0,.18,z,.64,.33,.42);box(trim,X0,3.56,z,.66,.24,.45);
  }
  box(trim,X0,3.70,1.6,.62,.18,6.2);
  plaque(X0-.19,4.13,1.60,2.83,-Math.PI/2,'Sala degli Ulivi','V I L L A   L U C E');
  // Oak double doors stand folded against the wall, leaving the opening usable.
  for(const side of [-1,1]){
    const z=1.6+side*3.63;
    solid(oak,X0-.33,1.56,z,.125,3.1,1.56);
    for(const y of [.82,2.28]){
      box(0x9f7951,X0-.41,y,z,.075,1.15,1.27);
      box(oak,X0-.46,y,z,.035,.93,1.07);
    }
    box(brass,X0-.50,1.4,z+side*.44,.06,.17,.05);
  }

  // The pitched roof has a closed gable at either end, a timber underside,
  // and lightweight instanced terracotta ribbing on the outer surface.
  for(const sign of [-1,1]){
    const z=CZ+sign*5.12,tilt=sign*Math.atan(pitch);
    box(oak,CX,height+rise*.5-.045,z,18.72,.19,10.62,tilt);
    box(0xaf6041,CX,height+rise*.5+.10,z,18.94,.15,10.75,tilt);
    for(let x=X0-.36;x<X1+.4;x+=.37)rod(0xb56f4b,x,height+rise+.2,CZ,x,height+.11,CZ+sign*10.4,.047);
  }
  for(const x of [X0,X1]){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute([x,height,Z0,x,height,Z1,x,height+rise,CZ],3));
    g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:plaster,side:THREE.DoubleSide,roughness:.97}));
    m.castShadow=m.receiveShadow=true;scene.add(m);
  }
  rod(0xb27852,X0-.47,height+rise+.24,CZ,X1+.47,height+rise+.24,CZ,.108);
  for(let x=X0+.30;x<X1;x+=3.46){
    box(walnut,x,4.40,CZ,.21,.22,19.76);
    for(const s of [-1,1]){
      rod(oak,x,4.41,CZ+s*9.78,x,6.33,CZ,.135);
      rod(walnut,x,4.48,CZ+s*3.8,x,5.92,CZ,.103);
      box(0x614331,x,3.98,CZ+s*9.73,.24,.82,.34);
    }
    box(oak,x,5.40,CZ,.13,1.89,.13);
  }
  const flames=[];
  function chandelier(x,z){
    bendFrom(6.40, -.013, () => {
      rod(walnut,x,6.40,z,x,4.03,z,.023);
      add('pot',brass,x,3.92,z,.105,.19,.105);
      add('globe',brass,x,3.79,z,.13,.115,.13);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4, n=(i+1)*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a),r=.80;
        rod(brass,x+dx*.13,3.81,z+dz*.13,x+dx*.44,3.47,z+dz*.44,.026);
        rod(brass,x+dx*.44,3.47,z+dz*.44,x+dx*r,3.59,z+dz*r,.032);
        rod(brass,x+dx*r,3.59,z+dz*r,x+Math.cos(n)*r,3.59,z+Math.sin(n)*r,.024);
        add('pot',brass,x+dx*r,3.60,z+dz*r,.09,.08,.09);
        add('rod',0xffefd0,x+dx*r,3.80,z+dz*r,.043,.36,.043);
        flames.push([x+dx*r,4.005,z+dz*r,.35]);
        add('globe',0xffe3a1,x+dx*r,4.005,z+dz*r,.038,.076,.038,0,0,0,lightBulb);
        add('leaf',0xe5ddbf,x+dx*r,3.42,z+dz*r,.043,.13,.043);
      }
      add('leaf',0xe5d4b3,x,3.49,z,.077,.23,.077);
    });
  }
  for(const x of [19.25,24.35,29.48])chandelier(x,CZ);
  // Each point approximates a group of bulbs. Offset the east group toward the
  // center chandelier to spread the warm key across the cake's vertical tiers.
  const lamps=[19.25,27.9].map(x=>{
    const lamp=new THREE.PointLight(0xffc088,25,13,2);
    lamp.position.set(x,3.70,CZ+.45);scene.add(lamp);return lamp;
  });
  // Sky coming through the open French doors gives dark suits and the edge
  // of the ivory frosting a cool rim, while the chandeliers model the front.
  const windowLight=new THREE.SpotLight(0xb7d4ff,17,13,1.08,.77,2);
  windowLight.position.set(34.3,3.6,CZ+.85);
  windowLight.target.position.set(27,1.3,CZ-.28);
  scene.add(windowLight,windowLight.target);
  // Silk canopies dip between the ceiling joists and frame the doors to the terrace.
  const silk=new THREE.MeshStandardMaterial({side:THREE.DoubleSide,vertexColors:true,roughness:.87});
  function drape(a,b,dip,depth,color,hem){
    const pos=[],rgb=[],indices=[],cols=48,rows=7;
    const tint=new THREE.Color(color),trimColor=new THREE.Color(hem);
    for(let v=0;v<=rows;v++)for(let j=0;j<=cols;j++){
      const u=j/cols,f=v/rows,curve=Math.sin(u*Math.PI),flute=Math.cos(u*17*Math.PI+.85*f);
      const x=THREE.MathUtils.lerp(a[0],b[0],u),z=THREE.MathUtils.lerp(a[2],b[2],u);
      const len=Math.hypot(b[0]-a[0],b[2]-a[2]),side=.071*f*flute*curve;
      pos.push(x+side*(b[2]-a[2])/len,
        THREE.MathUtils.lerp(a[1],b[1],u)-curve*(dip+f*depth)+.026*f*flute*curve,z-side*(b[0]-a[0])/len);
      const c=v===rows?trimColor:tint,shade=.95+.05*flute;
      rgb.push(c.r*shade,c.g*shade,c.b*shade);
      if(j&&v){const d=v*(cols+1)+j,bl=d-1,tr=d-cols-1;indices.push(tr-1,bl,tr,bl,d,tr);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));g.setIndex(indices);g.computeVertexNormals();
    const m=new THREE.Mesh(g,silk);m.castShadow=m.receiveShadow=true;scene.add(m);
    wind.cloth(m,i=>.027*(Math.floor(i/(cols+1))/rows)*Math.sin(Math.PI*(i%(cols+1))/cols));
  }
  for(const z of [-3.05,6.15]){
    drape([X0+.45,4.29,z],[CX,5.27,z],.47,.33,0xf7e5cc,0xe8d4b1);
    drape([CX,5.27,z],[X1-.39,4.29,z],.47,.33,0xf7e5cc,0xe8d4b1);
  }
  const brassGold=0xcbad76, wine=0x854958;
  for(const [z,w] of bays){
    drape([X1-.39,4.12,z-w*.57],[X1-.39,4.12,z+w*.57],.24,.22,0xe4b9aa,brassGold);
    for(const s of [-1,1]){
      const pz=z+s*(w*.50+.03);
      for(let k=0;k<4;k++){
        add('rod',k%2?wine:0xa96570,X1-.34,2.90,pz+s*k*.052,.075,2.28,.074,0,0,s*.02);
      }
      add('round',brassGold,X1-.34,2.15,pz+s*.09,.145,.068,.112);
    }
  }

  // Roses hang from the terrace lintel in front of the reflected evening light.
  const garlandColors=[0xf5e1cd,0xc87f82,0xf1c9b7,0xe1a59a];
  bendFrom(4.03,-.035,()=>{
    for(let i=0;i<=36;i++){
      const u=i/36,z=CZ+(u-.5)*8.22;
      const dip=Math.abs(Math.sin(3*Math.PI*u)),y=3.99-.27*dip;
      const x=X1-.41-.064*Math.sin(i*2.08);
      if(i<36)rod(0x6a7654,x,y,z,X1-.41-.064*Math.sin((i+1)*2.08),
        3.99-.27*Math.abs(Math.sin(3*Math.PI*(i+1)/36)),z+8.22/36,.026);
      for(let j=0;j<3;j++){
        const a=i*2.4+j*1.91,yy=y-.062*j;
        add('leaf',j%2?0x708164:0x566b50,x+Math.sin(a)*.09,yy,z+Math.cos(a)*.095,.084,.14,.052,-.3,a,.78*Math.sin(a));
      }
      if(i%5===1)continue;
      const cy=y-.08-.07*Math.sin(i*2.42),cz=z+.055*Math.cos(i*2.42),col=garlandColors[i%4];
      add('pebble',col,x-.085,cy,cz,.105,.095,.098);
      for(let j=0;j<5;j++){
        const a=j*Math.PI*2/5+i;
        add('pebble',col,x-.112,cy+Math.sin(a)*.066,cz+Math.cos(a)*.072,.087,.075,.068,a,.64,a*.5);
      }
    }
  });

  function candelabrum(x,z,floor,scale){
    const Y=h=>floor+h*scale;
    add('round',brassGold,x,Y(.035),z,.20*scale,.07*scale,.20*scale);
    add('pot',brass,x,Y(.19),z,.089*scale,.29*scale,.089*scale);
    add('rod',brassGold,x,Y(.77),z,.040*scale,1.08*scale,.04*scale);
    add('globe',brass,x,Y(.81),z,.090*scale,.096*scale,.09*scale);
    const positions=[[x,z,1.29]];
    for(let j=0;j<4;j++){
      const a=j*Math.PI/2+.35,dx=Math.cos(a)*scale,dz=Math.sin(a)*scale;
      rod(brassGold,x,Y(1.03),z,x+dx*.18,Y(.925),z+dz*.18,.022*scale);
      rod(brassGold,x+dx*.18,Y(.925),z+dz*.18,x+dx*.255,Y(1.14),z+dz*.255,.024*scale);
      positions.push([x+dx*.255,z+dz*.255,1.14]);
    }
    for(const [px,pz,h] of positions){
      add('pot',brassGold,px,Y(h),pz,.059*scale,.066*scale,.059*scale);
      add('rod',0xffeaca,px,Y(h+.16),pz,.022*scale,.27*scale,.022*scale);
      flames.push([px,Y(h+.331),pz,.35*scale]);
      add('leaf',0xffcf80,px,Y(h+.331),pz,.025*scale,.061*scale,.025*scale,0,0,-.12,lightBulb);
    }
  }
  for(const side of [-1,1]){
    urn(31.96,CZ+side*2.95,1.23);
    candelabrum(31.62,CZ+side*1.72,.07,1.64);
    colliders.push({x:31.62,z:CZ+side*1.72,r:.30});
  }
  const cakeX=30.45,cakeZ=CZ;
  add('round',walnut,cakeX,.46,cakeZ,.18,.87,.18);
  add('round',0xe7dbc5,cakeX,.94,cakeZ,1.12,.11,1.12);
  // The satin skirt is cut on the bias, gathered in twelve deep scallops.
  const skirt=[],skirtIndices=[],circ=96;
  for(let row=0;row<=5;row++)for(let i=0;i<=circ;i++){
    const a=i*2*Math.PI/circ,f=row/5,r=1.11-.068*f+.049*f*Math.cos(24*a);
    skirt.push(cakeX+Math.cos(a)*r,.945-f*.80+.08*f*f*(.5+.5*Math.cos(12*a)),cakeZ+Math.sin(a)*r);
    if(row&&i){const d=row*(circ+1)+i;skirtIndices.push(d-circ-2,d-1,d-circ-1,d-1,d,d-circ-1);}
  }
  const cloth=new THREE.BufferGeometry();
  cloth.setAttribute('position',new THREE.Float32BufferAttribute(skirt,3));cloth.setIndex(skirtIndices);cloth.computeVertexNormals();
  const skirtMesh=new THREE.Mesh(cloth,new THREE.MeshStandardMaterial({color:0xf1dfcb,roughness:.86,side:THREE.DoubleSide}));
  skirtMesh.receiveShadow=skirtMesh.castShadow=true;scene.add(skirtMesh);
  wind.cloth(skirtMesh,(_i,_x,y)=>.02*(1-y));
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    for(let j=0;j<7;j++){
      const b=a+j*Math.PI/42,n=b+Math.PI/42,h=u=>.87-.20*Math.sin(u*Math.PI);
      rod(0xe3bf98,cakeX+1.114*Math.cos(b),h(j/7),cakeZ+1.114*Math.sin(b),
        cakeX+1.114*Math.cos(n),h((j+1)/7),cakeZ+1.114*Math.sin(n),.019);
    }
    add('globe',0xecc6ad,cakeX+1.115*Math.cos(a),.88,cakeZ+1.115*Math.sin(a),.055,.043,.055);
  }
  add('round',brassGold,cakeX,1.00,cakeZ,.80,.055,.80);
  colliders.push({x:cakeX,z:cakeZ,r:1.10});
  occlude(cakeX,.50,cakeZ,1.72,.99,1.72);
  for(const [x,z] of [[18.25,-5.2],[24.07,-5.4],[29.90,-5.25],[18.4,8.32],[24.12,8.33],[29.93,8.23]]){
    receptionTable(x,z);
    candelabrum(x+.30,z-.10,.92,.47);
    for(let k=0;k<3;k++){
      const a=k*Math.PI*2/3+.22;
      add('rod',brassGold,x+.55*Math.cos(a),.953,z+.55*Math.sin(a),.060,.054,.060);
      add('leaf',0xffd591,x+.55*Math.cos(a),.998,z+.55*Math.sin(a),.020,.042,.02,0,0,.12,lightBulb);
    }
    for(let i=0;i<5;i++){
      const a=Math.PI*2*i/5+.26;
      chair(x+Math.sin(a)*1.32,z+Math.cos(a)*1.32,a);
    }
  }
  // Framed landscapes and gilt sconces on the cake wall and garden façade.
  function sconce(x,z,dir){
    box(brass,x,2.62,z,.095,.43,.158);
    rod(brass,x,2.48,z,x+dir*.23,2.59,z,.032);
    add('pot',0xf3d5a0,x+dir*.23,2.77,z,.181,.30,.181,0,0,0,lightBulb);
  }
  for(const z of [-5.8,-2.85,5.86,8.75])sconce(X1-.21,z,-1);
  for(const z of [-6.3,-2.8,6.40,9.35])sconce(X0+.21,z,1);
  for(const z of [-4.90,7.42]){
    box(oak,X1-.205,2.34,z,.09,1.66,2.3);
    box(0xb39a66,X1-.255,2.34,z,.05,1.5,2.14);
    box(0x99a998,X1-.29,2.34,z,.03,1.39,2.02);
    for(let i=0;i<5;i++){
      const px=X1-.314-i*.003,pz=z-.65+i*.30;
      add('leaf',i%2?0x899574:0x637e63,px,2.31+(i%3)*.051,pz,.009,.245,.64,1.37,0,0);
    }
    box(0x9eaf80,X1-.34,1.99,z,.027,.51,2.01);
  }
  // Signposts, an olive grove, and an arrival drive extend playable grounds
  // beyond the original courtyard without scaling the guests or furniture.
  build.exterior();
  // An open-air supper terrace can be reached through the ballroom's French doors.
  build.footing('stone',37.27,CZ,8.70,9.10,.062);
  box(0xbcb19b,37.27,.023,CZ,8.70,.078,9.10);
  for(const pz of [-1.92,4.92]){
    const px=36.53;
    box(0xd8c7af,px,.78,pz,4.65,.096,.89);
    box(0xe9d9c4,px,.56,pz,4.62,.44,.85);
    for(const dx of [-1.83,1.83])for(const dz of [-.30,.30])box(oak,px+dx,.27,pz+dz,.11,.47,.11);
    occlude(px,.54,pz,4.56,.64,.83);
    barriers.push({x:px,z:pz,hw:2.31,hd:.44});
    for(let k=-2;k<=2;k++){
      const sx=px+k*.78;
      for(const d of [-1,1]){
        add('round',trim,sx,.841,pz+d*.27,.115,.018,.115);
        add('rod',0xd8cbaa,sx+.16,.904,pz+d*.23,.010,.123,.010);
        add('pot',0xe9d6b8,sx+.16,.99,pz+d*.23,.050,.096,.050);
      }
      if(k%2===0){add('pot',brass,sx,.98,pz,.11,.25,.11);gardenSpray(sx,1.06,pz,.63,10);}
      else candelabrum(sx,pz,.83,.61);
    }
  }
  for(const pz of [-3.05,6.05]){
    for(const dx of [35.2,38.3,41.0]){urn(dx,pz,.80);gardenSpray(dx,.64,pz,.83,9);}
    cypress(41.58,pz,4.35,.48);
  }
  for(let ix=0;ix<8;ix++)for(let iz=0;iz<6;iz++)
    flagstone(8.5+ix*1.05,-.92+iz*1.04,1.044,1.034);
  for(const s of [-1,1])urn(X0-.89,1.6+s*3.05,.99);
  const signX=3.35,signZ=6.3;
  for(const s of [-1,1])box(oak,signX+s*.57,.60,signZ,.078,1.2,.09);
  box(oak,signX,1.21,signZ,1.74,.51,.075);
  plaque(signX,1.21,signZ+.044,1.73,0,'Reception  →','S A L A   D E G L I   U L I V I');
  colliders.push({x:signX,z:signZ,r:.59});
  occlude(signX,1.21,signZ,1.72,.51,.08);
  for(let iz=0;iz<9;iz++)for(let ix=-6;ix<7;ix++)
    flagstone(ix*1.23+(iz%2)*.38,12.85+iz*1.18,1.225,1.17);
  for(const x of [-8.5,8.55]){
    for(const z of [14.0,18.3,21.8]) {
      cypress(x,z,4.55+(z===18.3?.53:.0),.55);
      add('round',0xa49170,x,.11,z,.81,.24,.81);
    }
  }
  // Stone reflecting pool and side paths in the western olive garden.
  const poolX=-18.9,poolZ=4.3;
  for(let z=Z0;z<20;z+=1.30)for(const x of [-15.75,-17.0])flagstone(x,z,1.244,1.293);
  solid(0xbda580,poolX,.20,poolZ,3.24,.45,8.45);
  wind.water(scene,poolX,.461,poolZ,2.91,8.06,0x8daba0);
  for(const x of [poolX-1.55,poolX+1.55])box(0xe6d0aa,x,.48,poolZ,.17,.10,8.42);
  for(const z of [poolZ-4.12,poolZ+4.12])box(0xe6d0aa,poolX,.48,z,3.24,.10,.18);
  add('flowerpot',0xd2b68e,poolX,.67,poolZ,.35,.48,.35);
  add('pot',0xdbbf94,poolX,.98,poolZ,.66,.16,.66);
  add('globe',0x9db9b0,poolX,1.08,poolZ,.49,.06,.49);
  for(const [x,z] of [[-21,-7],[-20.7,13.4],[-17.1,18.3],[-10.9,20.3],[14.1,18.0],[21.4,18.2],[29.9,19.2]])
    olive(x,z,4.12,1.04);
  for(const [x,z] of [[-21.6,-1.3],[-21.9,8.5],[-20,18.8],[32,15]])cypress(x,z,4.64,.58);
  // Wide breaks connect the original walled courtyard to the outer estate.
  borderRail(-23.33,-4.1,.36,14.3);
  borderRail(34.34,-7.55,.36,7.4);borderRail(34.34,8.19,.36,1.27);
  borderRail(-10.52,23.05,13.1,.36);borderRail(11.15,23.05,10.42,.36);
  borderRail(-19.35,-11.65,8.62,.36);borderRail(24.76,-11.65,19.70,.36);
  for(const x of [-3.98,5.95]){
    box(butter,x,1.72,23.03,.74,3.44,.78);
    box(trim,x,3.44,23.03,.98,.22,1.03);
    add('globe',brass,x,3.72,23.03,.25,.27,.25);
  }

  function blocks(x,z){
    const radius=.23;
    return barriers.some(b=>Math.abs(x-b.x)<=b.hw+radius&&Math.abs(z-b.z)<=b.hd+radius);
  }
  barriers.push({x:0,z:-11.7,hw:15,hd:.20});
  const glow=makeCandleGlows(scene,flames);
  function light(dusk,rain){
    lamps[0].intensity=18+12*dusk+2.6*rain;
    lamps[1].intensity=26+16*dusk+3.5*rain;
    windowLight.intensity=18+19*rain-5*dusk;
    glow.value=.63+.64*dusk+.11*rain;
  }
  return {blocks,light};
}
