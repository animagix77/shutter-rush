// Judge Dean LLC

// Walking routes use the same walls, furniture and water as the photographer.
// Sample at half a metre so even a thin wall between two route nodes is marked.
export function buildEstateNavigation(venue) {
  const { minX, minZ, maxX, maxZ } = venue.bounds;
  const cols = Math.floor(maxX - minX) + 1, rows = Math.floor(maxZ - minZ) + 1;
  const fineCols = cols * 2 - 1, fineRows = rows * 2 - 1;
  const solid = new Uint8Array(fineCols * fineRows);
  const bucketSize=5, bucketCols=Math.ceil((maxX-minX)/bucketSize)+1;
  const buckets=new Map();
  function bucket(x,z){return Math.floor((z-minZ)/bucketSize)*bucketCols+Math.floor((x-minX)/bucketSize);}
  for (let j = 0; j < fineRows; j++) {
    for (let i = 0; i < fineCols; i++) {
      const x=minX+i/2, z=minZ+j/2;
      if (venue.blocks(x,z)||venue.blocks(x-.1,z-.1)||venue.blocks(x+.1,z+.1)||
          venue.blocks(x-.1,z+.1)||venue.blocks(x+.1,z-.1)) solid[j*fineCols+i]=1;
    }
  }
  for (const c of venue.colliders) {
    const r = c.r + .35;
    for(let j=Math.floor((c.z-r-minZ)/bucketSize);j<=Math.floor((c.z+r-minZ)/bucketSize);j++){
      for(let i=Math.floor((c.x-r-minX)/bucketSize);i<=Math.floor((c.x+r-minX)/bucketSize);i++){
        const key=j*bucketCols+i;
        if(!buckets.has(key))buckets.set(key,[]);
        buckets.get(key).push(c);
      }
    }
    const firstX = Math.max(0, Math.ceil((c.x - r - minX) * 2));
    const lastX = Math.min(fineCols - 1, Math.floor((c.x + r - minX) * 2));
    const firstZ = Math.max(0, Math.ceil((c.z - r - minZ) * 2));
    const lastZ = Math.min(fineRows - 1, Math.floor((c.z + r - minZ) * 2));
    for (let j = firstZ; j <= lastZ; j++) {
      for (let i = firstX; i <= lastX; i++) {
        if ((minX + i / 2 - c.x) ** 2 + (minZ + j / 2 - c.z) ** 2 < r * r) {
          solid[j * fineCols + i] = 1;
        }
      }
    }
  }
  const point = n => ({ x: minX + n % cols, z: minZ + Math.floor(n / cols) });
  const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const edges = new Uint8Array(cols * rows);
  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      const node = z * cols + x, center = 2 * z * fineCols + 2 * x;
      if (solid[center]) continue;
      for (let d = 0; d < directions.length; d++) {
        const [dx,dz] = directions[d], ex = x + dx, ez = z + dz;
        if (ex < 0 || ex >= cols || ez < 0 || ez >= rows) continue;
        const mid = dz * fineCols + dx;
        if (solid[center + mid] || solid[center + 2 * mid]) continue;
        if (dx && dz && (solid[center + dx] || solid[center + dz * fineCols] || solid[center + 2*mid - dx] || solid[center + 2*mid - dz*fineCols])) continue;
        edges[node] |= 1 << d;
      }
    }
  }
  function nearest(p) {
    const cx = Math.round(p.x - minX), cz = Math.round(p.z - minZ);
    let best = -1, range = Infinity;
    for (let radius = 0; radius <= 6; radius++) {
      for (let z = Math.max(0, cz - radius); z <= Math.min(rows - 1, cz + radius); z++) {
        for (let x = Math.max(0, cx - radius); x <= Math.min(cols - 1, cx + radius); x++) {
          const n = z * cols + x;
          if (!edges[n]) continue;
          const dist = (x + minX - p.x) ** 2 + (z + minZ - p.z) ** 2;
          if (dist < range) { range = dist; best = n; }
        }
      }
      if (best >= 0) break;
    }
    return best;
  }
  function clearLine(a,b) {
    const dx = b.x-a.x, dz = b.z-a.z, length = Math.hypot(dx,dz);
    const steps = Math.ceil(length / .14);
    for (let i = 1; i <= steps; i++) {
      const wx=a.x+dx*i/steps,wz=a.z+dz*i/steps;
      if (wx<minX || wx>maxX || wz<minZ || wz>maxZ || venue.blocks(wx,wz) ||
          venue.blocks(wx-.06,wz-.06) || venue.blocks(wx+.06,wz+.06) ||
          venue.blocks(wx-.06,wz+.06) || venue.blocks(wx+.06,wz-.06))return false;
      const nearby=buckets.get(bucket(wx,wz));
      if(nearby?.some(c=>(wx-c.x)**2+(wz-c.z)**2<(c.r+.26)**2))return false;
      const x=Math.round(2*(wx-minX)),z=Math.round(2*(wz-minZ));
      if(solid[z*fineCols+x])return false;
    }
    return true;
  }

  // Cache the next step towards a destination for every reachable starting
  // position. Walking a few metres then costs a lookup, not another search.
  const fields = new Map();
  function fieldFor(goal) {
    if (fields.has(goal)) return fields.get(goal);
    const next = new Int32Array(edges.length).fill(-1);
    const distance = new Float32Array(edges.length).fill(Infinity);
    const heap = [];
    function push(n,cost) {
      const item = {n,cost};
      let i = heap.length;
      heap.push(item);
      while (i > 0) {
        const parent = (i-1) >> 1;
        if (heap[parent].cost <= cost) break;
        heap[i] = heap[parent]; i = parent;
      }
      heap[i] = item;
    }
    function pop() {
      const first = heap[0], last = heap.pop();
      if (!heap.length) return first;
      let i = 0;
      while (2*i+1 < heap.length) {
        let child = 2*i+1;
        if (child+1 < heap.length && heap[child+1].cost < heap[child].cost) child++;
        if (heap[child].cost >= last.cost) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
      return first;
    }
    next[goal] = goal; distance[goal] = 0; push(goal,0);
    while (heap.length) {
      const {n,cost} = pop();
      if (cost !== distance[n]) continue;
      for (let d = 0; d < directions.length; d++) {
        if (!(edges[n] & (1<<d))) continue;
        const [dx,dz] = directions[d], to = n + dz*cols + dx;
        const proposed = cost + (dx && dz ? 14 : 10);
        if (proposed >= distance[to]) continue;
        distance[to] = proposed; next[to] = n; push(to,proposed);
      }
    }
    if (fields.size >= 4) fields.delete(fields.keys().next().value);
    fields.set(goal,next);
    return next;
  }
  let lastStart = -1, lastGoal = -1, cached = [];
  function route(start, destination) {
    if (!destination) return [];
    const first = {x:start.x,z:start.z}, end = {x:destination.x,z:destination.z};
    if (clearLine(first,end)) return [first,end];
    const source = nearest(first), goal = nearest(end);
    if (source < 0 || goal < 0) return [];
    if (source !== lastStart || goal !== lastGoal) {
      lastStart = source; lastGoal = goal; cached = [];
      const next = fieldFor(goal);
      if (next[source] < 0) return [];
      const line = [point(source)];
      for (let n = source; n !== goal;) {
        n = next[n]; line.push(point(n));
      }
      let anchor = 0;
      for (let i = 2; i < line.length; i++) {
        if (!clearLine(line[anchor],line[i])) { cached.push(line[i-1]); anchor=i-1; }
      }
      cached.push(line[line.length-1]);
    }
    if (!cached.length) return [];
    const result = clearLine(first,cached[0]) ? [first,...cached] : [first,point(source),...cached];
    const last = result[result.length-1];
    if ((end.x !== last.x || end.z !== last.z) && clearLine(last,end)) result.push(end);
    return result;
  }
  return {route};
}
