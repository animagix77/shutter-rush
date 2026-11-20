// Judge Dean LLC
import { TOSS_RELEASE, TOSS_CATCH } from './bouquet-event.js';

// Keep the best timing and recent alternatives independently for both photographers.
export function newTakePhotos() {
  return { shots: [], best: null, proof: null, chosen: null };
}
function better(candidate, current) {
  if (!current) return true;
  if (candidate.hit !== current.hit) return candidate.hit;
  const apex = (TOSS_RELEASE + TOSS_CATCH) / 2;
  return Math.abs(candidate.time - apex) < Math.abs(current.time - apex);
}
export function keepExposure(roll, photo) {
  if (better(photo, roll.best)) roll.best = photo;
  roll.shots.push(photo);
  if (roll.shots.length > 24) roll.shots.shift();
}
function options(roll) {
  if (!roll.best) return roll.proof ? [roll.proof] : [];
  return [...new Set([roll.best, ...roll.shots])].sort((a,b)=>a.time-b.time);
}
function makeElement(tag, text, cls) {
  const el=document.createElement(tag);
  if(text)el.textContent=text;
  if(cls)el.className=cls;
  return el;
}
export function presentPair(host, rolls) {
  const grid=makeElement('div',null,'diptych');
  const images=[];
  function frameCell(roll,index) {
    const figure=makeElement('figure');
    const title=makeElement('figcaption','Take 0'+(index+1));
    const shots=options(roll);
    const image=makeElement('img');
    const mat=makeElement('div',null,'printMat');
    const info=makeElement('div',null,'negativeInfo');
    const nav=makeElement('div',null,'takeNav');
    let selected=Math.max(0,shots.indexOf(roll.chosen||roll.best));
    function paint() {
      const photo=shots[selected];
      roll.chosen=photo;
      image.alt='Take '+(index+1)+', '+photo.label;
      image.src=photo.url;
      info.textContent=photo.time.toFixed(1)+' s · '+photo.focal+' mm · '+(photo.auto?'Safety frame':photo.hit?'Bouquet in flight':'Exposure '+photo.id);
      position.textContent=(selected+1)+' / '+shots.length;
    }
    const position=makeElement('span');
    figure.append(title,mat,info);
    if(shots.length){
      mat.append(image);images.push(image);paint();
      if(shots.length>1){
        for(const [dir,label] of [[-1,'Earlier frame'],[1,'Later frame']]){
          const next=makeElement('button',dir<0?'‹':'›');
          next.type='button';next.setAttribute('aria-label',label+' in take '+(index+1));
          next.onclick=()=>{selected=(selected+dir+shots.length)%shots.length;paint();};
          if(dir>0)nav.append(position);
          nav.append(next);
        }
        figure.append(nav);
      }
    }else mat.append(makeElement('span','No exposure'));
    return figure;
  }
  rolls.forEach((r,i)=>grid.append(frameCell(r,i)));host.append(grid);
  const save=makeElement('button','Save photo pair','primary');
  save.disabled=images.length!==2;
  save.onclick=async()=>{
    save.disabled=true;
    try{
      const photos=rolls.map(r=>r.chosen);
      const prints=await Promise.all(photos.map(async photo=>{const img=new Image();img.src=photo.url;await img.decode();return img;}));
      const page=document.createElement('canvas');page.width=1920;page.height=880;
      const ctx=page.getContext('2d');ctx.fillStyle='#f3edde';ctx.fillRect(0,0,1920,880);
      ctx.fillStyle='#26392e';ctx.font='italic 48px Georgia';ctx.fillText('The bouquet toss',52,68);
      ctx.font='20px monospace';ctx.textAlign='right';ctx.fillText('VILLA LUCE  /  TUSCANY',1868,62);ctx.textAlign='left';
      prints.forEach((img,i)=>{
        const x=52+i*926,scale=Math.min(890/img.naturalWidth,644/img.naturalHeight);
        const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
        ctx.fillStyle='#232924';ctx.fillRect(x,112,890,644);ctx.drawImage(img,x+(890-w)/2,112+(644-h)/2,w,h);
        ctx.fillStyle='#26392e';ctx.font='25px monospace';ctx.fillText('TAKE 0'+(i+1)+'   /   '+photos[i].time.toFixed(1)+' s   /   '+photos[i].focal+' mm',x,815);
      });
      const link=document.createElement('a');link.download='Villa-Luce-Two-Takes.jpg';link.href=page.toDataURL('image/jpeg',.92);link.click();
    }catch{save.textContent='Retry saving photo pair';}finally{save.disabled=false;}
  };
  return save;
}
