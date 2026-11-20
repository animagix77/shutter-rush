// Judge Dean LLC
const paper = '#f4eddf';
const ink = '#324d41';
const foil = '#a59064';

function oliveSprig(ctx, cx, cy, direction) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(direction, 1);
  ctx.strokeStyle = foil;
  ctx.fillStyle = foil;
  ctx.lineWidth = 1.65;
  ctx.beginPath();
  ctx.moveTo(-32, 10);
  ctx.bezierCurveTo(-15, 8, 6, -1, 31, -12);
  ctx.stroke();
  for (const [x, y, angle] of [[-19, 7, -1.03], [-9, 4, .19], [1, 0, -1.12], [10, -3, .12], [18, -6, -.95]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(8, -6, 18, 0);
    ctx.quadraticCurveTo(8, 4, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function venueLine(ctx, center, y, left, right) {
  const words = 'VILLA LUCE  ·  TUSCANY';
  const spacing = 3;
  ctx.font = '17px Barlow, Arial, sans-serif';
  const advances = Array.from(words, char => ctx.measureText(char).width + spacing);
  const width = advances.reduce((total, advance) => total + advance, -spacing);
  const start = center - width / 2;
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  let x = start;
  for (let i = 0; i < words.length; i++) {
    ctx.fillText(words[i], x, y);
    x += advances[i];
  }
  ctx.strokeStyle = foil;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y - 6);
  ctx.lineTo(start - 22, y - 6);
  ctx.moveTo(start + width + 22, y - 6);
  ctx.lineTo(right, y - 6);
  ctx.stroke();
}

export function makeWeddingCover(photoImage) {
  const imageWidth = photoImage.naturalWidth || photoImage.width;
  const imageHeight = photoImage.naturalHeight || photoImage.height;
  if (!(imageWidth > 0 && imageHeight > 0)) throw new TypeError('A decoded photograph is required.');
  const portrait = imageHeight > imageWidth;
  const cover = document.createElement('canvas');
  cover.width = portrait ? 900 : 1200;
  const binding = 37;
  const margin = portrait ? 77 : 84;
  const left = binding + margin;
  const photoWidth = cover.width - binding - 2 * margin;
  const photoHeight = Math.round(photoWidth * imageHeight / imageWidth);
  const photoTop = 121;
  cover.height = photoTop + photoHeight + 202;
  const ctx = cover.getContext('2d', {alpha: false});
  const center = (cover.width + binding) / 2;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, cover.width, cover.height);

  // Linen cloth binding and two shallow impressions along the hinge.
  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, binding, cover.height);
  ctx.fillStyle = '#ffffff10';
  for (let y = 0; y < cover.height; y += 4) ctx.fillRect(0, y, binding, 1);
  ctx.fillStyle = '#152c2375';
  ctx.fillRect(binding - 3, 0, 3, cover.height);
  ctx.fillStyle = '#cabea8';
  ctx.fillRect(binding + 5, 0, 1, cover.height);
  ctx.fillStyle = '#fff9ed';
  ctx.fillRect(binding + 7, 0, 1, cover.height);

  venueLine(ctx, center, 66, left - 8, left + photoWidth + 8);
  // A fine frame sits outside the print so every edge of the exposure survives.
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = foil;
  ctx.strokeRect(left - 9, photoTop - 9, photoWidth + 18, photoHeight + 18);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(photoImage, left, photoTop, photoWidth, photoHeight);

  const bottom = photoTop + photoHeight;
  ctx.fillStyle = ink;
  ctx.font = 'italic 81px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('Our Wedding', center, bottom + 102);
  oliveSprig(ctx, center - 34, bottom + 145, 1);
  oliveSprig(ctx, center + 34, bottom + 145, -1);
  return cover;
}
