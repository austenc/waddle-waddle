// Clip a camera segment against expanded world boxes, including its final smoothed position.
export function clipCamera(look, desired, solids, padding = 0.3) {
  let nearest = 1;
  for (const b of solids) {
    let entry = 0, exit = 1;
    const mins = [b.x - b.w / 2 - padding, (b.bottom ?? 0) - padding, b.z - b.d / 2 - padding];
    const maxs = [b.x + b.w / 2 + padding, b.top + padding, b.z + b.d / 2 + padding];
    const start = [look.x, look.y, look.z], end = [desired.x, desired.y, desired.z];
    for (let axis = 0; axis < 3; axis++) {
      const delta = end[axis] - start[axis];
      if (Math.abs(delta) < 1e-8) { if (start[axis] < mins[axis] || start[axis] > maxs[axis]) { entry = 2; break; } }
      else {
        const a = (mins[axis] - start[axis]) / delta, c = (maxs[axis] - start[axis]) / delta;
        entry = Math.max(entry, Math.min(a, c)); exit = Math.min(exit, Math.max(a, c));
      }
    }
    if (entry <= exit && exit >= 0 && entry <= nearest) nearest = Math.max(0, entry - 0.015);
  }
  return { x: look.x + (desired.x - look.x) * nearest, y: look.y + (desired.y - look.y) * nearest, z: look.z + (desired.z - look.z) * nearest };
}

export function swimmingBoom(player, desired, solids) {
  const next = { ...desired };
  for (const b of solids) {
    if (player.x > b.x-b.w/2-.5 && player.x < b.x+b.w/2+.5 && player.z > b.z-b.d/2-.5 && player.z < b.z+b.d/2+.5 && b.bottom > player.y+1.2 && b.bottom < player.y+5) {
      next.y = Math.min(next.y, b.bottom-.34);
    }
  }
  return next;
}

// Interpolate physical poses so 90/120/144 Hz displays do not repeat 60 Hz steps.
// Large discontinuities are respawns and must not sweep through the city.
export function interpolatePose(previous, current, alpha) {
  if (Math.hypot(current.x-previous.x,current.y-previous.y,current.z-previous.z)>5) return {...current};
  const t=Math.max(0,Math.min(1,alpha));
  const result={...current};
  for(const key of ['x','y','z']) result[key]=previous[key]+(current[key]-previous[key])*t;
  result.yaw=previous.yaw+Math.atan2(Math.sin(current.yaw-previous.yaw),Math.cos(current.yaw-previous.yaw))*t;
  return result;
}
