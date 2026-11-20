// Judge Dean LLC
const noiseBuffers = new WeakMap();

function noiseFor(context) {
  if (noiseBuffers.has(context)) return noiseBuffers.get(context);
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .4), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  noiseBuffers.set(context, buffer);
  return buffer;
}

// Band-limited friction. The slower onset belongs to cloth and sliding contacts.
function scrape(context, at, duration, fromHz, toHz, gain, attack = .009) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const level = context.createGain();
  source.buffer = noiseFor(context);
  filter.type = 'bandpass';
  filter.Q.value = .85;
  filter.frequency.setValueAtTime(fromHz, at);
  filter.frequency.exponentialRampToValueAtTime(toHz, at + duration);
  level.gain.setValueAtTime(.0001, at);
  level.gain.linearRampToValueAtTime(gain, at + attack);
  level.gain.exponentialRampToValueAtTime(.0001, at + duration);
  source.connect(filter).connect(level).connect(context.destination);
  source.onended = () => { source.disconnect(); filter.disconnect(); level.disconnect(); };
  source.start(at, Math.random() * .1, duration);
}

// A short body resonance gives hard plastic its weight under the contact tick.
function resonance(context, at, hz, endHz, duration, gain) {
  const tone = context.createOscillator();
  const level = context.createGain();
  tone.frequency.setValueAtTime(hz, at);
  tone.frequency.exponentialRampToValueAtTime(endHz, at + duration);
  level.gain.setValueAtTime(.0001, at);
  level.gain.linearRampToValueAtTime(gain, at + .0015);
  level.gain.exponentialRampToValueAtTime(.0001, at + duration);
  tone.connect(level).connect(context.destination);
  tone.onended = () => { tone.disconnect(); level.disconnect(); };
  tone.start(at);
  tone.stop(at + duration);
}

function click(context, at, hz, gain) {
  scrape(context, at, .022, hz * 2.7, hz * 1.3, gain, .001);
  resonance(context, at, hz, hz * .73, .031, gain * .46);
}

export function playServiceCue(context, kind, event) {
  if (!context || context.state === 'closed') return;
  const at = context.currentTime;
  const battery = kind === 'battery';
  switch (event) {
    case 'open':
      click(context, at, battery ? 740 : 1740, .060);
      scrape(context, at + .012, .071, 2100, 910, .037);
      break;
    case 'release':
      click(context, at, battery ? 920 : 2350, .072);
      click(context, at + (battery ? .038 : .022), battery ? 470 : 1550, .043);
      break;
    case 'out':
      scrape(context, at, battery ? .125 : .075, battery ? 880 : 3120,
        battery ? 570 : 1680, battery ? .060 : .047);
      break;
    case 'stowed':
      scrape(context, at, .13, 1460, 600, .067, .014);
      resonance(context, at + .045, battery ? 245 : 670, battery ? 160 : 450,
        .045, battery ? .030 : .013);
      break;
    case 'spare':
      scrape(context, at, .093, 720, 1540, .057, .014);
      scrape(context, at + .036, .076, 1250, 2350, .036);
      break;
    case 'insert':
      scrape(context, at, battery ? .12 : .085, battery ? 590 : 1400,
        battery ? 1280 : 3260, battery ? .068 : .052);
      break;
    case 'seated':
      if (battery) resonance(context, at, 305, 150, .077, .078);
      click(context, at + (battery ? .012 : 0), battery ? 1150 : 2070, .080);
      break;
    case 'latched':
      click(context, at, battery ? 630 : 1040, .077);
      click(context, at + .016, battery ? 1340 : 1900, .047);
      break;
    case 'ready':
      if (battery) resonance(context, at, 1020, 1040, .085, .012);
      break;
  }
}
