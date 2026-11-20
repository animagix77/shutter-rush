// Judge Dean LLC
export const TAKE_SECONDS = 30;
export const TOSS_RELEASE = 21;
export const TOSS_CATCH = 23.5;

export function tossCue(t) {
  if (t < 16) return 'Find your angle';
  if (t < 18) return 'The bride is getting ready';
  if (t < TOSS_RELEASE) return 'Toss in ' + Math.ceil(TOSS_RELEASE - t);
  if (t < TOSS_CATCH) return 'Bouquet in the air';
  if (t < 25) return 'Grandma caught it!';
  return 'Capture the celebration';
}
