// Positional wedding music, rain and reception Foley · Judge Dean LLC
import { createFieldFoley } from './field-foley.js';
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

export function createWeddingSound(audio) {
  const channels = new Map(), voices = new Map(), buffers = new Map();
  const loading = new Set(), retryAfter = new Map();
  const foley=createFieldFoley(audio);
  let previousTime = null, previousAudioTime = 0;

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
    foley.stop();
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
  return {update, stop, shutter:foley.shutter, footstep:foley.footstep};
}

export { perspective as soundPerspective };
