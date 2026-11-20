// Judge Dean LLC
import { ESTATE_MAP } from './estate-layout.js';

const bounds = ESTATE_MAP.bounds;
const width = bounds.maxX - bounds.minX;
const depth = bounds.maxZ - bounds.minZ;
const mapButton = document.getElementById('mapBtn');
const cartCaption = mapButton.querySelector('.cartMapCaption');
const locationLetters = new Map(ESTATE_MAP.areas.map((area, index) => [area.name, String.fromCharCode(65 + index)]));
let base, inset;

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function line(ctx, points, color, weight) {
  if (points.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].z);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.z);
  ctx.stroke();
}

// Draw the survey once at a fixed world scale. The inset and unfolded plan
// then sample the same buildings, roads and water without redrawing them on every turn.
function survey() {
  if (base) return base;
  const tile = document.createElement('canvas');
  const scale = 7;
  tile.width = Math.ceil(width * scale);
  tile.height = Math.ceil(depth * scale);
  const c = tile.getContext('2d');
  c.scale(scale, scale);
  c.translate(-bounds.minX, -bounds.minZ);
  c.fillStyle = '#344238';
  c.fillRect(bounds.minX, bounds.minZ, width, depth);
  for (let x = Math.ceil(bounds.minX / 10) * 10; x < bounds.maxX; x += 10) {
    line(c, [{x, z:bounds.minZ}, {x, z:bounds.maxZ}], '#3c4b3f', .18);
  }
  for (let z = Math.ceil(bounds.minZ / 10) * 10; z < bounds.maxZ; z += 10) {
    line(c, [{x:bounds.minX, z}, {x:bounds.maxX, z}], '#3c4b3f', .18);
  }
  for (const lake of ESTATE_MAP.water) {
    const left = lake.x - lake.w / 2, top = lake.z - lake.d / 2;
    c.fillStyle = '#365c63'; c.fillRect(left, top, lake.w, lake.d);
    c.strokeStyle = '#729193'; c.lineWidth = .42; c.strokeRect(left, top, lake.w, lake.d);
    for (let z = top + 1.4; z < top + lake.d - .5; z += 2.8) {
      line(c, [{x:left + .6, z}, {x:left + lake.w - .6, z}], '#496d71', .17);
    }
  }
  c.lineJoin = 'round'; c.lineCap = 'round';
  for (const road of ESTATE_MAP.paths) {
    line(c, road, '#28372f', 4.25);
    line(c, road, '#78816b', 3.05);
    line(c, road, '#959980', .27);
  }
  for (const area of ESTATE_MAP.areas) {
    const {kind, x, z, w, d} = area, left = x - w / 2, top = z - d / 2;
    c.save();
    c.beginPath(); c.rect(left, top, w, d); c.clip();
    if (kind === 'building' || kind === 'glasshouse' || kind === 'pavilion') {
      c.fillStyle = kind === 'glasshouse' ? '#7b9887' : '#9b9983';
      c.fillRect(left, top, w, d);
      line(c, [{x:left,z:top},{x:left+w*.22,z},{x:left+w*.78,z},{x:left+w,z:top}], '#676e5e', .5);
      line(c, [{x:left,z:top+d},{x:left+w*.22,z}], '#676e5e', .5);
      line(c, [{x:left+w,z:top+d},{x:left+w*.78,z}], '#676e5e', .5);
      if (kind === 'glasshouse') for (let pos=left+2;pos<left+w;pos+=3) line(c,[{x:pos,z:top},{x:pos,z:top+d}],'#5c786d',.45);
    } else if (kind === 'pier' || kind === 'terrace' || kind === 'court') {
      c.fillStyle = kind === 'pier' ? '#a09172' : '#81846f';
      c.fillRect(left, top, w, d);
      for (let pos=left+1.2;pos<left+w;pos+=2.2) line(c,[{x:pos,z:top},{x:pos,z:top+d}], '#696e5d', .29);
    } else if (kind === 'vineyard' || kind === 'grove') {
      c.fillStyle = '#52634a'; c.fillRect(left,top,w,d);
      for (let pos=left-d;pos<left+w;pos+=3) line(c,[{x:pos,z:top},{x:pos+d,z:top+d}], '#71825e', 1.05);
    } else {
      c.fillStyle = '#627454'; c.globalAlpha = .73; c.fillRect(left,top,w,d); c.globalAlpha = 1;
      for (let pos=top+1.7;pos<top+d;pos+=4.4) line(c,[{x:left,z:pos},{x:left+w,z:pos}], '#76845f', .35);
    }
    c.restore();
    c.strokeStyle = '#adba9d'; c.lineWidth = .35; c.strokeRect(left, top, w, d);
  }
  c.strokeStyle = '#84917a'; c.lineWidth = .4; c.strokeRect(bounds.minX+.15,bounds.minZ+.15,width-.3,depth-.3);
  base = tile;
  return tile;
}

function viewport(state, wide, w, h) {
  const {player, target, optional, path} = state;
  const ratio = w / h;
  if (wide) {
    const scale = Math.min((w - 22) / width, (h - 23) / depth);
    return {scale, cx:(bounds.minX + bounds.maxX) / 2, cz:(bounds.minZ + bounds.maxZ) / 2};
  }
  const points = [player, ...(path || []), target, optional].filter(Boolean);
  const xs = points.map(p => p.x), zs = points.map(p => p.z);
  const l = Math.min(...xs), r = Math.max(...xs), n = Math.min(...zs), s = Math.max(...zs);
  // Keep the route and both live events visible. For neighbouring assignments,
  // zoom to the district so portrait and phone users can still see their approach.
  const span = Math.max(55, r - l + 24, (s - n + 25) * ratio);
  return {scale:w / span, cx:(l+r)/2, cz:(n+s)/2-2};
}

function placement(node, x, y) {
  node.style.left = x + 'px';
  node.style.top = y + 'px';
}

function dropPin(event, type, atlas, inspect) {
  const pin = element(atlas ? 'button' : 'span', 'estatePin ' + type);
  if (atlas) {
    pin.type = 'button';
    pin.setAttribute('aria-label', event.area + ' · ' + event.title);
    pin.onclick = () => inspect(event.area);
  }
  pin.dataset.event = event.id;
  pin.innerHTML = '<svg viewBox="0 0 22 28" aria-hidden="true"><path d="M11 27S1 16.4 1 10.9a10 10 0 0 1 20 0C21 16.4 11 27 11 27Z"/></svg>';
  const letter = locationLetters.get(event.area) || '•';
  pin.append(element('span','pinLetter', atlas ? letter : type === 'pinOptional' ? '★' : ''));
  return pin;
}

function buildChart(surface, wide = false, inspect) {
  const canvas = element('canvas', 'estateCanvas');
  canvas.setAttribute('aria-hidden', 'true');
  const north = element('span','estateNorth','N');
  north.setAttribute('aria-hidden','true');
  const playerIcon = element('span','estatePlayer');
  playerIcon.setAttribute('aria-hidden','true');
  playerIcon.innerHTML = '<svg class="footArrow" viewBox="0 0 20 20"><path d="M10 1.5 17.7 17 10 13.4 2.3 17Z"/></svg><svg class="driveArrow" viewBox="0 0 24 28"><use href="#driveArrow"/></svg>';
  const cartIcon = element('span','estateCart');
  cartIcon.setAttribute('aria-label','Parked golf cart');
  cartIcon.innerHTML = '<svg aria-hidden="true" viewBox="0 0 28 22"><use href="#golfCart"/></svg>';
  const parking = element('span','estatePullOff','P');
  parking.setAttribute('aria-label','Cart parking for the next stop');
  cartIcon.hidden = parking.hidden = true;
  surface.append(canvas, north, cartIcon, parking, playerIcon);
  const markers = new Map();
  const stops = new Map();
  let selected;
  function select(name) {
    selected = name;
    for (const [area, pin] of stops) pin.classList.toggle('isSelected', name===area);
  }
  function draw(state) {
    const w = surface.clientWidth, h = surface.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const iw = Math.round(w * dpr), ih = Math.round(h * dpr);
    if (canvas.width !== iw || canvas.height !== ih) {canvas.width = iw; canvas.height = ih;}
    const {scale, cx, cz} = viewport(state,wide,w,h);
    const px = x => (x - cx) * scale + w / 2;
    const py = z => (z - cz) * scale + h / 2;
    const c = canvas.getContext('2d');
    c.setTransform(dpr,0,0,dpr,0,0);
    c.fillStyle = '#28362e'; c.fillRect(0,0,w,h);
    c.drawImage(survey(),px(bounds.minX),py(bounds.minZ),width * scale,depth * scale);
    if (state.target && state.path?.length >= 2) {
      const route = state.path.map(p => ({x:px(p.x), z:py(p.z)}));
      c.lineCap = 'round'; c.lineJoin = 'round';
      line(c, route, '#203029', wide ? 4 : 3.2);
      c.setLineDash(wide ? [5,3] : [3,2]);
      line(c, route, '#fff2ae', wide ? 2.3 : 1.7);
      c.setLineDash([]);
    }
    if (wide) {
      for (const area of ESTATE_MAP.areas) {
        if (!state.events.some(e => e.area === area.name)) continue;
        let pin = stops.get(area.name);
        if (!pin) {
          pin = element('button','estateStation',locationLetters.get(area.name));
          pin.type = 'button'; pin.title = area.name;
          pin.setAttribute('aria-label', 'Show assignments at ' + area.name);
          pin.onclick = () => inspect(area.name);
          surface.append(pin); stops.set(area.name, pin);
        }
        pin.hidden = area.name === state.target?.area || area.name === state.optional?.area;
        placement(pin,px(area.x),py(area.z));
      }
      select(selected);
    }
    for (const [type,event] of [['pinActive',state.target],['pinOptional',state.optional]]) {
      let pin = markers.get(type);
      if (pin && pin.dataset.event !== event?.id) {pin.remove();markers.delete(type);pin=null;}
      if (!event || (type === 'pinOptional' && event.id === state.target?.id)) continue;
      if (!pin) {pin=dropPin(event,type,wide,inspect); surface.append(pin); markers.set(type,pin);}
      placement(pin,px(event.x),py(event.z));
    }
    const cart = state.cart;
    const driving = Boolean(cart?.driving);
    cartIcon.hidden = !cart || driving;
    if (!cartIcon.hidden) {
      // Point to an off-map cart at the nearest edge. The shooting route
      // keeps its original zoom even if the photographer left the cart behind.
      const dx = px(cart.x) - w/2, dy = py(cart.z) - h/2;
      const margin = wide ? 12 : 13;
      const fit = Math.min(1, (w/2-margin)/(Math.abs(dx)||1), (h/2-margin)/(Math.abs(dy)||1));
      cartIcon.classList.toggle('atEdge', fit<1);
      cartIcon.style.setProperty('--direction', Math.atan2(dy,dx)+'rad');
      placement(cartIcon, w/2 + dx*fit, h/2 + dy*fit);
    }
    parking.hidden = !driving || !cart.parkAt || !state.target ||
      Math.hypot(cart.parkAt.x-state.target.x,cart.parkAt.z-state.target.z)<3;
    if (!parking.hidden) placement(parking,px(cart.parkAt.x),py(cart.parkAt.z));
    playerIcon.classList.toggle('isDriving',driving);
    placement(playerIcon,px(driving?cart.x:state.player.x),py(driving?cart.z:state.player.z));
    playerIcon.style.setProperty('--heading', -(driving?cart.yaw:state.yaw) + 'rad');
  }
  function clear() {for (const node of markers.values()) node.remove(); markers.clear();}
  return {draw,select,clear};
}

export function updateEstateMap(state) {
  mapButton.hidden = false;
  inset ||= buildChart(mapButton.querySelector('.estateInsetSurface'));
  const title = state.target?.title;
  cartCaption.hidden = !state.cart || Boolean(state.cart.driving);
  if (!cartCaption.hidden) {
    const metres = Math.round(Math.hypot(state.player.x-state.cart.x,state.player.z-state.cart.z));
    const distance = 'Cart · '+metres+' m';
    const value = cartCaption.querySelector('span');
    if (value.textContent !== distance) value.textContent = distance;
  }
  const destination = title ? ' · Next stop, ' + title + ' at ' + state.target.area : '';
  const cartStatus = !state.cart ? '' : state.cart.driving ? ' · Driving' : ' · Parked '+cartCaption.querySelector('span').textContent.toLowerCase();
  const name = 'Open estate map' + destination + cartStatus;
  if (mapButton.getAttribute('aria-label') !== name) mapButton.setAttribute('aria-label',name);
  inset.draw(state);
}

export function hideEstateMap() {
  mapButton.hidden = true;
  inset?.clear();
}

function countdown(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(total / 60), s = total % 60;
  return m ? m + 'm ' + s + 's' : s + 's';
}

function jobState(event, {target, t, keepers}) {
  if (keepers.has(event.id)) return 'Filed';
  if (t > event.end) return event.optional ? 'Bonus closed' : 'Missed';
  const label = event.optional ? 'Bonus' : event.id === target?.id ? 'Next' : '';
  if (t >= event.start) return (event.optional ? 'Bonus' : 'On now') + ' · ' + countdown(event.end - t) + ' left';
  return (label ? label + ' · ' : '') + 'in ' + countdown(event.start - t);
}

export function renderEstateAtlas(state) {
  const root = element('section','estateAtlas');
  const mapColumn = element('div','atlasMapColumn');
  const surface = element('div','estateAtlasSurface');
  surface.setAttribute('role','group'); surface.setAttribute('aria-label','Villa Luce estate plan, north up');
  const key = element('div','estateKey');
  const symbols = [[state.cart?.driving?'driver':'you',state.cart?.driving?'You · driving':'You'], ['next','Next stop'], ['bonus','Bonus'], ['route','Route']];
  if (state.cart && !state.cart.driving) symbols.push(['cart','Parked cart']);
  if (state.cart?.driving && state.cart.parkAt && state.target && Math.hypot(state.target.x-state.cart.parkAt.x,state.target.z-state.cart.parkAt.z)>=3) symbols.push(['park','Park here']);
  for (const [icon,label] of symbols) {
    const entry=element('span',''), swatch=element('i','atlasSwatch '+icon);
    if (icon==='cart') swatch.innerHTML='<svg aria-hidden="true" viewBox="0 0 28 22"><use href="#golfCart"/></svg>';
    if (icon==='driver') swatch.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 28"><use href="#driveArrow"/></svg>';
    if (icon==='park') swatch.textContent='P';
    entry.append(swatch,document.createTextNode(label)); key.append(entry);
  }
  mapColumn.append(surface,key);
  const listColumn = element('div','atlasListColumn');
  const bar = element('div','atlasFilter');
  const heading = element('h3','', 'All stops');
  const reset = element('button','atlasReset','Show all');
  reset.type='button'; reset.hidden=true;
  bar.append(heading,reset);
  const list=element('ol','atlasLedger');
  list.setAttribute('aria-label','Wedding itinerary');
  const index = new Map(state.events.map((event,i)=>[event.id,i+1]));
  function show(name) {
    chart.select(name);
    reset.hidden = !name;
    heading.textContent = name || 'Wedding itinerary';
    list.replaceChildren();
    for (const event of state.events) {
      if (name && event.area !== name) continue;
      const row = element('li','atlasJob');
      if (event.id === state.target?.id) row.classList.add('current');
      const station = element('span','atlasLetter',locationLetters.get(event.area) || '•');
      const copy=element('span','atlasJobCopy');
      const status=jobState(event,state);
      copy.append(element('strong','',event.title),element('small','',event.area+' · '+status));
      row.append(station,copy,element('span','atlasOrdinal',String(index.get(event.id)).padStart(2,'0')));
      list.append(row);
    }
    list.scrollTop=0;
    queueMicrotask(()=>{
      const active=list.querySelector('.current');
      if (active && list.clientHeight) {
        list.scrollTop+=Math.max(0,active.getBoundingClientRect().top-list.getBoundingClientRect().top-list.clientHeight*.3);
      }
    });
  }
  const chart=buildChart(surface,true,show);
  reset.onclick=()=>show(null);
  listColumn.append(bar,list); root.append(mapColumn,listColumn);
  show(null);
  // Panels are assembled offscreen before the dialog is shown. Observe the
  // actual chart for its first draw and for portrait/landscape resizing.
  let observer;
  const redraw=()=>{
    if (!root.isConnected) {observer?.disconnect(); return;}
    chart.draw(state);
  };
  queueMicrotask(()=>{
    if (!root.isConnected) return;
    redraw();
    observer=new ResizeObserver(redraw); observer.observe(surface);
  });
  return root;
}
