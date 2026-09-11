// Pure collision queries shared by movement, camera, and tests.
export function createCollisionWorld(solids, isWater, bounds) {
  const radius = 0.42;
  function overlaps(x, z, b, r = radius) {
    return x + r > b.x - b.w / 2 && x - r < b.x + b.w / 2 &&
      z + r > b.z - b.d / 2 && z - r < b.z + b.d / 2;
  }
  function surface(x, z, ceiling = Infinity) {
    let height = isWater(x, z) ? -0.27 : 0;
    for (const b of solids) {
      if (b.top <= ceiling + 0.001 && overlaps(x, z, b, radius * 0.65)) height = Math.max(height, b.top);
    }
    return height;
  }
  function move(position, dx, dz, y) {
    let { x, z } = position;
    // Substeps keep rolls and low frame rates from tunnelling through thin walls.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
    const blocked = (nx, nz) => solids.some(b => y < b.top - 0.04 && y + 1.35 > (b.bottom ?? 0) && overlaps(nx, nz, b));
    for (let i = 0; i < steps; i++) {
      const nx = Math.max(-bounds, Math.min(bounds, x + dx / steps));
      if (!blocked(nx, z)) x = nx;
      const nz = Math.max(-bounds, Math.min(bounds, z + dz / steps));
      if (!blocked(x, nz)) z = nz;
    }
    return { x, z };
  }
  function vertical(x, z, from, to) {
    if (to <= from) {
      const floor = surface(x, z, from + 0.06);
      return { y: Math.max(to, floor), landed: to <= floor };
    }
    let y = to;
    for (const b of solids) {
      const bottom = b.bottom ?? 0;
      if (overlaps(x, z, b) && from + 1.35 <= bottom && to + 1.35 >= bottom) y = Math.min(y, bottom - 1.35);
    }
    return { y, landed: false };
  }
  return { move, surface, vertical, solids };
}
