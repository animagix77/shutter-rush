// Camera and footfall field recordings for Villa Luce · Judge Dean LLC
// Credits and source licenses are in sound/FIELD-RECORDINGS.md.
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

// Independently trimmed mono recordings occupy 400 ms slots in one lossless file.
// Natural gaps within a take preserve the camera return stroke and the heel-to-toe roll.
const groups={
  wide:{first:0,count:6,duration:.163}, tele:{first:6,count:2,duration:.300},
  grass:{first:8,count:6,duration:.340}, gravel:{first:14,count:4,duration:.370},
  wood:{first:18,count:6,duration:.226}, stone:{first:24,count:6,duration:.205},
  carpet:{first:30,count:6,duration:.245}, wet:{first:36,count:5,duration:.215}
};
// Immediate fallback for a cold cache or a failed sample transfer.
// Curtain travel and the sprung catch are separate contacts. The smaller wide
// body has a shorter throw; the heavier telephoto body carries a lower knock.
function shutterBuffer(audio, tele) {
  const rate = audio.sampleRate, length = tele ? .123 : .084;
  const buffer = audio.createBuffer(1, Math.ceil(rate * length), rate);
  const wave = buffer.getChannelData(0);
  const contacts = tele
    ? [[0,.10,870,.0033],[.007,.35,251,.013],[.044,.27,360,.013],[.061,.12,790,.006]]
    : [[0,.09,980,.0023],[.004,.26,430,.007],[.030,.18,580,.007],[.041,.08,1050,.004]];
  let random = tele ? 35259 : 19795, low = 0, previous = 0;
  for (let i = 0; i < wave.length; i++) {
    const t = i / rate;
    random = (Math.imul(random,1664525) + 1013904223) >>> 0;
    const noise = random / 2147483648 - 1;
    low += .27 * (noise - low);
    const grit = low - previous * .62;
    previous = low;
    let v = 0;
    for (const [onset,gain,hz,decay] of contacts) {
      const age = t - onset;
      if (age < 0) continue;
      const phase = 2 * Math.PI * hz * age;
      const body = Math.sin(phase) + .35 * Math.sin(phase * 2.49) + .14 * Math.sin(phase * 4.7);
      const strike = 1 - Math.exp(-age / .00038);
      v += gain * strike * (body * Math.exp(-age / decay) + grit * 3.8 * Math.exp(-age / (decay * .74)));
    }
    wave[i] = .67 * Math.tanh(v) * Math.min(1,(length-t)/.004);
  }
  return buffer;
}

function shoeBuffer(audio, inside, variant) {
  const rate=audio.sampleRate, duration=inside ? .172 : .195;
  const buffer=audio.createBuffer(1, Math.ceil(rate*duration), rate);
  const samples=buffer.getChannelData(0);
  let seed=947331 + 18137 * variant, grit=0, dust=0, weight=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const sole=inside ? 124+variant*5 : 96+variant*4;
  const toe=.057+variant*.004;
  const grains=Array.from({length:7},(_,i)=>[.017+i*.014+random()*.011,.30+random()*.38]);
  const slow=1-Math.exp(-2*Math.PI*290/rate), mid=1-Math.exp(-2*Math.PI*1310/rate);
  const fast=1-Math.exp(-2*Math.PI*5700/rate);
  for(let i=0;i<samples.length;i++){
    const t=i/rate, noise=random()*2-1;
    weight+=slow*(noise-weight); grit+=mid*(noise-grit); dust+=fast*(noise-dust);
    const heel=(1-Math.exp(-t/.004))*Math.exp(-t/.031);
    const roll=Math.max(0,t-toe), ball=(1-Math.exp(-roll/.008))*Math.exp(-roll/.034);
    const phase=2*Math.PI*sole*t;
    let sample=(.36*heel+.25*ball)*weight;
    if(inside){
      // The hollow board rings briefly at heel strike and again as the sole rolls flat.
      sample+=heel*(.23*Math.sin(phase)+.13*Math.sin(phase*2.76));
      sample+=ball*(.15*Math.sin(2*Math.PI*sole*roll)+.14*(grit-weight));
    }else{
      let crunch=0;
      for(const [at,level] of grains){
        const age=t-at;
        if(age>=0)crunch+=level*(1-Math.exp(-age/.0018))*Math.exp(-age/.008);
      }
      sample+=heel*.10*Math.sin(phase)+(.22*heel+.17*ball)*(grit-weight)+crunch*.58*(dust-grit);
    }
    samples[i]=sample*Math.min(1,(duration-t)/.008);
  }
  return buffer;
}


const floors=new Set(['grass','gravel','wood','stone','carpet']);

export function createFieldFoley(audio){
  const voices=new Set(), lastTake=new Map(), fallbackCameras=new Map(), fallbackShoes=new Map();
  let bank=null, loading=false, retryAt=0, seed=36931;
  function random(){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  }
  async function load(){
    if(bank||loading||audio.currentTime<retryAt)return;
    loading=true;
    try{
      const response=await fetch(new URL('./sound/field-foley.flac',import.meta.url));
      if(!response.ok)throw Error(response.status);
      bank=await audio.decodeAudioData(await response.arrayBuffer());
    }catch{retryAt=audio.currentTime+8;}
    finally{loading=false;}
  }
  load();

  function take(name,side=0){
    const entry=groups[name], key=name+side;
    const lanes=side===0?1:2, offset=side>0?1:0, count=Math.ceil((entry.count-offset)/lanes);
    const previous=lastTake.get(key);
    const next=previous===undefined?Math.floor(random()*count):
      (previous+1+Math.floor(random()*Math.max(1,count-1)))%count;
    lastTake.set(key,next);
    return {start:(entry.first+offset+next*lanes)*.4,duration:entry.duration};
  }
  function play(buffer,cut,{gain,pan,rate,cutoff,room}){
    const source=audio.createBufferSource(), filter=audio.createBiquadFilter();
    const stereo=audio.createStereoPanner(), level=audio.createGain(), nodes=[source,filter,stereo,level];
    source.buffer=buffer;source.playbackRate.value=rate;
    filter.type='lowpass';filter.Q.value=.65;filter.frequency.value=cutoff;
    stereo.pan.value=clamp(pan,-1,1);level.gain.value=clamp(gain,0,1);
    source.connect(filter).connect(stereo).connect(level).connect(audio.destination);
    if(room>0){
      // Reflected sound arrives later and darker than the direct mechanical contact.
      const delay=audio.createDelay(.1), wall=audio.createBiquadFilter(), reflection=audio.createGain();
      delay.delayTime.value=.032;wall.type='lowpass';wall.frequency.value=2600;
      reflection.gain.value=room;filter.connect(delay).connect(wall).connect(reflection).connect(stereo);
      nodes.push(delay,wall,reflection);
    }
    voices.add(source);
    source.onended=()=>{for(const node of nodes)node.disconnect();voices.delete(source);};
    source.start(audio.currentTime,cut.start,cut.duration);
  }
  function shutter(kit,{volume=1,pan=0,distance=0,inside=false}={}){
    if(audio.state!=='running'||volume<=.001)return;
    const tele=kit==='tele', name=tele?'tele':'wide';
    let clip=take(name), buffer=bank;
    if(!buffer){
      load();
      if(!fallbackCameras.has(name))fallbackCameras.set(name,shutterBuffer(audio,tele));
      buffer=fallbackCameras.get(name);clip={start:0,duration:buffer.duration};
    }
    play(buffer,clip,{gain:volume*(tele?.92:.76),pan,rate:.985+random()*.030,
      cutoff:Math.max(2300,15500/(1+Math.max(0,distance)*.065)),room:inside?.21:0});
  }
  function footstep({surface,inside=false,soft=false,crouched=false,sprint=false,side=1,wet=0,volume=1,pan=0,distance=0}={}){
    if(audio.state!=='running'||volume<=.001)return;
    const floor=soft?'carpet':floors.has(surface)?surface:inside?'wood':'gravel';
    let clip=take(floor,side<0?-1:1), buffer=bank;
    if(!buffer){
      load();
      const variant=Math.floor(random()*3),key=(inside?3:0)+variant;
      if(!fallbackShoes.has(key))fallbackShoes.set(key,shoeBuffer(audio,inside,variant));
      buffer=fallbackShoes.get(key);clip={start:0,duration:buffer.duration};
    }
    const damp=clamp(wet,0,1);
    const level=volume*(crouched?.14:sprint?.52:.36)*(floor==='carpet'?.71:1);
    const options={gain:level,pan:pan+(side<0?-.12:.12)/(1+distance),rate:(sprint?1.06:crouched?.94:1)*(.97+random()*.06),
      cutoff:Math.max(1400,(crouched?5200:14200)/(1+distance*.075+damp*.27)),room:inside?.13:0};
    play(buffer,clip,options);
    if(bank&&!inside&&damp>.10){
      const splash=take('wet');
      play(bank,splash,{...options,gain:level*damp*(floor==='grass'?.28:.65),rate:options.rate*(.95+random()*.1)});
    }
  }
  function stop(){
    for(const source of voices)source.stop();
    voices.clear();
  }
  return {footstep,shutter,stop};
}
