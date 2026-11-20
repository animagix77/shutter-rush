// Judge Dean LLC
import * as THREE from 'three';

export const lenses = {
  wide: { focal: 24, label: '24 mm · Wide angle' },
  tele: { focal: 85, label: '85 mm · Telephoto' }
};

// The body camera sees the whole room. The taking camera sees a 36 × 24 mm sensor.
// A small optical shift lets the hands settle after a turn while keeping the
// on-screen frame, rear LCD, scoring frustum, and JPEG on exactly the same rays.
export function composeFrame(eye, sensor, guide, reticle, width, height, kit, portrait, aim, lagX, lagY, focalLength=lenses[kit].focal) {
  const sensorWidth = portrait ? 24 : 36;
  const sensorHeight = portrait ? 36 : 24;
  const halfX = sensorWidth / (2 * focalLength);
  const halfY = sensorHeight / (2 * focalLength);
  const aspect = width / height;
  const fit = Math.max(halfY, halfX / aspect) / .92;
  const eyeY = THREE.MathUtils.lerp(Math.max(.65, fit * 1.12), fit, aim);
  const eyeX = eyeY * aspect;
  eye.fov = THREE.MathUtils.radToDeg(2 * Math.atan(eyeY));
  eye.updateProjectionMatrix();
  eye.updateMatrixWorld();
  const shiftX = lagX * (1 - aim);
  const shiftY = lagY * (1 - aim);
  sensor.position.copy(eye.position);
  sensor.quaternion.copy(eye.quaternion);
  sensor.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfY));
  sensor.setViewOffset(sensorWidth, sensorHeight,
    sensorWidth * shiftX / (2 * halfX), -sensorHeight * shiftY / (2 * halfY),
    sensorWidth, sensorHeight);
  sensor.updateMatrixWorld();
  const left = (1 + shiftX / eyeX) * width / 2;
  const top = (1 - shiftY / eyeY) * height / 2;
  guide.style.width = (width * halfX / eyeX) + 'px';
  guide.style.height = (height * halfY / eyeY) + 'px';
  guide.style.left = reticle.style.left = left + 'px';
  guide.style.top = reticle.style.top = top + 'px';
}
