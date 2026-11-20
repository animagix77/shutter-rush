// Judge Dean LLC
const hud = document.getElementById('cartHud');
const dash = document.getElementById('cartDash');
const speedometer = document.getElementById('cartSpeed');
const gear = document.getElementById('cartGear');
const interact = document.getElementById('cartInteract');
const action = interact.querySelector('span');
const pad = document.getElementById('pad');

function label(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

export function updateCartHud({active, driving, near, speed}) {
  hud.hidden = !active || (!driving && !near);
  dash.hidden = !driving;
  label(action, driving ? 'Jump out' : 'Drive cart');
  const padLabel = driving ? 'Drive and steer the golf cart' : 'Movement joystick';
  if (pad.getAttribute('aria-label') !== padLabel) pad.setAttribute('aria-label', padLabel);
  if (active && driving) {
    label(speedometer, String(Math.round(Math.abs(speed) * 3.6)));
    label(gear, speed < -.15 ? 'Reverse' : 'Drive');
  }
}
