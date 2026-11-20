// Judge Dean LLC
async function photoImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function centeredPhoto(context, image, x, y, width, height) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const photoWidth = image.naturalWidth * scale;
  const photoHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - photoWidth) / 2, y + (height - photoHeight) / 2, photoWidth, photoHeight);
}

export async function saveDayPrint(events, keepers, score, clockText) {
  const photos = new Map(await Promise.all(Array.from(keepers, async ([id, item]) => [id, await photoImage(item.url)])));
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  const width = 1584, margin = 64, gutter = 29, columns = Math.min(3,events.length);
  const cardWidth = (width - margin * 2 - gutter * (columns - 1)) / columns;
  const photoHeight = Math.round(cardWidth * 2 / 3);
  const top = 236, cardHeight = photoHeight + 110;
  const rows = Math.ceil(events.length / columns);
  canvas.width = width;
  canvas.height = top + rows * cardHeight + (rows - 1) * 24 + 76;
  const ctx = canvas.getContext('2d');
  function line(y) {
    ctx.fillStyle = '#919384';
    ctx.fillRect(margin, y, width - margin * 2, 1.5);
  }
  function type(value, x, y, font, color = '#28382d') {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
  ctx.fillStyle = '#f5f0e4';
  ctx.fillRect(0, 0, width, canvas.height);
  type('VILLA LUCE   /   PHOTOGRAPHY DEPARTMENT', margin, 67, '20px Mono, monospace');
  ctx.textAlign = 'right';
  type('SHUTTER RUSH', width - margin, 67, '700 26px Cond, sans-serif');
  ctx.textAlign = 'left';
  type(events[0]?.dayStart!==undefined?'The storm wedding':'The wedding day', margin, 155, '700 82px Cond, sans-serif');
  ctx.textAlign = 'right';
  type(score.rank, width - margin, 130, '700 36px Cond, sans-serif');
  type(score.covered + ' / ' + score.total + ' MOMENTS FILED' + (score.bonus ? '  +  BONUS' : ''), width - margin, 161, '18px Mono, monospace');
  ctx.textAlign = 'left';
  line(199);

  events.forEach((event, index) => {
    const x = margin + (index % columns) * (cardWidth + gutter);
    const y = top + Math.floor(index / columns) * (cardHeight + 24);
    const photo = photos.get(event.id);
    ctx.fillStyle = photo ? '#232c24' : '#e3e1d4';
    ctx.fillRect(x, y, cardWidth, photoHeight);
    if (photo) {
      centeredPhoto(ctx, photo, x, y, cardWidth, photoHeight);
    } else {
      ctx.strokeStyle = '#a6a99a';
      ctx.setLineDash([9, 7]);
      ctx.strokeRect(x + 9, y + 9, cardWidth - 18, photoHeight - 18);
      ctx.setLineDash([]);
      ctx.textAlign = 'center';
      type(event.optional ? 'BONUS UNFILED' : 'MISSED MOMENT', x + cardWidth / 2, y + photoHeight / 2 + 7, '18px Mono, monospace', '#626f60');
      ctx.textAlign = 'left';
    }
    const caption = y + photoHeight;
    type((event.optional ? 'BONUS  /  ' : '') + clockText(event.dayPeak??event.peak), x, caption + 28, '17px Mono, monospace', '#566353');
    type(event.title, x, caption + 66, '700 37px Cond, sans-serif');
    const item = keepers.get(event.id);
    type(event.area + (item ? '  ·  ' + item.quality + '/100' : ''), x, caption + 95, '20px Barlow, sans-serif');
  });
  line(canvas.height - 66);
  type('THE TUSCAN WEDDING', margin, canvas.height - 30, '17px Mono, monospace');
  ctx.textAlign = 'right';
  type('Judge Dean LLC', width - margin, canvas.height - 30, '18px Barlow, sans-serif');

  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    value => value ? resolve(value) : reject(new Error('Unable to save album image')),
    'image/jpeg', .93
  ));
  const url = URL.createObjectURL(blob);
  const download = document.createElement('a');
  download.href = url;
  download.download = events.length===2?'Villa-Luce-Storm-Wedding.jpg':'Villa-Luce-Wedding-Day.jpg';
  document.body.append(download);
  download.click();
  download.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
