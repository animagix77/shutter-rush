// Judge Dean LLC
// Fractions of a complete handling cycle, shared by the camera rig and supply state.
export const serviceMarks = Object.freeze({
  open: .16, release: .30, out: .38, stowed: .48, spare: .58,
  insert: .72, seated: .79, latched: .88, ready: .98
});
export const serviceEvents = Object.entries(serviceMarks);
export const serviceDuration = {card: 2.45, battery: 3.05};
