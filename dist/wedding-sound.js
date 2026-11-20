// Positional wedding music, rain and reception Foley · Judge Dean LLC
import { guitarLoop } from './guitar-score.js';

const stems = {
  guitar: ['chapel-steps', guitarLoop],
  ballroom: ['reception-waltz', 24],
  gardenRain: ['rain-garden', 8],
  roofRain: ['rain-roof', 8],
  thunder: ['storm-roll', 4.3],
  cake: ['cake-china', 2.15]
};
const hall = {x:23.8, z:1.5};
const cakeTable = {x:30.45, z:1.5};
const wrap = (t, length) => (t % length + length) % length;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function perspective(player, yaw, source, reach) {
  const dx = source.x - player.x, dz = source.z - player.z;
  const distance = Math.hypot(dx, dz);
  return {
    distance,
    volume: 1 / (1 + (distance / reach) ** 2),
    pan: clamp((dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(distance, 4), -.88, .88)
  };
}

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

export function createWeddingSound(audio) {
  const channels = new Map(), voices = new Map(), buffers = new Map();
  const loading = new Set(), retryAfter = new Map();
  const cameraBodies = new Map(), shoes = new Map(), foleyVoices = new Set();
  let stepNumber = 0;
  let previousTime = null, previousAudioTime = 0;

  function playFoley(buffer, volume, balance, speed = 1) {
    const source=audio.createBufferSource(), gain=audio.createGain(), pan=audio.createStereoPanner();
    source.buffer=buffer; source.playbackRate.value=speed;
    gain.gain.value=clamp(volume,0,1); pan.pan.value=clamp(balance,-1,1);
    source.connect(pan).connect(gain).connect(audio.destination);
    foleyVoices.add(source);
    source.onended=()=>{
      source.disconnect(); pan.disconnect(); gain.disconnect(); foleyVoices.delete(source);
    };
    source.start();
  }

  function shutter(kit, {volume=1,pan=0}={}) {
    if (audio.state !== 'running' || volume <= .001) return;
    const tele = kit === 'tele';
    if (!cameraBodies.has(tele)) cameraBodies.set(tele, shutterBuffer(audio, tele));
    playFoley(cameraBodies.get(tele),volume,pan);
  }

  function footstep({inside=false,crouched=false,sprint=false,side=1}={}) {
    if(audio.state!=='running')return;
    const variant=stepNumber++ % 3, key=variant+(inside?3:0);
    if(!shoes.has(key))shoes.set(key,shoeBuffer(audio,inside,variant));
    const level=crouched ? .15 : sprint ? .55 : .37;
    const speed=(crouched ? .90 : sprint ? 1.11 : 1) + (variant-1)*.018;
    playFoley(shoes.get(key),level,side<0?-.19:.19,speed);
  }

  async function load(name) {
    if (buffers.has(name) || loading.has(name) || audio.currentTime < (retryAfter.get(name) || 0)) return;
    loading.add(name);
    try {
      const url = new URL('./sound/' + stems[name][0] + '.m4a', import.meta.url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(response.statusText);
      const buffer = await audio.decodeAudioData(await response.arrayBuffer());
      buffers.set(name, buffer);
    } catch {
      // A mobile connection can fail mid-transfer. Retry only while that stem is audible.
      retryAfter.set(name, audio.currentTime + 8);
    } finally {
      loading.delete(name);
    }
  }

  function channel(name) {
    if (channels.has(name)) return channels.get(name);
    const gain = audio.createGain(), pan = audio.createStereoPanner(), filter = audio.createBiquadFilter();
    gain.gain.value = 0;
    filter.type = 'lowpass'; filter.frequency.value = 12000; filter.Q.value = .67;
    filter.connect(pan).connect(gain).connect(audio.destination);
    const bus = {gain, pan, filter, volume: -1, balance: -2, cutoff: 0};
    channels.set(name, bus);
    return bus;
  }

  function mix(name, volume, balance = 0, cutoff = 12000) {
    const bus = channel(name), now = audio.currentTime;
    if (Math.abs(bus.volume - volume) > .001) {
      bus.gain.gain.setTargetAtTime(volume, now, .075);
      bus.volume = volume;
    }
    if (Math.abs(bus.balance - balance) > .008) {
      bus.pan.pan.setTargetAtTime(balance, now, .065);
      bus.balance = balance;
    }
    if (Math.abs(bus.cutoff - cutoff) > 35) {
      bus.filter.frequency.setTargetAtTime(cutoff, now, .12);
      bus.cutoff = cutoff;
    }
  }

  function release(name) {
    const voice = voices.get(name);
    if (!voice) return;
    voices.delete(name);
    const now = audio.currentTime;
    voice.fade.gain.cancelScheduledValues(now);
    voice.fade.gain.setTargetAtTime(0, now, .006);
    voice.source.stop(now + .035);
  }

  function startVoice(name, offset, loop) {
    const buffer = buffers.get(name);
    if (!buffer) return;
    const source = audio.createBufferSource(), fade = audio.createGain();
    const length = Math.min(buffer.duration, stems[name][1]), now = audio.currentTime;
    source.buffer = buffer;
    source.loop = loop;
    if (loop) source.loopEnd = length;
    const position = loop ? wrap(offset, length) : offset;
    if (position >= buffer.duration) return;
    fade.gain.setValueAtTime(.0001, now);
    fade.gain.linearRampToValueAtTime(1, now + .017);
    source.connect(fade).connect(channel(name).filter);
    const voice = {source, fade, offset: position, start: now};
    source.onended = () => {
      source.disconnect(); fade.disconnect();
      if (voices.get(name) === voice) voices.delete(name);
    };
    voices.set(name, voice);
    source.start(now, position);
  }

  function loop(name, phase, volume, balance, cutoff, seek, syncScore = false) {
    if (volume < .002) { release(name); return; }
    mix(name, volume, balance, cutoff);
    if (!buffers.has(name)) { load(name); return; }
    const voice = voices.get(name), length = stems[name][1];
    if (voice && syncScore) {
      const predicted = voice.offset + audio.currentTime - voice.start;
      const drift = wrap(phase - predicted + length / 2, length) - length / 2;
      if (Math.abs(drift) > .42) seek = true;
    }
    if (seek) release(name);
    if (!voices.has(name)) startVoice(name, phase, true);
  }

  function cue(name, t, when, volume, balance, cutoff, seek) {
    const offset = t - when;
    if (offset < 0 || offset >= stems[name][1] || volume < .002) { release(name); return; }
    if (seek) release(name);
    mix(name, volume, balance, cutoff);
    if (!buffers.has(name)) { load(name); return; }
    if (!voices.has(name)) startVoice(name, offset, false);
  }

  function stop() {
    for (const name of voices.keys()) release(name);
    for (const source of foleyVoices) source.stop();
    foleyVoices.clear();
    previousTime = null;
  }

  function update({t, active, player, yaw = 0, guitar, inside = false, rain = 0,
                   soloStart = 359, soloEnd = 379, impactTime = 552}) {
    if (!active || audio.state !== 'running' || !Number.isFinite(t) || !player) { stop(); return; }
    // The short assignment advances the estate clock roughly seven times
    // faster during the drive. The band and pianist keep playing at tempo.
    const audioElapsed = Math.max(0, audio.currentTime - previousAudioTime);
    const seek = previousTime !== null && (t < previousTime - .05 || t > previousTime + Math.max(3, audioElapsed * 12));
    previousTime = t; previousAudioTime = audio.currentTime;
    const weather = clamp(rain, 0, 1);
    const reception = perspective(player, yaw, hall, 13);
    const diningRoom = inside && Math.abs(player.x - hall.x) < 9.3 && Math.abs(player.z - hall.z) < 10.3;
    if (guitar) {
      const source = perspective(player, yaw, guitar, 12);
      const solo = t >= soloStart && t <= soloEnd;
      const volume = .58 * source.volume * (inside ? .38 : 1) * (solo ? 1 : .57);
      loop('guitar', t - soloStart, volume, source.pan,
        (inside ? 1800 : 7600) / (1 + source.distance / 100), seek, solo);
    } else release('guitar');

    const piano = .54 * reception.volume * (diningRoom ? 1 : inside ? .19 : .57) * (1 - .62 * weather);
    loop('ballroom', t, piano, reception.pan, diningRoom ? 9500 : 2150, seek);
    loop('gardenRain', t, weather * (inside ? .09 : .46), 0, inside ? 1400 : 12000, seek);
    loop('roofRain', t + 2.7, weather * (inside ? .56 : .09), 0, inside ? 5400 : 9000, seek);

    // Decode the transient sounds before their first audible sample, including on a chapter jump.
    if (t >= impactTime - 19 && t < impactTime + 15) { load('cake'); load('thunder'); }
    const table = perspective(player, yaw, cakeTable, 15);
    cue('cake', t, impactTime - .27, .83 * table.volume * (diningRoom ? 1 : .64),
        table.pan, diningRoom ? 12500 : 3600, seek);
    const thunderAt = t < impactTime + 4.8 ? impactTime - 5.4 : impactTime + 4.8;
    cue('thunder', t, thunderAt, weather * (inside ? .32 : .62), -.47 * Math.cos(yaw),
        inside ? 680 : 2800, seek);
  }

  // Load the two musical beds while the player settles into the opening frame.
  load('guitar'); load('ballroom');
  return {update, stop, shutter, footstep};
}

export { perspective as soundPerspective };
