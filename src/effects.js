import * as THREE from 'three';

/** World-space feedback. dt is seconds; colors accept THREE.Color or color values.
 * Fixed pools recycle their oldest slots under load. No textures or DOM needed.
 */
export function createEffects(scene) {
  const PARTICLES = 256, RINGS = 24;
  const root = new THREE.Group();
  root.name = 'duck-feedback';
  const transform = new THREE.Object3D(), tint = new THREE.Color();
  const warmWhite = new THREE.Color(0xfff6d8);
  let disposed = false, particleCursor = 0, ringCursor = 0;

  function batch(geometry, capacity) {
    const alpha = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    alpha.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('instanceAlpha', alpha);
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `
        attribute float instanceAlpha;
        varying float vAlpha;
        varying vec3 vTint;
        void main() {
          vAlpha = instanceAlpha;
          vTint = instanceColor;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vTint;
        void main() {
          gl_FragColor = vec4(vTint, vAlpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Allocate colors once, before the first shader compilation.
    mesh.setColorAt(0, tint.set(0xffffff));
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    // Instances travel beyond the original geometry's bounds.
    mesh.frustumCulled = false;
    root.add(mesh);
    return { mesh, alpha, geometry, material };
  }

  const sparks = batch(new THREE.OctahedronGeometry(1, 0), PARTICLES);
  const ripples = batch(new THREE.RingGeometry(0.94, 1, 64), RINGS);
  const particles = Array.from({ length: PARTICLES }, () => ({
    position: new THREE.Vector3(), velocity: new THREE.Vector3(), color: new THREE.Color(),
    age: 1, life: 0, size: 0, spin: 0,
  }));
  const rings = Array.from({ length: RINGS }, () => ({
    position: new THREE.Vector3(), age: 1, life: 0, delay: 0,
  }));
  scene.add(root);

  const validPosition = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

  function burst(position, color = 0xffdc83, count = 18) {
    if (disposed || !validPosition(position)) return;
    const amount = Number.isFinite(count) ? Math.min(PARTICLES, Math.max(0, Math.floor(count))) : 18;
    tint.set(color);
    for (let i = 0; i < amount; i++) {
      const p = particles[particleCursor++ % PARTICLES];
      const angle = Math.random() * Math.PI * 2, radius = 0.5 + Math.random() * 1.5;
      p.position.copy(position); p.position.y += 0.12;
      p.velocity.set(Math.cos(angle) * radius, 1.3 + Math.random() * 2, Math.sin(angle) * radius);
      p.color.copy(tint).lerp(warmWhite, Math.random() * 0.25);
      p.age = 0; p.life = 0.55 + Math.random() * 0.45;
      p.size = 0.035 + Math.random() * 0.045;
      p.spin = (Math.random() - 0.5) * 10;
    }
    render();
  }

  function honk(position) {
    if (disposed || !validPosition(position)) return;
    for (let i = 0; i < 3; i++) {
      const r = rings[ringCursor++ % RINGS];
      r.position.copy(position); r.position.y += 0.16 + i * 0.025;
      r.age = 0; r.life = 0.85; r.delay = i * 0.12;
    }
    render();
  }

  function render() {
    let n = 0;
    for (const p of particles) {
      if (p.age >= p.life) continue;
      const t = p.age / p.life;
      transform.position.copy(p.position);
      transform.rotation.set(p.age * p.spin, p.age * p.spin * 0.7, p.age * 2);
      transform.scale.setScalar(p.size * (1 - t * t));
      transform.updateMatrix();
      sparks.mesh.setMatrixAt(n, transform.matrix);
      sparks.mesh.setColorAt(n, p.color);
      sparks.alpha.setX(n++, 0.85 * (1 - t) ** 2);
    }
    sparks.mesh.count = n;
    n = 0;
    tint.set(0xdaf6cf);
    for (const r of rings) {
      const age = r.age - r.delay;
      if (age < 0 || age >= r.life) continue;
      const t = age / r.life;
      transform.position.copy(r.position);
      transform.rotation.set(-Math.PI / 2, 0, 0);
      transform.scale.setScalar(0.3 + 2.8 * (1 - (1 - t) ** 2));
      transform.updateMatrix();
      ripples.mesh.setMatrixAt(n, transform.matrix);
      ripples.mesh.setColorAt(n, tint);
      ripples.alpha.setX(n++, 0.42 * Math.min(1, age / 0.045) * (1 - t) ** 2);
    }
    ripples.mesh.count = n;
    for (const b of [sparks, ripples]) {
      b.mesh.instanceMatrix.needsUpdate = true;
      b.mesh.instanceColor.needsUpdate = true;
      b.alpha.needsUpdate = true;
    }
  }

  function update(dt) {
    if (disposed || !Number.isFinite(dt) || dt <= 0) return;
    // Lifetimes consume the full interval; movement uses a stable bounded step.
    const step = Math.min(dt, 0.1), drag = Math.exp(-2.1 * step);
    for (const p of particles) {
      if (p.age >= p.life) continue;
      p.age += dt;
      if (p.age >= p.life) continue;
      p.velocity.x *= drag; p.velocity.z *= drag;
      p.velocity.y -= 4.2 * step;
      p.position.addScaledVector(p.velocity, step);
    }
    for (const r of rings) if (r.age < r.life + r.delay) r.age += dt;
    render();
  }

  return {
    burst, honk, update,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const b of [sparks, ripples]) {
        b.mesh.dispose(); b.geometry.dispose(); b.material.dispose();
      }
      root.clear();
    },
  };
}
