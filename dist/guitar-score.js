// Chapel Steps, an original 6/8 electric guitar instrumental by Judge Dean LLC.
const eighth = .4;
export const guitarLoop = 48 * eighth;

// Onset and length in eighth notes, MIDI pitch, attack slide and sustained bend
// in semitones. These are also the articulation marks for the on-screen hands.
export const soloNotes = [
  [.18,1.40,71,-.16,0], [1.93,2.30,76,-2.0,0], [4.55,.62,74,0,0], [5.22,.60,71,0,0],
  [6.12,2.55,69,-.24,2], [9.00,.80,69,0,0], [9.94,.78,66,-.5,0], [10.90,1.25,69,0,0],
  [12.42,2.18,67,-1,0], [14.94,.58,71,0,0], [15.56,1.88,74,-1.95,0],
  [18.06,1.52,73,-.12,0], [19.78,.58,69,0,0], [20.47,1.22,71,-1,0], [22.03,1.40,76,-.35,0],
  [24.06,1.16,74,0,0], [25.45,.52,76,0,0], [26.04,.65,79,-.44,0], [26.87,3.77,79,-.18,2],
  [30.80,.95,76,0,0], [32.00,.48,74,0,0], [32.53,.50,71,0,0], [33.15,2.21,72,-1,0],
  [36.14,1.15,69,-1.2,0], [37.58,.48,67,0,0], [38.20,1.40,71,-.12,1], [39.93,1.60,69,0,0],
  [42.04,.88,66,0,0], [43.02,.61,69,-1,0], [43.77,3.00,71,-.45,0]
];

export function guitarGesture(secondsSinceSolo) {
  const beat = ((secondsSinceSolo % guitarLoop + guitarLoop) % guitarLoop) / eighth;
  let note = soloNotes[soloNotes.length - 1], age = beat + 48 - note[0];
  for (const next of soloNotes) {
    if (next[0] > beat) break;
    note = next;
    age = beat - note[0];
  }
  const bend = note[4] * Math.min(1, age / .83) * Math.min(1, Math.max(0, note[1] - age) / .40);
  const slide = note[3] * Math.max(0, 1 - age / .39);
  return {
    fret: Math.min(.94, Math.max(.08, .21 + (note[2] + slide - 66) * .047)),
    pick: Math.max(0, 1 - age / .45) ** 2,
    bend: bend / 2
  };
}
