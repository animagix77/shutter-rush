// Judge Dean LLC
import { DAY_DURATION } from './wedding-day.js';
import { saveDayPrint } from './day-print.js';

const hud = document.querySelector('#dayHud');
const get = id => document.getElementById(id);
const fields = Object.fromEntries(
  ['dayClock', 'dayCount', 'dayState', 'dayWindow', 'dayTitle', 'dayRoute', 'dayArea',
    'dayDirection', 'dayLead', 'dayFollowing'].map(id => [id, get(id)])
);

function write(field, text) {
  const target = fields[field];
  if (target.textContent !== text) target.textContent = text;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function clockText(t) {
  const minutes = (9 * 60 + Math.floor(Math.max(0, Math.min(DAY_DURATION, t)) * 900 / DAY_DURATION)) % 1440;
  const hours = Math.floor(minutes / 60);
  return (hours % 12 || 12) + ':' + String(minutes % 60).padStart(2, '0') + (hours < 12 ? ' AM' : ' PM');
}

function shortTime(seconds) {
  return Math.max(0, Math.ceil(seconds)) + 's';
}

function route(event, distance, bearing) {
  const metres = distance(event);
  const direction = bearing(event);
  return [direction, Number.isFinite(metres) ? Math.round(metres) + ' m' : ''].filter(Boolean).join(' · ');
}

function albumScore(events, keepers) {
  const required = events.filter(event => !event.optional);
  const covered = required.filter(event => keepers.has(event.id)).length;
  const bonus = events.some(event => event.optional && keepers.has(event.id));
  let rank = 'On the guest list';
  if (covered === required.length && bonus) rank = 'Wedding legend';
  else if (covered === required.length) rank = 'Booked solid';
  else if (covered >= Math.ceil(required.length * .7)) rank = 'Family favorite';
  else if (covered >= Math.ceil(required.length * .35)) rank = 'House photographer';
  else if (covered > 0) rank = 'Second shooter';
  return { covered, total: required.length, bonus, rank };
}

export function resetDayUi() {
  hud.hidden = true;
}

export function getDayDispatch(t,events,keepers) {
  const outstanding = events.filter(event => t <= event.end && !keepers.has(event.id));
  const live = outstanding.filter(event => t >= event.start);
  const target = live.find(event => !event.optional) || live[0] || outstanding[0] || null;
  const optional = outstanding.find(event => event !== target && event.optional && event.start - t <= 12) || null;
  const next = optional || outstanding.find(event => event !== target) || null;
  return { target, optional, next };
}

export function updateDayHud({ t, weddingTime=t, events, keepers, distance, bearing, cart, target:subject, optional:sideStory, next }) {
  hud.hidden = false;
  const { covered, total, bonus } = albumScore(events, keepers);
  write('dayClock', clockText(weddingTime));
  write('dayCount', covered + ' / ' + total + ' filed' + (bonus ? ' +★' : ''));
  if (!subject) {
    hud.dataset.phase = 'done';
    write('dayState', 'Off the clock');
    write('dayWindow', '');
    write('dayTitle', 'That’s a wrap');
    write('dayLead', covered === total ? 'Every required moment is in the album.' : 'The last deadline has passed. Your album is ready.');
    fields.dayRoute.hidden = fields.dayFollowing.hidden = true;
    return;
  }
  const isLive = t >= subject.start;
  const secondsToPeak = Math.ceil(subject.peak - t);
  const peak = isLive && Math.abs(subject.peak - t) <= 2;
  hud.dataset.phase = isLive ? 'live' : 'travel';
  write('dayState', subject.optional ? (isLive ? 'Bonus live' : 'Bonus ahead') : (isLive ? 'On now' : 'Get there'));
  write('dayWindow', isLive
    ? (peak ? 'Peak now · ' : secondsToPeak > 2 ? 'Peak in ' + shortTime(secondsToPeak) + ' · ' : '') + shortTime(subject.end - t) + ' left'
    : 'Opens in ' + shortTime(subject.start - t));
  write('dayTitle', subject.title);
  fields.dayRoute.hidden = false;
  write('dayArea', subject.area);
  write('dayDirection', route(subject, distance, bearing));
  const parkedAtStop=cart?.driving&&cart.parkAt&&Math.hypot(cart.x-cart.parkAt.x,cart.z-cart.parkAt.z)<3;
  write('dayLead', parkedAtStop?'Jump out and frame the shot. '+subject.lead:subject.lead);

  // Give a simultaneous, optional assignment its own routing cue while the main deadline stays visible.
  fields.dayFollowing.hidden = !next;
  if (next) {
    fields.dayFollowing.classList.toggle('sideStory', Boolean(sideStory));
    const timing = t >= next.start ? shortTime(next.end - t) + ' left' : 'in ' + shortTime(next.start - t);
    const direction = sideStory ? ' · ' + route(next, distance, bearing) : '';
    write('dayFollowing', (next.optional ? '★ Bonus' : 'Next') + ' · ' + next.title + ' · ' + next.area + ' · ' + timing + direction);
  }
}

export function renderDayItinerary({ events, keepers, t }) {
  const details = el('details', 'dayItinerary');
  details.append(el('summary', '', 'Wedding schedule'));
  const rows = el('ol', '');
  for (const event of events) {
    const row = el('li', '');
    const label = event.optional ? '★ ' + event.title : event.title;
    const state = keepers.has(event.id) ? 'Filed' : t > event.end ? 'Missed' : t >= event.start ? 'On now' : clockText(event.dayStart??event.start);
    row.append(el('span', '', label + ' · ' + event.area), el('strong', '', state));
    rows.append(row);
  }
  details.append(rows);
  return details;
}

export function renderDayAlbum({ events, keepers, onPhoto }) {
  const root = el('section', 'dayAlbum');
  root.id = 'dayAlbum';
  root.setAttribute('aria-label', 'Wedding day album');
  const score = albumScore(events, keepers);
  const rank = el('div', 'dayRank');
  const rankText = el('div', '');
  rankText.append(el('small', '', 'YOUR REPUTATION'), el('strong', '', score.rank));
  const progress = el('div', 'dayAlbumScore');
  progress.append(el('strong', '', score.covered + ' / ' + score.total), el('small', '', 'MOMENTS FILED'));
  rank.append(rankText, progress);
  root.append(rank);
  if (score.bonus) root.append(el('p', 'dayBonusEarned', '★ The bonus photo made the album.'));
  const gallery = el('ol', events.length===2?'daySpreads twoCalls':'daySpreads');
  for (const event of events) {
    const item = keepers.get(event.id);
    const card = el('li', 'daySpread');
    if (event.optional) card.classList.add('dayBonus');
    if (!item) card.classList.add('dayMissed');
    const mat = el(item ? 'button' : 'div', 'dayMat');
    if (item) {
      mat.type = 'button';
      mat.setAttribute('aria-label', 'View ' + event.title + ', quality ' + item.quality + ' out of 100');
      const img = el('img', '');
      img.alt = event.title;
      img.src = item.url;
      mat.append(img);
      mat.addEventListener('click', () => onPhoto(item));
    } else {
      mat.append(el('span', 'missingFrame', event.optional ? 'Bonus unfiled' : 'Missed moment'));
    }
    const caption = el('div', 'dayCaption');
    caption.append(el('small', '', (event.optional ? '★ BONUS · ' : '') + clockText(event.dayPeak??event.peak)), el('h3', '', event.title));
    caption.append(el('span', '', item ? item.quality + '/100 · ' + Math.round(item.focal) + ' mm' : event.area));
    card.append(mat, caption);
    gallery.append(card);
  }
  root.append(gallery);
  const save = el('button', 'primary dayPrintButton', events.length===2?'Save photo pair':'Save wedding album');
  save.type = 'button';
  save.disabled = !keepers.size;
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      await saveDayPrint(events, keepers, score, clockText);
    } catch {
      save.textContent = 'Try saving the album again';
    } finally {
      save.disabled = false;
    }
  });
  root.append(save);
  return root;
}
