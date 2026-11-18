(function(){
const IMG = k => { const el = document.querySelector('#pool img[data-k="' + k + '"]'); return el ? el.src : ''; };
document.querySelectorAll('img[data-img]').forEach(el => { el.src = IMG(el.dataset.img); });
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (fine) document.body.classList.add('fine');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const band = (q, a, b) => smooth(clamp((q - a) / (b - a), 0, 1));
const mixRGB = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const root = document.documentElement;

(function(){ const c = document.createElement('canvas'); c.width = c.height = 180; const x = c.getContext('2d'); const d = x.createImageData(180, 180);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 255; }
  x.putImageData(d, 0, 0); document.getElementById('grain').style.backgroundImage = 'url(' + c.toDataURL() + ')'; })();

/* Theme: follows the device until the visitor chooses */
const themeBtn = document.getElementById('theme');
function setTheme(t, save) { root.dataset.theme = t; themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); if (save) { try { localStorage.setItem('nero-theme', t); } catch (e) {} } }
setTheme(root.dataset.theme || 'light');
themeBtn.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => { let s = null; try { s = localStorage.getItem('nero-theme'); } catch (_) {} if (!s) setTheme(e.matches ? 'dark' : 'light'); }); } catch (e) {}

let lenis = null;
try { if (window.Lenis && !reduce) lenis = new Lenis({ lerp: 0.085, smoothWheel: true }); } catch (e) { lenis = null; }

const ptr = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
const glow = document.getElementById('glow'), dot = document.getElementById('dot');
addEventListener('pointermove', e => { ptr.tx = e.clientX; ptr.ty = e.clientY; }, { passive: true });
const top = document.getElementById('top');

// Realism kit for the NERO room (Three r128): procedural textures, an environment for reflections, contact shadows.
const REAL = (function(){
  const T = THREE;
  function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function noiseCanvas(n, oct, seed) { // smooth value noise, grey 0..255
    const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'); const r = rnd(seed);
    x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
    for (let o = 0; o < oct; o++) { const g = 4 << o, cell = n / g; x.globalAlpha = 0.5 / (o + 1);
      for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) { const v = Math.floor(r() * 255); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i * cell, j * cell, cell, cell); }
      x.globalAlpha = 1; x.filter = 'none'; }
    const c2 = document.createElement('canvas'); c2.width = c2.height = n; const y = c2.getContext('2d'); y.filter = 'blur(' + Math.max(1, n / 128) + 'px)'; y.drawImage(c, 0, 0); return c2;
  }
  function tex(canvas, rep, srgb) { const t = new T.CanvasTexture(canvas); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; if (srgb) t.encoding = T.sRGBEncoding; return t; }
  // Dark oak planks: colour map and a matching bump map.
  function oak() {
    const W = 1024, H = 1024, planks = 6, pw = W / planks, r = rnd(7);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const b = document.createElement('canvas'); b.width = W; b.height = H; const y = b.getContext('2d');
    y.fillStyle = '#9a9a9a'; y.fillRect(0, 0, W, H); x.fillStyle = 'rgb(44,36,30)'; x.fillRect(0, 0, W, H);
    for (let p = 0; p < planks; p++) {
      const off = r() * H, base = 34 + r() * 14;
      for (let seg = -2; seg < 3; seg++) {
        const y0 = off + seg * H * 0.62, L = H * 0.62, tone = base + (r() - 0.5) * 8;
        x.fillStyle = `rgb(${tone + 10},${tone + 2},${tone - 4})`; x.fillRect(p * pw, y0, pw, L);
        for (let g = 0; g < 70; g++) { // grain
          const gx = p * pw + r() * pw, a = 0.04 + r() * 0.1, w = 0.6 + r() * 1.6, dark = r() < 0.6;
          x.strokeStyle = dark ? `rgba(18,12,8,${a})` : `rgba(120,96,70,${a * 0.6})`; x.lineWidth = w; x.beginPath();
          for (let t = 0; t <= 1; t += 0.05) { const yy = y0 + t * L, xx = gx + Math.sin(t * 6 + g) * (2 + r() * 3); t === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); } x.stroke();
          y.strokeStyle = dark ? 'rgba(70,70,70,.25)' : 'rgba(190,190,190,.15)'; y.lineWidth = w; y.beginPath(); y.moveTo(gx, y0); y.lineTo(gx + 2, y0 + L); y.stroke();
        }
        x.fillStyle = 'rgba(10,6,4,.85)'; x.fillRect(p * pw, y0, pw, 2); y.fillStyle = '#303030'; y.fillRect(p * pw, y0, pw, 3);
      }
      x.fillStyle = 'rgba(10,6,4,.9)'; x.fillRect(p * pw, 0, 2, H); y.fillStyle = '#2a2a2a'; y.fillRect(p * pw, 0, 3, H);
    }
    return { map: c, bump: b };
  }
  // Velvet: fine pile noise plus a faint weave.
  function velvet() {
    const n = 512, c = noiseCanvas(n, 4, 11), x = c.getContext('2d'), r = rnd(3);
    x.globalAlpha = 0.08; for (let i = 0; i < n; i += 3) { x.fillStyle = r() < 0.5 ? '#000' : '#fff'; x.fillRect(0, i, n, 1); x.fillRect(i, 0, 1, n); } x.globalAlpha = 1;
    const d = x.getImageData(0, 0, n, n); for (let i = 0; i < d.data.length; i += 4) { const v = d.data[i] + (r() - 0.5) * 60; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; } x.putImageData(d, 0, 0);
    return c;
  }
  function plaster() { return noiseCanvas(512, 5, 21); }
  // Soft contact shadow: a radial gradient laid on the floor under each object.
  function blob(w, d, op) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, opacity: op, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.003; m.renderOrder = 1; return m;
  }
  // A small studio room baked into an environment map, so metal and velvet have something to reflect.
  function environment(renderer) {
    const es = new T.Scene(), box = new T.BoxGeometry();
    const room = new T.Mesh(new T.BoxGeometry(12, 6, 12), new T.MeshStandardMaterial({ color: 0x8a847a, side: T.BackSide, roughness: 1 })); room.position.y = 3; es.add(room);
    const lightM = c => new T.MeshBasicMaterial({ color: c });
    [[-4.5, 3.5, 1, 0.2, 2.6, 3.5, 0xffffff], [4.6, 2.6, -1, 0.2, 2, 2.4, 0xf2ead8], [0, 5.9, 0, 4, 0.1, 3, 0xffffff], [0, 2, -5.9, 3, 1.6, 0.1, 0xe2d6b8]].forEach(a => {
      const m = new T.Mesh(box, lightM(a[6])); m.position.set(a[0], a[1], a[2]); m.scale.set(a[3], a[4], a[5]); es.add(m); });
    es.add(new T.HemisphereLight(0xffffff, 0x444444, 1));
    const pm = new T.PMREMGenerator(renderer); const rt = pm.fromScene(es, 0.04); pm.dispose(); return rt.texture;
  }
  return { oak, velvet, plaster, blob, environment, tex, noiseCanvas };
})();

function nSmooth(geo) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const p = geo.attributes.position, n = p.count, nrm = new Float32Array(n * 3), acc = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const key = i => Math.round(p.getX(i) * 2000) + ',' + Math.round(p.getY(i) * 2000) + ',' + Math.round(p.getZ(i) * 2000);
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
    for (let k = 0; k < 3; k++) { const kk = key(i + k); const v = acc.get(kk) || [0, 0, 0]; v[0] += e1.x; v[1] += e1.y; v[2] += e1.z; acc.set(kk, v); }
  }
  for (let i = 0; i < n; i++) { const v = acc.get(key(i)); const l = Math.hypot(v[0], v[1], v[2]) || 1; nrm[i * 3] = v[0] / l; nrm[i * 3 + 1] = v[1] / l; nrm[i * 3 + 2] = v[2] / l; }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return geo;
}

function buildPiece() {
  const T = THREE, S = T.MathUtils.smoothstep;
  const g = new T.Group();
  if (!buildPiece.vel) buildPiece.vel = REAL.tex(REAL.velvet(), [5, 5]);
  const V = buildPiece.vel;
  const mats = {
    shell: new T.MeshPhysicalMaterial({ color: 0x7E7C55, roughness: 0.9, sheen: new T.Color(0x5E5A3A), bumpMap: V, bumpScale: 0.0022 }),
    pillow: new T.MeshPhysicalMaterial({ color: 0xE2CF9A, roughness: 0.88, sheen: new T.Color(0x9C9068), bumpMap: V, bumpScale: 0.0018 }),
    leg: new T.MeshStandardMaterial({ color: 0x2A2521, roughness: 0.32, metalness: 0.55 }),
    lamp: new T.MeshStandardMaterial({ color: 0x2A2521, roughness: 0.4, metalness: 0.5, side: T.DoubleSide }),
  };
  [mats.shell, mats.pillow, mats.leg, mats.lamp].forEach(m => m.color.convertSRGBToLinear());
  // Shell: a U in plan (back + two arms), raised as one wall whose top domes from the arms up over the back.
  const W = 1.86, D = 0.84, t = 0.17, r = 0.4, Y0 = 0.3;
  const hw = W / 2 - t / 2, zb = -D / 2 + t / 2, zf = D / 2 - 0.08, cr = r - t / 2;
  const cl = [];
  const seg = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), k = Math.max(2, Math.ceil(L / 0.02)); for (let i = 0; i < k; i++) cl.push([x0 + (x1 - x0) * i / k, z0 + (z1 - z0) * i / k]); };
  const arc = (cx, cz, a0, a1) => { const k = 24; for (let i = 0; i < k; i++) { const a = a0 + (a1 - a0) * i / k; cl.push([cx + Math.cos(a) * cr, cz + Math.sin(a) * cr]); } };
  seg(-hw, zf, -hw, zb + cr); arc(-hw + cr, zb + cr, Math.PI, Math.PI * 1.5); seg(-hw + cr, zb, hw - cr, zb); arc(hw - cr, zb + cr, Math.PI * 1.5, Math.PI * 2); seg(hw, zb + cr, hw, zf); cl.push([hw, zf]);
  const tan = i => { const p0 = cl[Math.max(0, i - 1)], p1 = cl[Math.min(cl.length - 1, i + 1)]; const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); return [(p1[0] - p0[0]) / l, (p1[1] - p0[1]) / l]; };
  const h = t / 2, outer = [], inner = [];
  cl.forEach((c, i) => { const [tx, tz] = tan(i); const nx = tz, nz = -tx; outer.push([c[0] + nx * h, c[1] + nz * h]); inner.push([c[0] - nx * h, c[1] - nz * h]); });
  const poly = [...outer];
  { const c = cl[cl.length - 1], [tx, tz] = tan(cl.length - 1), nx = tz, nz = -tx; for (let i = 1; i < 16; i++) { const a = Math.PI * i / 16; poly.push([c[0] + nx * h * Math.cos(a) + tx * h * Math.sin(a), c[1] + nz * h * Math.cos(a) + tz * h * Math.sin(a)]); } }
  poly.push(...inner.reverse());
  { const c = cl[0], [tx, tz] = tan(0), nx = tz, nz = -tx; for (let i = 1; i < 16; i++) { const a = Math.PI * i / 16; poly.push([c[0] - nx * h * Math.cos(a) - tx * h * Math.sin(a), c[1] - nz * h * Math.cos(a) - tz * h * Math.sin(a)]); } }
  const shape = new T.Shape(poly.map(q => new T.Vector2(q[0], -q[1])));
  const bev = 0.06;
  let sg = new T.ExtrudeGeometry(shape, { depth: 1, steps: 1, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.9, bevelSegments: 6 });
  const top = (x, z) => { const back = S(0.3 - z, 0, 0.62); const dome = Math.pow(Math.max(0, 1 - Math.pow(x / (W / 2 + 0.06), 2)), 0.55); return Y0 + 0.33 + 0.42 * dome * back + 0.04 * back; };
  const P = sg.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), s = P.getZ(i), z = -y;
    const Ht = top(x, z);
    const Y = s < 0 ? Y0 + s : s > 1 ? Ht + (s - 1) : Y0 + s * (Ht - Y0);
    P.setXYZ(i, x, Y, z);
  }
  sg = nSmooth(sg);
  const shell = new T.Mesh(sg, mats.shell); g.add(shell);
  // Seat: base slab and a soft cushion inside the U.
  const rr = (w, d, rad) => { const s = new T.Shape(); const x = w / 2, z = d / 2; s.moveTo(-x + rad, -z); s.lineTo(x - rad, -z); s.quadraticCurveTo(x, -z, x, -z + rad); s.lineTo(x, z - rad); s.quadraticCurveTo(x, z, x - rad, z); s.lineTo(-x + rad, z); s.quadraticCurveTo(-x, z, -x, z - rad); s.lineTo(-x, -z + rad); s.quadraticCurveTo(-x, -z, -x + rad, -z); return s; };
  const slab = (w, d, rad, hgt, b, mat, y, z) => { let geo = new T.ExtrudeGeometry(rr(w, d, rad), { depth: hgt, steps: 1, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 10 }); geo.rotateX(-Math.PI / 2); geo = nSmooth(geo); const m = new T.Mesh(geo, mat); m.position.set(0, y, z); g.add(m); return m; };
  const iw = W - 2 * t - 0.02, idp = zf - (zb + t / 2) + 0.06;
  slab(iw + 0.02, idp, 0.12, 0.1, 0.04, mats.shell, Y0 + 0.02, (zf + zb + t / 2) / 2 + 0.03);
  const cw = (iw - 0.06) / 2, cz = (zf + zb + t / 2) / 2 + 0.05;
  const cushion = slab(cw, idp - 0.04, 0.1, 0.06, 0.06, mats.shell, Y0 + 0.17, cz); cushion.position.x = -cw / 2 - 0.006;
  const cushion2 = slab(cw, idp - 0.04, 0.1, 0.06, 0.06, mats.shell, Y0 + 0.17, cz); cushion2.position.x = cw / 2 + 0.006;
  // Two lumbar pillows: squared-off ellipsoids.
  const pg = new T.SphereGeometry(1, 40, 20); const pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) { let x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); const sx = Math.sign(x) * Math.pow(Math.abs(x), 0.45), sy = Math.sign(y) * Math.pow(Math.abs(y), 0.6); const edge = Math.max(Math.abs(sx), Math.abs(sy)); pp.setXYZ(i, sx * 0.3, sy * 0.13, z * 0.09 * (1 - 0.55 * Math.pow(edge, 3))); }
  pg.computeVertexNormals();
  [[-0.36, 0.08], [0.36, -0.08]].forEach(([x, rz]) => { const m = new T.Mesh(pg, mats.pillow); m.position.set(x, Y0 + 0.43, zb + t / 2 + 0.12); m.rotation.set(-0.32, x > 0 ? -0.1 : 0.1, rz); g.add(m); });
  // Legs: thin, black, slightly splayed.
  const lg = new T.CylinderGeometry(0.016, 0.011, Y0 + 0.02, 12);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const m = new T.Mesh(lg, mats.leg); m.position.set(sx * (W / 2 - 0.22), (Y0 + 0.02) / 2, sz * 0.24); m.rotation.set(sz * 0.05, 0, -sx * 0.05); g.add(m); });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // Arc lamp: base on the floor to the left, a bent stem, a black drum shade. head() moves the shade.
  const lamp = new T.Group();
  const base = new T.Mesh(new T.LatheGeometry([[0, 0], [0.19, 0], [0.2, 0.006], [0.2, 0.024], [0.188, 0.032], [0.07, 0.04], [0.025, 0.052], [0, 0.054]].map(p => new T.Vector2(p[0], p[1])), 56), mats.lamp); base.castShadow = true; lamp.add(base);
  const shade = new T.Group();
  const drum = new T.Mesh(new T.LatheGeometry([[0.229, -0.16], [0.237, -0.16], [0.239, -0.152], [0.172, 0.156], [0.17, 0.16], [0.164, 0.16]].map(p => new T.Vector2(p[0], p[1])), 64), mats.lamp); drum.castShadow = true; shade.add(drum);
  const capm = new T.Mesh(new T.CircleGeometry(0.17, 40), mats.lamp); capm.rotation.x = -Math.PI / 2; capm.position.y = 0.16; shade.add(capm);
  const glowM = new T.MeshBasicMaterial({ color: 0xE2CF9A, side: T.DoubleSide });
  const diff = new T.Mesh(new T.CircleGeometry(0.2, 48), glowM); diff.rotation.x = Math.PI / 2; diff.position.y = -0.12; diff.userData.bulb = true; shade.add(diff);
  const inner2 = new T.Mesh(new T.CylinderGeometry(0.165, 0.23, 0.315, 48, 1, true), glowM); shade.add(inner2);
  const bulb = new T.Mesh(new T.SphereGeometry(0.05, 16, 12), new T.MeshBasicMaterial({ color: 0xF2EDE3 })); bulb.position.y = -0.05; bulb.userData.bulb = true; shade.add(bulb);
  lamp.add(shade);
  let stem = null; const baseAt = new T.Vector3(-1.5, 0.035, -0.55);
  base.position.copy(baseAt).setY(0);
  const blobs = [REAL.blob(2.5, 1.3, 0.6), REAL.blob(0.7, 0.7, 0.5)];
  blobs[0].position.z = 0.03; g.add(blobs[0]); blobs[1].position.set(baseAt.x, 0.003, baseAt.z); lamp.add(blobs[1]);
  blobs.forEach(b => { b.castShadow = false; b.receiveShadow = false; b.userData.bulb = true; b.userData.base = b.material.opacity; });
  const spot = new T.SpotLight(0xE2CF9A, 0, 9, 0.78, 0.75, 1.4);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0005; spot.shadow.radius = 4; spot.shadow.camera.near = 0.2;
  const tgt = new T.Object3D(); lamp.add(tgt); spot.target = tgt; lamp.add(spot);
  const up = new T.Vector3(0, -1, 0), dir = new T.Vector3(), q = new T.Quaternion();
  function head(hp, aim) {
    shade.position.copy(hp);
    dir.subVectors(aim, hp).normalize();
    q.setFromUnitVectors(up, dir); shade.quaternion.slerp(q, 1);
    const topP = new T.Vector3(0, 0.16, 0).applyQuaternion(shade.quaternion).add(hp);
    const hi = Math.max(2.75, hp.y + 0.75);
    const curve = new T.CubicBezierCurve3(baseAt.clone(), new T.Vector3(baseAt.x, hi, baseAt.z), new T.Vector3(T.MathUtils.lerp(baseAt.x, topP.x, 0.7), hi + 0.15, T.MathUtils.lerp(baseAt.z, topP.z, 0.7)), topP);
    if (stem) { stem.geometry.dispose(); lamp.remove(stem); }
    stem = new T.Mesh(new T.TubeGeometry(curve, 90, 0.0085, 10), mats.lamp); stem.castShadow = true; lamp.add(stem);
    spot.position.copy(new T.Vector3(0, -0.06, 0).applyQuaternion(shade.quaternion).add(hp));
    tgt.position.copy(aim);
  }
  head(new T.Vector3(-0.35, 1.95, 0.25), new T.Vector3(0.05, 0.45, -0.05));
  return { group: g, lamp, shade, spot, head, mats, glowM, shell, cushion, bulb, blobs };
}




/* 1. Day to night on the real photograph. A small shader relights it: morning sun through a window, dusk, then night with only the lamp's pool. */
const room = document.getElementById('home'), hstage = document.getElementById('hstage');
let HG = null;
try {
  if (!window.THREE) throw new Error('no three');
  const T = THREE, c = document.getElementById('gl');
  const R = new T.WebGLRenderer({ canvas: c, antialias: false });
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  const tex = new T.Texture(); tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
  const im = new Image(); im.onload = () => { tex.image = im; tex.needsUpdate = true; }; im.src = IMG('eclisse');
  const U = { tex: { value: tex }, dusk: { value: 0 }, night: { value: 0 }, lamp: { value: 0 }, t: { value: 0 } };
  const mat = new T.ShaderMaterial({ uniforms: U,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `precision highp float;
uniform sampler2D tex; uniform float dusk, night, lamp, t; varying vec2 vUv;
float win(vec2 p, float ox, float sk, float x0, float x1, float y0, float y1) {
  float u = p.x + (p.y - .3) * sk - ox;
  float r = smoothstep(x0, x0 + .02, u) * (1. - smoothstep(x1 - .02, x1, u)) * smoothstep(y0, y0 + .02, p.y) * (1. - smoothstep(y1 - .02, y1, p.y));
  float mx = (x0 + x1) * .5, my = (y0 + y1) * .5;
  r *= smoothstep(.005, .012, abs(u - mx)) * smoothstep(.005, .012, abs(p.y - my));
  return r;
}
void main() {
  vec2 p = vec2(vUv.x, 1. - vUv.y);
  vec3 c = texture2D(tex, vUv).rgb;
  vec3 d = pow(c, vec3(.8)) * 1.06 * vec3(.98, 1., 1.03);
  float w = win(p, 0., .45, .1, .42, .06, .5) * (.92 + .08 * sin(t * .4));
  d = 1. - (1. - d) * (1. - w * .42 * vec3(1., .97, .9));
  vec3 k = c * .62 * vec3(.8, .87, 1.);
  float w2 = win(p, .2, .95, .1, .4, .02, .34);
  k = 1. - (1. - k) * (1. - w2 * .3 * vec3(.89, .76, .52));
  vec2 q = (p - vec2(.5, .66)) / vec2(.36, .21);
  float pool = 1. - smoothstep(.5, 1.15, length(q));
  float cone = 0.; if (p.y > .36) { float hw = .09 + (p.y - .36) * .62; cone = (1. - smoothstep(hw * .65, hw, abs(p.x - .495))) * (1. - smoothstep(.72, .92, p.y)); }
  float shade = 1. - smoothstep(.02, .085, length((p - vec2(.495, .335)) / vec2(1., .55)));
  float lit = clamp(max(pool, cone * .75), 0., 1.);
  vec3 n = c * mix(.12, 1.04, lit * lamp) + shade * lamp * vec3(.89, .81, .6) * .3;
  vec3 col = mix(d, k, dusk); col = mix(col, n, night);
  gl_FragColor = vec4(col, 1.);
}` });
  const sc = new T.Scene(); sc.add(new T.Mesh(new T.PlaneGeometry(2, 2), mat));
  const cam = new T.Camera();
  HG = { R, sc, cam, U, c };
  const sz = () => R.setSize(c.clientWidth, c.clientHeight, false); sz(); addEventListener('resize', sz);
} catch (e) { room.classList.add('nogl'); HG = null; }

/* The making: the same loveseat built in 3D, drawn, modelled, made, lit, then yours to turn and recolour. */
const BRAND = { perg: 0xF2EDE3, paglia: 0xE2CF9A, ard: 0x6F869C, oliva: 0x7E7C55, petr: 0x1F4A4E, nero: 0x2A2521, desk: 0xE4DED2 };
const col = h => new THREE.Color(h);
function makeStage(canvas) {
  const T = THREE;
  const R = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  const sc = new T.Scene();
  sc.environment = REAL.environment(R);
  const o = REAL.oak(); const TX = { oak: REAL.tex(o.map, [22, 22], true), oakB: REAL.tex(o.bump, [22, 22]), pl: REAL.tex(REAL.plaster(), [10, 4]) };
  const cam = new T.PerspectiveCamera(30, 1, 0.1, 60);
  const hemi = new T.HemisphereLight(BRAND.perg, BRAND.desk, 0.85); sc.add(hemi);
  const floorM = new T.MeshStandardMaterial({ color: 0xffffff, map: TX.oak, bumpMap: TX.oakB, bumpScale: 0.0035, roughness: 0.5, transparent: true });
  const floor = new T.Mesh(new T.PlaneGeometry(40, 40), floorM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wallM = new T.MeshStandardMaterial({ color: BRAND.petr, roughness: 0.92, bumpMap: TX.pl, bumpScale: 0.004, transparent: true });
  const wall = new T.Mesh(new T.PlaneGeometry(40, 14), wallM); wall.position.set(0, 7, -1.05); wall.receiveShadow = true; sc.add(wall);
  const niche = new T.Group(); sc.add(niche);
  const slatM = new T.MeshStandardMaterial({ color: BRAND.petr, roughness: 0.9, transparent: true });
  const slats = new T.InstancedMesh(new T.BoxGeometry(0.045, 3.2, 0.06), slatM, 31);
  const m4 = new T.Matrix4(); for (let i = 0; i < 31; i++) { m4.makeTranslation(-1.35 + i * 0.09, 1.6, -0.99); slats.setMatrixAt(i, m4); }
  slats.castShadow = slats.receiveShadow = true; niche.add(slats);
  const skirt = new T.Mesh(new T.BoxGeometry(40, 0.09, 0.02), slatM); skirt.position.set(0, 0.045, -1.04); sc.add(skirt);
  const P = buildPiece(); const spin = new T.Group(); spin.add(P.group); spin.add(P.lamp); sc.add(spin);
  P.head(new T.Vector3(-0.2, 1.95, 0.31), new T.Vector3(0.05, 0.45, -0.05));
  const S = { T, R, sc, cam, hemi, floor, floorM, wall, wallM, niche, slatM, skirt, P, spin, ox: 0, portrait: false, canvas };
  S.envMats = [floorM, wallM, slatM, P.mats.shell, P.mats.pillow, P.mats.leg, P.mats.lamp];
  S.env = v => { for (const m of S.envMats) m.envMapIntensity = v; };
  S.size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; R.setSize(w, h, false); cam.aspect = w / h; S.portrait = w < h * 1.1; cam.fov = S.portrait ? (w / h < 0.62 ? 62 : 50) : 30; cam.updateProjectionMatrix();
    S.ox = S.portrait ? 0 : 0.85; spin.position.x = niche.position.x = S.ox; };
  S.size(); addEventListener('resize', S.size);
  return S;
}
const making = document.getElementById('making'), mstage = document.getElementById('mstage');
let M = null;
try {
  if (!window.THREE) throw new Error('no three');
  const T = THREE;
  M = makeStage(document.getElementById('gl2'));
  M.key = new T.DirectionalLight(BRAND.perg, 0.8); M.key.position.set(-3, 5, 4); M.key.castShadow = true; M.key.shadow.mapSize.set(1024, 1024);
  Object.assign(M.key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); M.sc.add(M.key);
  M.sfloor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.ShadowMaterial({ opacity: 0.14 })); M.sfloor.rotation.x = -Math.PI / 2; M.sfloor.position.y = 0.001; M.sfloor.receiveShadow = true; M.sc.add(M.sfloor);
  M.lineM = new T.LineBasicMaterial({ color: BRAND.nero, transparent: true, opacity: 0.9 });
  M.lines = []; M.meshes = [];
  [M.P.group, M.P.lamp].forEach(gr => gr.traverse(o => { if (!o.isMesh || o.material === M.P.glowM || o.userData.bulb) return;
    const l = new T.LineSegments(new T.EdgesGeometry(o.geometry, 7), M.lineM); o.add(l); M.lines.push(l); M.meshes.push(o); }));
  M.clay = col(BRAND.perg).convertSRGBToLinear();
  M.final = new Map([[M.P.mats.shell, col(BRAND.oliva)], [M.P.mats.pillow, col(BRAND.paglia)], [M.P.mats.leg, col(BRAND.nero)], [M.P.mats.lamp, col(BRAND.nero)]]);
  M.final.forEach(c => c.convertSRGBToLinear());
  M.mats = [...M.final.keys()];
  M.shellTarget = M.final.get(M.P.mats.shell).clone();
  M.views = [[0.85, 2.3, 5.6, 0.75], [1.4, 1.45, 6.4, 0.95], [-0.7, 1.75, 6.4, 1.0], [0.02, 1.4, 6.6, 1.25], [0.35, 1.5, 6.2, 1.1]];
  M.cam0 = { a: 0.85, y: 2.3, d: 5.6, l: 0.75 }; M.yaw = 0; M.yawT = 0; M.lampOn = 1; M.lampT = 1;
} catch (e) { making.classList.add('nogl'); M = null; }

/* the five grounds of the making, blended continuously */
const mhead = document.getElementById('mhead');
const MGT = { light: [[242, 237, 227], [228, 222, 210], [226, 207, 154], [42, 37, 33], [42, 37, 33]], dark: [[42, 37, 33], [50, 57, 59], [31, 74, 78], [42, 37, 33], [42, 37, 33]] };
const dkTheme = () => root.dataset.theme === 'dark';
const msteps = [...document.querySelectorAll('.mstep')], segs = [...document.querySelectorAll('#segs i')], mnum = document.getElementById('mnum');
let mcur = 0;

/* Chapters */
const chapters = [...document.querySelectorAll('[data-chapter]')];
const rail = document.getElementById('rail'), pill = document.getElementById('cpill');
rail.innerHTML = chapters.map((c, i) => `<a href="#${c.id}"><span>${c.dataset.chapter}</span><i></i></a>`).join('');
const railA = [...rail.querySelectorAll('a')];
const chapterEl = document.getElementById('chapter'), tfill = document.getElementById('threadfill');
const navs = [...document.querySelectorAll('[data-nav]')];
let curChap = -1;
function setChapter(i) {
  curChap = i; const c = chapters[i];
  railA.forEach((a, j) => a.classList.toggle('on', j === i));
  if (!document.body.classList.contains('away')) navs.forEach(a => a.setAttribute('aria-current', a.dataset.nav === c.id));
  chapterEl.textContent = c.dataset.chapter;
  pill.innerHTML = `<b>${i + 1}<small>/${chapters.length}</small></b><span>${c.dataset.chapter}</span>`;
  pill.classList.remove('flip'); void pill.offsetWidth; pill.classList.add('flip', 'show'); clearTimeout(setChapter.t); setChapter.t = setTimeout(() => pill.classList.remove('show'), 2800);
}
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2 });
document.querySelectorAll('.rise, .sweep').forEach(el => io.observe(el));
// Give every chapter heading the light wipe, so the motion is one idea
// applied consistently rather than a different effect per section.
document.querySelectorAll('.chead h2.big, .srhead h2, .story h2').forEach(el => {
  if (el.classList.contains('sweep')) return;
  el.dataset.sweep = el.textContent;   // the ::after draws this text, lit
  el.classList.add('sweep');
  io.observe(el);
});

const says = [...document.querySelectorAll('.say > div')];
const bar = document.getElementById('barfill'), rtime = document.getElementById('rtime'), rwhat = document.getElementById('rwhat');
let stage = 0, hdark = false;
const HBT = { light: [[228, 222, 210], [77, 86, 95], [42, 37, 33]], dark: [[42, 37, 33], [56, 60, 64], [36, 31, 28]] };
const hdone = document.getElementById('hdone'), hsun = document.getElementById('hsun'), hlampc = document.getElementById('hlamp'), hkv = document.getElementById('hkv'), hkl = document.getElementById('hkl');
const HD = { cx: 150, cy: 58, rx: 140, ry: 44, L: 0 };

/* What is under the header decides its ink */
function surfaceAt(y) {
  if (document.body.classList.contains('away')) return root.dataset.theme === 'dark' ? 'dk' : 'lt';
  for (const s of [room, ...document.querySelectorAll('[data-surface]'), making]) { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) {
    if (s === room) return hdark ? 'dk' : 'lt';
    if (s === making) return mstage.classList.contains('dk') ? 'dk' : 'lt';
    const v = s.dataset.surface; return v === 'theme' ? (root.dataset.theme === 'dark' ? 'dk' : 'lt') : v; } }
  return root.dataset.theme === 'dark' ? 'dk' : 'lt';
}

let t0 = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
  if (lenis) lenis.raf(now);
  ptr.x = lerp(ptr.x, ptr.tx, 0.14); ptr.y = lerp(ptr.y, ptr.ty, 0.14);
  if (fine) { glow.style.transform = `translate(${ptr.x}px,${ptr.y}px)`; dot.style.transform = `translate(${ptr.x}px,${ptr.y}px)`; }
  top.classList.toggle('solid', scrollY > 40);
  const max = Math.max(1, root.scrollHeight - innerHeight);
  tfill.style.transform = `scaleX(${clamp(scrollY / max, 0, 1)})`;
  let ci = 0; chapters.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.5) ci = i; });
  if (ci !== curChap) setChapter(ci);

  // 1. day to night
  const rr = room.getBoundingClientRect();
  const p = clamp(-rr.top / (rr.height - innerHeight), 0, 1);
  const ns = p < 0.3 ? 0 : p < 0.62 ? 1 : 2;
  if (ns !== stage) { says[stage].classList.remove('on'); says[ns].classList.add('on'); stage = ns; }
  bar.style.transform = `scaleX(${p})`;
  const K = [[0, 10], [0.3, 16], [0.62, 19], [0.8, 21], [1, 21.5]]; let hrs = 10;
  for (let i = 0; i < K.length - 1; i++) if (p >= K[i][0] && p <= K[i + 1][0]) hrs = lerp(K[i][1], K[i + 1][1], (p - K[i][0]) / (K[i + 1][0] - K[i][0]));
  const hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 6) * 10;
  rtime.textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  rwhat.textContent = p < 0.3 ? 'Daylight through the window' : p < 0.62 ? 'Dusk, the sun going' : p < 0.7 ? 'Night, the room goes dark' : 'Night, its lamp on at 2700 K';
  const dusk = band(p, 0.18, 0.5), night = band(p, 0.5, 0.72), lampOn = band(p, 0.68, 0.84);
  const HB = HBT[dkTheme() ? 'dark' : 'light'], bg = mixRGB(mixRGB(HB[0], HB[1], dusk), HB[2], night);
  hstage.style.background = `rgb(${bg.join(',')})`;
  { if (!HD.L) { HD.L = hdone.getTotalLength(); hdone.style.strokeDasharray = HD.L; }
    const t = clamp((hrs - 6) / 12.25, 0, 1.15), a = Math.PI * (1 - Math.min(t, 1));
    const sx = HD.cx + HD.rx * Math.cos(a), sy = HD.cy - HD.ry * Math.sin(a) + (t > 1 ? (t - 1) * 120 : 0);
    hsun.setAttribute('cx', sx.toFixed(1)); hsun.setAttribute('cy', sy.toFixed(1)); hsun.style.opacity = t <= 1 ? 1 : Math.max(0, 1 - (t - 1) * 14);
    hsun.style.setProperty('--sunc', `rgb(${mixRGB([226, 207, 154], [214, 168, 96], smooth(clamp((hrs - 14) / 4.25, 0, 1))).join(',')})`);
    hdone.style.strokeDashoffset = (HD.L * (1 - Math.min(t, 1))).toFixed(1);
    hlampc.setAttribute('opacity', lampOn.toFixed(3));
    const k = lampOn > 0.5 ? 2700 : hrs < 15 ? 5600 : hrs < 18.25 ? Math.round(lerp(5600, 3300, (hrs - 15) / 3.25) / 100) * 100 : null;
    hkv.textContent = k ? k + ' K' : 'Dark'; hkl.textContent = lampOn > 0.5 ? 'its lamp' : hrs < 15 ? 'daylight' : hrs < 18.25 ? 'low sun' : 'after sunset'; }
  const dk = dkTheme() || dusk > 0.45 || night > 0.3; if (dk !== hdark) { hdark = dk; hstage.classList.toggle('dk', dk); hstage.classList.toggle('lt', !dk); }
  if (HG && rr.bottom > 0) { HG.U.dusk.value = dusk; HG.U.night.value = night; HG.U.lamp.value = lampOn; HG.U.t.value = now / 1000; HG.R.render(HG.sc, HG.cam); }

  // 5. the making: one continuous scale, s from 0 to 4.6
  const mr = making.getBoundingClientRect();
  const q = clamp(-mr.top / (mr.height - innerHeight), 0, 1), s = q * 4.6;
  const ms = Math.min(4, Math.floor(s + 0.08));
  if (ms !== mcur) { msteps[mcur].classList.remove('on'); msteps[ms].classList.add('on'); mcur = ms; mnum.textContent = Math.min(4, ms + 1); mstage.classList.toggle('play', ms === 4); }
  segs.forEach((g, i) => g.style.setProperty('--f', clamp(s - i, 0, 1)));
  const fForm = band(s, 0.7, 1.15), fMat = band(s, 1.7, 2.15), fLit = band(s, 2.7, 3.15);
  const MG = MGT[dkTheme() ? 'dark' : 'light'], mg = mixRGB(mixRGB(mixRGB(MG[0], MG[1], fForm), MG[2], fMat), MG[3], fLit);
  mstage.style.background = `rgb(${mg.join(',')})`; mstage.style.setProperty('--sbg', `rgb(${mg.join(',')})`); mstage.style.setProperty('--grid', 1 - fForm);
  if (M) M.lineM.color.set(dkTheme() ? BRAND.perg : BRAND.nero);
  const mdk = dkTheme() || (fLit > 0.5 && (!M || M.lampOn > 0.5)); if (mdk !== mstage.classList.contains('dk')) { mstage.classList.toggle('dk', mdk); mstage.classList.toggle('lt', !mdk); }
  if (M && mr.bottom > 0 && mr.top < innerHeight) {
    const draw = clamp(s / 0.7, 0, 1);
    M.lampOn = lerp(M.lampOn, ms === 4 ? M.lampT : 1, 0.08);
    const litT = fLit * M.lampOn;
    for (const l of M.lines) { const n = l.geometry.attributes.position.count; l.geometry.setDrawRange(0, Math.floor(n * draw / 2) * 2); }
    M.lineM.opacity = 0.9 * (1 - fForm); M.lineM.visible = fForm < 0.99;
    M.final.get(M.P.mats.shell).lerp(M.shellTarget, 0.08);
    for (const mm of M.mats) { mm.opacity = fForm; mm.transparent = fForm < 0.99; mm.color.copy(M.clay).lerp(M.final.get(mm), fMat); }
    for (const o of M.meshes) o.castShadow = fForm > 0.4;
    M.P.glowM.color.copy(M.P.mats.lamp.color).lerp(M.P.spot.color, litT); M.P.glowM.transparent = fForm < 0.99; M.P.glowM.opacity = fForm;
    M.P.blobs.forEach(b => b.material.opacity = b.userData.base * fForm);
    M.P.bulb.visible = litT > 0.15; M.P.spot.intensity = litT * 1.5;
    M.floorM.opacity = fLit; M.floor.visible = fLit > 0.01; M.skirt.visible = fLit > 0.01; M.sfloor.material.opacity = 0.14 * fForm * (1 - fLit);
    M.wallM.opacity = fLit; M.slatM.opacity = fLit; M.wall.visible = M.niche.visible = fLit > 0.01;
    const dayIn = fLit * (1 - M.lampOn);
    M.key.intensity = 0.85 * fForm * (1 - fLit) + dayIn * 1.1; M.hemi.intensity = lerp(0.85, 0.1, fLit) + dayIn * 0.55; M.env(lerp(0.8, 0.06, fLit) + dayIn * 0.6);
    M.hemi.color.set(BRAND.perg).lerp(col(BRAND.ard), fLit * M.lampOn); M.hemi.groundColor.set(BRAND.desk).lerp(col(BRAND.nero), fLit * M.lampOn);
    const i0 = Math.min(3, Math.floor(s)), f = smooth(clamp(s - i0, 0, 1)), A = M.views[i0], B = M.views[Math.min(4, i0 + 1)];
    M.cam0.a = lerp(M.cam0.a, lerp(A[0], B[0], f), 0.12); M.cam0.y = lerp(M.cam0.y, lerp(A[1], B[1], f), 0.12); M.cam0.d = lerp(M.cam0.d, lerp(A[2], B[2], f), 0.12); M.cam0.l = lerp(M.cam0.l, lerp(A[3], B[3], f), 0.12);
    M.yaw = lerp(M.yaw, ms === 4 ? M.yawT : 0, 0.1); M.spin.rotation.y = M.yaw;
    const cx = M.ox * 0.45 + (M.portrait ? -0.3 : 0);
    M.cam.position.set(cx + Math.sin(M.cam0.a) * M.cam0.d, M.cam0.y, Math.cos(M.cam0.a) * M.cam0.d);
    if (M.portrait) {
      // frame the loveseat and its lamp in the free space between the title and the step card
      const sr = mstage.getBoundingClientRect(), hb = mhead.getBoundingClientRect(), st = msteps[mcur].getBoundingClientRect();
      const w = sr.width, h = sr.height, side = innerHeight < 560 && w > h;
      const t = hb.bottom - sr.top + 8, b = (side ? h - 12 : st.top - sr.top - 4);
      M.fr = M.fr || { t, b }; M.fr.t = lerp(M.fr.t, t, 0.15); M.fr.b = lerp(M.fr.b, b, 0.15);
      const fh = Math.max(140, M.fr.b - M.fr.t), cy = (M.fr.t + M.fr.b) / 2, d = M.cam0.d;
      let vf = 2 * Math.atan((3.15 * h / fh) / 2 / d); vf = Math.max(vf, 2 * Math.atan((3.1 / 2 / d) / (w / h)));
      M.cam.fov = Math.min(100, vf * 180 / Math.PI); M.cam.setViewOffset(w, h, 0, h / 2 - cy, w, h); M.cam.updateProjectionMatrix();
      M.cam.lookAt(cx, 1.4, 0);
    } else { if (M.cam.view && M.cam.view.enabled) { M.cam.clearViewOffset(); M.size(); } M.cam.lookAt(cx, M.cam0.l, 0); }
    M.R.render(M.sc, M.cam);
  }

  const sf = surfaceAt(40); if (!top.classList.contains(sf)) { top.classList.remove('dk', 'lt'); top.classList.add(sf); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* Make it yours: colour, lamp, turn */
const MSW = [['Oliva', '#7E7C55', 0x7E7C55], ['Petrolio', '#1F4A4E', 0x1F4A4E], ['Ardesia', '#6F869C', 0x6F869C], ['Paglia', '#E2CF9A', 0xE2CF9A]];
const msw = document.getElementById('msw'), mcta = document.getElementById('mcta');
msw.innerHTML = MSW.map((c, i) => `<button type="button" style="--c:${c[1]}" aria-pressed="${i === 0}" aria-label="${c[0]}" data-i="${i}"></button>`).join('') + '<span class="swl" id="mswl">Oliva velvet</span>';
let mColour = 'Oliva';
msw.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const c = MSW[+b.dataset.i]; mColour = c[0];
  msw.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); document.getElementById('mswl').textContent = c[0] + ' velvet';
  if (M) M.shellTarget.set(c[2]).convertSRGBToLinear(); mcta.dataset.msg = 'I would like an Eclisse loveseat in ' + c[0] + ' velvet.'; });
mcta.dataset.msg = 'I would like an Eclisse loveseat in Oliva velvet.';
const lampbtn = document.getElementById('lampbtn');
lampbtn.addEventListener('click', () => { if (!M) return; M.lampT = M.lampT ? 0 : 1; lampbtn.setAttribute('aria-pressed', !!M.lampT); lampbtn.textContent = M.lampT ? 'Lamp on' : 'Lamp off, daylight'; });
(function(){ const cv = document.getElementById('gl2'); let down = false, x0 = 0, y0 = 0, base = 0;
  cv.addEventListener('pointerdown', e => { if (!M || mcur !== 4) return; down = true; x0 = e.clientX; y0 = e.clientY; base = M.yawT; });
  addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > Math.abs(e.clientY - y0)) M.yawT = base + dx * 0.008; });
  addEventListener('pointerup', () => { down = false; }); })();

/* 2. The lighting note: choose a moment and the photograph is relit live; the card shows the setting */
const MOODS = {
  ceiling: { u: [1, .3, 0, 1, 0, 1, 1, 1, 1, 1, 1], tag: 'Ceiling light only', for: 'Without its note', lamp: 'Off. A ceiling light lights the whole room', shade: 'None. The light comes from above', bulb: 'Whatever is in the ceiling', dim: 'Full', shadow: 'Hardly any, so the seat looks flat', foot: 'This is how most rooms are lit, and why a good piece can look ordinary.', cap: 'Light from the ceiling reaches everything evenly: the seat loses its shadow, the colours go flat and the whole room competes with the piece.' },
  evening: { u: [0, .4, 1.2, 1.05, .42, .58, .7, 1, 1, .76, .5], tag: 'Early evening · 2700 K · 40%', for: 'For an early evening', lamp: 'The Eclisse arc lamp, standing to the left of the loveseat', shade: 'Above the seat, so the bulb is hidden', bulb: '2700 K, warm white', dim: '40%', shadow: 'Falls back and to the right, onto the wall', foot: 'The note as it ships with the loveseat.', cap: 'Early evening: the last blue daylight is still in the room, and the lamp lays a warm pool on the seat and the floor in front of it.' },
  reading: { u: [0, .13, 1.4, .72, .2, .8, .82, .9, 1, .88, .72], tag: 'Reading · 3000 K · 70%', for: 'For reading', lamp: 'The same arc lamp, its head lowered a hand towards the seat', shade: 'Just over the shoulder of whoever reads', bulb: '3000 K, a little whiter', dim: '70%', shadow: 'Shorter and darker, close behind the seat', foot: 'Brighter and whiter on the page, while the room stays dim around it.', cap: 'For reading: a whiter, brighter pool kept tight on the seat. The rest of the room drops away so the eye rests on the page.' },
  late: { u: [0, .045, 1.08, 1.3, .62, .55, .6, .8, 1, .66, .38], tag: 'Late at night · 2400 K · 20%', for: 'Late at night', lamp: 'The same arc lamp, left where it is', shade: 'Above the seat', bulb: '2400 K, amber', dim: '20%', shadow: 'Soft and long, fading into the wall', foot: 'Low and amber, so the room winds down with you.', cap: 'Late at night: the only light in the room. A low amber glow spreads softly over the seat, the floor and the wall behind, and everything else falls into dark.' } };
const moods = document.getElementById('moods'), ltag = document.getElementById('ltag'), ncard = document.querySelector('#lighting-note .card'), lnote = document.querySelector('.lnote');
let NG = null;
try {
  if (!window.THREE) throw new Error('no three');
  const T = THREE, c = document.getElementById('gl3');
  const R = new T.WebGLRenderer({ canvas: c, antialias: false }); R.setPixelRatio(Math.min(devicePixelRatio, 2));
  const tex = new T.Texture(); tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
  const im = new Image(); im.onload = () => { tex.image = im; tex.needsUpdate = true; }; im.src = IMG('eclisse');
  const V3 = (x, y, z) => new T.Vector3(x, y, z), m0 = MOODS.evening.u;
  const U = { tex: { value: tex }, ceil: { value: m0[0] }, amb: { value: m0[1] }, lamp: { value: m0[2] }, tight: { value: m0[3] }, spill: { value: m0[4] }, ambT: { value: V3(m0[5], m0[6], m0[7]) }, lampT: { value: V3(m0[8], m0[9], m0[10]) } };
  const mat = new T.ShaderMaterial({ uniforms: U, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `precision highp float; uniform sampler2D tex; uniform float ceil, amb, lamp, tight, spill; uniform vec3 ambT, lampT; varying vec2 vUv;
void main() {
  vec2 p = vec2(vUv.x, 1. - vUv.y); vec3 c = texture2D(tex, vUv).rgb;
  vec3 f = pow(c, vec3(.7)) * 1.03; float Lf = dot(f, vec3(.299, .587, .114)); f = mix(vec3(Lf), f, .72) * vec3(.98, 1., 1.02); f += (1. - smoothstep(0., .55, p.y)) * .07;
  float below = smoothstep(.35, .40, p.y);
  float w = (.07 + max(p.y - .37, 0.) * .62) * tight;
  float cone = below * exp(-pow((p.x - .495) / w, 2.) * 1.6) * (1. - smoothstep(.80, .97, p.y));
  vec2 q = (p - vec2(.5, .67)) / (vec2(.34, .17) * tight); float pool = exp(-dot(q, q) * 1.6);
  vec2 h = (p - vec2(.495, .33)) / vec2(.26, .2); float halo = exp(-dot(h, h) * 2.2);
  float L = max(pool, cone * .85) + spill * halo;
  vec3 n = c * (ambT * amb + lampT * lamp * L) * 1.15;
  vec2 bq = (p - vec2(.495, .345)) / vec2(.05, .025); n += lampT * lamp * exp(-dot(bq, bq)) * .35;
  n = n / (1. + n * .25) * 1.2;
  gl_FragColor = vec4(mix(n, f, ceil), 1.);
}` });
  const sc = new T.Scene(); sc.add(new T.Mesh(new T.PlaneGeometry(2, 2), mat)); const cam = new T.Camera();
  NG = { R, sc, cam, U, c, target: MOODS.evening.u.slice() };
  NG.cur = MOODS.evening.u.slice();
  const sz = () => R.setSize(c.clientWidth, c.clientHeight, false); sz(); addEventListener('resize', sz);
  const keys = ['ceil', 'amb', 'gain', 'rad', 'warm'];
  (function tick() { const r = c.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) { NG.cur = NG.cur.map((v, i) => lerp(v, NG.target[i], reduce ? 1 : 0.07)); const u = NG.cur; U.ceil.value = u[0]; U.amb.value = u[1]; U.lamp.value = u[2]; U.tight.value = u[3]; U.spill.value = u[4]; U.ambT.value.set(u[5], u[6], u[7]); U.lampT.value.set(u[8], u[9], u[10]); R.render(sc, cam); }
    requestAnimationFrame(tick); })();
} catch (e) { lnote.classList.add('nogl'); NG = null; }
function setMood(m) { const o = MOODS[m]; if (NG) NG.target = o.u.slice();
  moods.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
  ltag.textContent = o.tag; document.getElementById('mcap').textContent = o.cap;
  ncard.classList.add('swap'); setTimeout(() => { document.getElementById('nfor').textContent = o.for; ['lamp', 'shade', 'bulb', 'dim', 'shadow', 'foot'].forEach(k => { document.getElementById('n' + k).textContent = o[k]; }); ncard.classList.remove('swap'); }, 220); }
moods.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setMood(b.dataset.m); });

/* 3. The collection: price and colours on each piece */
const C = {
  eclisse: { name: 'Eclisse', piece: 'Eclisse loveseat', what: 'A loveseat and an arc lamp', price: 'From $6,400', mean: 'eclipse, in Italian', img: 'eclisse', pos: 'center 55%', mat: 'velvet',
    short: 'Wool velvet on a hardwood frame. The shade hangs above the seat.', lead: 'A wool velvet loveseat and the arc lamp that hangs over it. The shade hides the bulb, so only the seat is lit.',
    sw: [['Oliva', '#7E7C55', 'as photographed'], ['Petrolio', '#1F4A4E'], ['Ardesia', '#6F869C'], ['Paglia', '#E2CF9A']],
    noteText: 'Arc lamp to the left, shade above the seat. 2700 K bulb, dimmed to 40%. The shadow falls back and to the right.',
    pieces: [['eclisse-loveseat', 'Eclisse loveseat', 'Edition I of XII', 'eclisse', 'center 72%'], [null, 'Eclisse arc lamp', 'Ships with the loveseat', 'eclisse', 'center 18%']], next: 'volta' },
  volta: { name: 'Volta', piece: 'Volta sofa', what: 'A sofa and a floor lamp', price: 'From $9,200', mean: 'vault, in Italian', img: 'volta', pos: 'right center', mat: 'leather',
    short: 'Leather on a hardwood frame, under an arched lamp that lights the cushions.', lead: 'A leather sofa under an arched floor lamp. The arc vaults over the seat and puts the light on the cushions, not the room.',
    sw: [['Cognac', '#8A5A3C', 'as photographed'], ['Nero', '#2A2521'], ['Oliva', '#7E7C55'], ['Paglia', '#E2CF9A']],
    noteText: 'The arc over the seat, the light on the cushions. 2400 K bulb, dimmed to 50%.',
    pieces: [[null, 'Volta sofa', 'Edition I of XII', 'volta', '70% 70%'], [null, 'Volta floor lamp', 'Ships with the sofa', 'volta', '45% 20%']], next: 'ombra' },
  ombra: { name: 'Ombra', piece: 'Ombra side table', what: 'A side table and a table lamp', price: 'From $2,100', mean: 'shade, in Italian', img: 'ombra', pos: '35% center', mat: 'finish',
    short: 'A walnut side table with two fluted drawers, and the pleated lamp that sits on it.', lead: 'A walnut side table with an open shelf and two fluted drawers, and the pleated lamp made for its top. The shade turns the bulb into a low pool of light across the table and the bed beside it.',
    sw: [['Walnut', '#7A5234', 'as photographed'], ['Nero', '#2A2521'], ['Pergamena', '#F2EDE3'], ['Petrolio', '#1F4A4E']],
    noteText: 'The lamp on the table, a low pool of light across its top and the bed beside it. 3000 K bulb, dimmed to 30%.',
    pieces: [[null, 'Ombra side table', 'Edition I of XII', 'ombra', '42% 85%'], [null, 'Ombra table lamp', 'Ships with the table', 'ombra', '43% 45%']], next: 'eclisse' }
};
const chosen = { eclisse: 0, volta: 0, ombra: 0 };
const swHTML = k => `<div class="sw" role="group" aria-label="${C[k].name} colours">${C[k].sw.map((c, i) => `<button type="button" style="--c:${c[1]}" data-k="${k}" data-i="${i}" aria-pressed="${i === chosen[k]}" aria-label="${c[0]}"></button>`).join('')}<span class="swl">${swLabel(k)}</span></div>`;
function swLabel(k) { const c = C[k].sw[chosen[k]]; return c[0] + ' ' + C[k].mat + (c[2] ? ', ' + c[2] : ''); }
document.getElementById('trio').innerHTML = Object.keys(C).map(k => { const c = C[k]; return `<article class="pc">
  <a class="ph" href="#${k}"><img data-rec="${k}" src="${IMG(c.img)}" alt="The ${c.name} collection: ${c.what.toLowerCase()}" style="object-position:${c.pos}"></a>
  <div class="row1"><h3><a href="#${k}">${c.name}</a></h3><span class="price">${c.price}</span></div>
  <p class="what">${c.what}</p>${swHTML(k)}
  <a class="more" href="#${k}">See ${c.name}</a></article>`; }).join('');
document.addEventListener('click', e => { const b = e.target.closest('.sw button[data-k]'); if (!b) return; const k = b.dataset.k; chosen[k] = +b.dataset.i;
  document.querySelectorAll(`.sw button[data-k="${k}"]`).forEach(x => x.setAttribute('aria-pressed', +x.dataset.i === chosen[k]));
  document.querySelectorAll(`.sw button[data-k="${k}"]`).forEach(x => { const l = x.parentElement.querySelector('.swl'); if (l) l.textContent = swLabel(k); }); applyRec(k); });
/* Recolour the product in its photograph: a mask marks the cover (or the wood), and the new colour keeps the photo's own light and shade. */
const MASK = { eclisse: 'cm1', volta: 'cm2', ombra: 'cm3' }, recCache = {}, prep = {};
const loadImg = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
async function prepare(k) {
  if (prep[k]) return prep[k];
  const [im, mk] = await Promise.all([loadImg(IMG(C[k].img)), loadImg(IMG(MASK[k]))]);
  const sc = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * sc), h = Math.round(im.naturalHeight * sc);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(im, 0, 0, w, h); const orig = x.getImageData(0, 0, w, h); x.clearRect(0, 0, w, h); x.drawImage(mk, 0, 0, w, h); const md = x.getImageData(0, 0, w, h).data;
  let sum = 0, n = 0; const d = orig.data; for (let i = 0; i < md.length; i += 4) if (md[i] > 128) { sum += .299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]; n++; }
  return prep[k] = { c, x, w, h, orig, md, lmean: sum / Math.max(1, n) };
}
async function recolor(k, idx) {
  if (idx === 0) return IMG(C[k].img);
  const key = k + idx; if (recCache[key]) return recCache[key];
  const P = await prepare(k), hex = C[k].sw[idx][1], t = [1, 3, 5].map(j => parseInt(hex.substr(j, 2), 16));
  const tl = .299 * t[0] + .587 * t[1] + .114 * t[2], g = tl > 200 ? .55 : tl < 60 ? 1.05 : .85;
  const out = P.x.createImageData(P.w, P.h), o = out.data, d = P.orig.data, md = P.md;
  for (let j = 0; j < d.length; j += 4) {
    const a = md[j] / 255; o[j + 3] = 255;
    if (a <= 0.01) { o[j] = d[j]; o[j + 1] = d[j + 1]; o[j + 2] = d[j + 2]; continue; }
    const L = .299 * d[j] + .587 * d[j + 1] + .114 * d[j + 2], r = L / P.lmean, sh = Math.pow(r, g), spec = Math.max(0, r - 1.15) * 40;
    for (let c = 0; c < 3; c++) o[j + c] = Math.round(d[j + c] * (1 - a) + Math.min(255, t[c] * sh + spec) * a);
  }
  P.x.putImageData(out, 0, 0); return recCache[key] = P.c.toDataURL('image/jpeg', .9);
}
function applyRec(k) { recolor(k, chosen[k]).then(url => document.querySelectorAll(`img[data-rec="${k}"]`).forEach(im => { if (im.src === url) return; im.style.transition = 'opacity .25s'; im.style.opacity = .35; setTimeout(() => { im.onload = () => { im.style.opacity = 1; }; im.src = url; }, 180); })); }

/* About: the atelier. Every photograph, filtered by craft */
const ATL = [{"k": "at1", "cat": "wood", "alt": "A carpenter at work in his workshop in Dar es Salaam", "by": "Ali Mkumbwa", "top": 1}, {"k": "at8", "cat": "leather", "alt": "Cutting a hide with a knife along the pattern", "by": "g ghz", "top": 1}, {"k": "at11", "cat": "light", "alt": "A turned lamp base in a lamp studio", "by": "Hayffield L", "top": 1}, {"k": "at5", "cat": "cover", "alt": "A tailor at a treadle sewing machine in Dar es Salaam", "by": "Ali Mkumbwa", "top": 1}, {"k": "at10", "cat": "light", "alt": "Welding the rings of a lampshade frame", "by": "卡秀 玛", "top": 1}, {"k": "at14", "cat": "draw", "alt": "Marking a line before the cut", "by": "Craft Kitties", "top": 1}, {"k": "at2", "cat": "wood", "alt": "Chisel and mallet", "by": "Vatsal Tyagi", "top": 0}, {"k": "at3", "cat": "wood", "alt": "Wiping a finish into the grain", "by": "Paulina Herpel", "top": 0}, {"k": "at4", "cat": "wood", "alt": "Planing by hand", "by": "Minh Đức", "top": 0}, {"k": "at6", "cat": "cover", "alt": "Cutting cloth with shears", "by": "SIL Group (pepperlee.co.uk)", "top": 0}, {"k": "at7", "cat": "leather", "alt": "Tracing a paper pattern onto leather", "by": "Cohen Berg", "top": 0}, {"k": "at9", "cat": "leather", "alt": "A craftsman cutting leather with scissors", "by": "Valentina Schick", "top": 0}, {"k": "at12", "cat": "light", "alt": "A workbench of handmade lamps", "by": "Hayffield L", "top": 0}, {"k": "at13", "cat": "draw", "alt": "A sketchbook of furniture studies", "by": "pure julia", "top": 0}, {"k": "at15", "cat": "draw", "alt": "Sketching an idea in pen", "by": "Kaizen Nguyễn", "top": 0}];
const CATS = {"wood": "Wood", "cover": "Fabric", "leather": "Leather", "light": "Metal and lamps", "draw": "Drawing"};
const agal = document.getElementById('agal'), afil = document.getElementById('afilters');
agal.innerHTML = ATL.map(a => `<figure data-cat="${a.cat}"><img src="${IMG(a.k)}" alt="${a.alt}"><figcaption><b>${CATS[a.cat]}</b> ${a.alt}</figcaption></figure>`).join('');
const acount = c => ATL.filter(a => c === 'all' || a.cat === c).length;
afil.innerHTML = [['all', 'All'], ...Object.entries(CATS)].map(([k, n]) => `<button type="button" data-f="${k}" aria-pressed="${k === 'all'}">${n}<small>${acount(k)}</small></button>`).join('');
afil.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const c = b.dataset.f;
  afil.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  agal.querySelectorAll('figure').forEach(f => f.classList.toggle('off', c !== 'all' && f.dataset.cat !== c)); });
document.getElementById('acredit').textContent = 'Reference photographs from Unsplash, used under the Unsplash License: ' + [...new Set(ATL.map(a => a.by))].join(', ') + '. They show the kind of work done in the atelier; the people in them are not NERO staff.';

/* The whole collection: every piece, filtered by the room it belongs to */
const KINDS = { sofa: 'Sofas and loveseats', chair: 'Armchairs', bed: 'Beds', table: 'Tables', store: 'Sideboards and cabinets', lamp: 'Lamps' };
const PIECES = [
  { id: 'eclisse', link: 'eclisse', name: 'Eclisse', kind: 'sofa', img: 'eclisse', pos: 'center 60%', price: 'From $6,400', line: 'A wool velvet loveseat under its arc lamp.' },
  { id: 'volta', link: 'volta', name: 'Volta', kind: 'sofa', img: 'volta', pos: 'right center', price: 'From $9,200', line: 'A leather sofa under an arched floor lamp.' },
  { id: 'p-prato', name: 'Prato', mean: 'meadow, in Italian', kind: 'sofa', img: 'pr1', pos: 'center 55%', price: 'From $5,200', line: 'A two-seat loveseat on a slender hardwood frame.',
    lead: 'A two-seat loveseat with a slender hardwood frame and buttoned velvet cushions, low enough to sit with your feet flat and your back held. Its lamp stands behind the arm and lights the seat from over the shoulder.',
    sw: [['Oliva velvet', '#7E7C55', 'as photographed'], ['Petrolio velvet', '#1F4A4E'], ['Paglia linen', '#E2CF9A'], ['Nero velvet', '#2A2521']], lamp: 'The Prato floor lamp, standing behind the left arm', note: '2700 K at 45%. Lamp behind the left arm; light falls across the seat and onto the floor in front.' },
  { id: 'p-conca', name: 'Conca', mean: 'shell, in Italian', kind: 'chair', img: 'pr2', pos: 'center 55%', price: 'From $3,400', line: 'A shell armchair that wraps around you.',
    lead: 'A shell armchair, upholstered all over in a soft woven wool, that closes around the shoulders like the inside of a shell. It comes with a globe floor lamp set just behind it for reading.',
    sw: [['Sage wool', '#8E9468', 'as photographed'], ['Oliva', '#7E7C55'], ['Ardesia', '#6F869C'], ['Pergamena', '#F2EDE3']], lamp: 'The Conca globe floor lamp, set behind the chair', note: '2700 K at 55%. Globe just behind the right shoulder; soft light on the lap.' },
  { id: 'p-sella', name: 'Sella', mean: 'saddle, in Italian', kind: 'chair', img: 'pr3', pos: 'center 60%', price: 'From $3,900', line: 'A saddle-leather lounge chair on bent wood arms.',
    lead: 'A deep lounge chair in saddle leather slung between two bent wooden arms. Its lamp is a tall cone that leans over the seat, so the leather glows and the wall behind stays dark.',
    sw: [['Cognac leather', '#8A5A3C', 'as photographed'], ['Nero leather', '#2A2521'], ['Oliva leather', '#7E7C55'], ['Paglia leather', '#E2CF9A']], lamp: 'The Sella cone lamp, leaning over the seat', note: '2400 K at 40%. Cone above and in front; light on the leather, the wall behind left dark.' },
  { id: 'p-riva', name: 'Riva', mean: 'shore, in Italian', kind: 'bed', img: 'pr4', pos: 'center 60%', price: 'From $7,800', line: 'A bed with a wide hardwood headboard and its pendant.',
    lead: 'A low bed with a wide hardwood headboard that runs past the mattress to hold a book, a glass and a pendant above each side. The pendants hang low so the light stays on the pillow and off the ceiling.',
    sw: [['Natural wood', '#9A6A45', 'as photographed'], ['Nero', '#2A2521'], ['Pergamena', '#F2EDE3'], ['Petrolio', '#1F4A4E']], lamp: 'Two Riva pendants, one each side of the bed', note: '2400 K at 30%. Pendants 45 cm above the pillow, one per side.' },
  { id: 'p-salvia', name: 'Salvia', mean: 'sage, in Italian', kind: 'bed', img: 'pr5', pos: 'center 55%', price: 'From $6,900', line: 'A quiet bed against a panelled wall, with a woven lamp.',
    lead: 'A quiet bed made to sit against panelling, with a soft upholstered headboard and a bedside table at the same height as the mattress. Its lamp has a woven shade that throws a warm, even pool.',
    sw: [['Sage', '#9AA98E', 'as photographed'], ['Oliva', '#7E7C55'], ['Pergamena', '#F2EDE3'], ['Ardesia', '#6F869C']], lamp: 'The Salvia bedside lamp with a woven shade', note: '2700 K at 35%. On the bedside table, shade just above eye level when sitting up.' },
  { id: 'ombra', link: 'ombra', name: 'Ombra', kind: 'table', img: 'ombra', pos: '35% center', price: 'From $2,100', line: 'A walnut side table with its pleated lamp.' },
  { id: 'p-isola', name: 'Isola', mean: 'island, in Italian', kind: 'table', img: 'pr6', pos: 'center 60%', price: 'From $2,800', line: 'A low oval coffee table in oak on a dark base.',
    lead: 'A low oval coffee table, an island of oak floating on a dark base set well back from the edge, so feet and knees never meet it. Made to sit in the middle of a room lit by its sofa lamps.',
    sw: [['Natural oak', '#B88A5A', 'as photographed'], ['Nero', '#2A2521'], ['Pergamena', '#F2EDE3']], lamp: 'Lit by the lamps of the seats around it', note: 'No lamp of its own. Place it inside the pools of the sofa and chair lamps.' },
  { id: 'p-tamburo', name: 'Tamburo', mean: 'drum, in Italian', kind: 'table', img: 'pr7', pos: 'center 55%', price: 'From $3,100', line: 'A bronze drum table with a glass top.',
    lead: 'A round drum in patinated bronze under a clear glass top, so the metal catches whatever lamp is nearest and glows in the evening.',
    sw: [['Bronze', '#8A6A3A', 'as photographed'], ['Nero', '#2A2521'], ['Paglia brass', '#E2CF9A']], lamp: 'Lit by the lamps around it', note: 'No lamp of its own. Keep it within 1.5 m of a warm lamp so the bronze glows.' },
  { id: 'p-canneto', name: 'Canneto', mean: 'reed bed, in Italian', kind: 'store', img: 'pr8', pos: 'center 55%', price: 'From $4,600', line: 'A fluted oak sideboard with a mushroom lamp.',
    lead: 'A long sideboard in fluted oak, the reeds catching side light from its own mushroom lamp, with soft-close doors and adjustable shelves behind.',
    sw: [['Natural oak', '#B88A5A', 'as photographed'], ['Nero', '#2A2521'], ['Petrolio', '#1F4A4E']], lamp: 'The Canneto mushroom lamp, at one end of the top', note: '2700 K at 50%. Lamp at the left end; light rakes along the fluting.' },
  { id: 'p-noce', name: 'Noce', mean: 'walnut, in Italian', kind: 'store', img: 'pr9', pos: 'center 60%', price: 'From $3,700', line: 'A walnut cabinet with drawers and a brass lamp.',
    lead: 'A mid-century cabinet in walnut, with three drawers between two doors and a small brass lamp made for its top.',
    sw: [['Walnut', '#7A5234', 'as photographed'], ['Nero', '#2A2521'], ['Pergamena', '#F2EDE3']], lamp: 'The Noce brass table lamp', note: '2700 K at 45%. Lamp at the right end of the top.' },
  { id: 'p-lume', name: 'Lume', mean: 'a small light, in Italian', kind: 'lamp', img: 'pr10', pos: 'center 45%', price: 'From $890', line: 'A ceramic table lamp with a parchment shade.',
    lead: 'A dark glazed ceramic body under a parchment shade, sold on its own for the corners of a room that need a low, warm light.',
    sw: [['Nero glaze', '#2A2521', 'as photographed'], ['Oliva glaze', '#7E7C55'], ['Pergamena glaze', '#F2EDE3']], lamp: 'It is the lamp', note: '2400 K at 40%. Shade at eye level when seated.' }
];
const PBY = {}; PIECES.forEach(p => { if (!p.link) PBY[p.id] = p; });
const pcgrid = document.getElementById('pcgrid'), pcfil = document.getElementById('pcfil');
pcgrid.innerHTML = PIECES.map(p => `<a class="pcard" href="#${p.link || p.id}" data-kind="${p.kind}"><div class="ph"><img src="${IMG(p.img)}" alt="${p.name}: ${p.line}" style="object-position:${p.pos}"></div><span class="k">${KINDS[p.kind]}</span><div class="r1"><h3>${p.name}</h3><span class="pr">${p.price}</span></div><p>${p.line}</p></a>`).join('');
const kcount = k => PIECES.filter(p => k === 'all' || p.kind === k).length;
pcfil.innerHTML = [['all', 'All'], ...Object.entries(KINDS)].map(([k, n]) => `<button type="button" data-f="${k}" aria-pressed="${k === 'all'}">${n}<small>${kcount(k)}</small></button>`).join('');
pcfil.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.f;
  pcfil.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  pcgrid.querySelectorAll('.pcard').forEach(c => c.classList.toggle('off', k !== 'all' && c.dataset.kind !== k)); });
document.getElementById('pccredit').textContent = 'Concept prices. Photographs from Unsplash, used under the Unsplash License, including Yi Wei, Duyet Le, Apekshit Srivastava, Jazmin Wong, Raelle Cameron, Caroline Badran, aurélie sgnl, Imani Bahati, Samuell Morgenstern and Monty Allen. They show the kind of piece each name stands for.';
const pchosen = {};
function pieceHTML(p) {
  const i = pchosen[p.id] || 0;
  return `${pbar('#pieces', 'The whole collection')}<div class="in pview"><div class="chero"><div><p class="kicker">${KINDS[p.kind]} · Collection MMXXVI</p><h1>${p.name}</h1><p class="mean">${p.mean}</p><p class="lead">${p.lead}</p>
  <dl class="facts"><dt>Price</dt><dd>${p.price}${p.kind === 'lamp' || p.kind === 'table' ? '' : ', with its lamp'}</dd><dt>Colours</dt><dd><div class="sw" role="group" aria-label="${p.name} colours">${p.sw.map((c, j) => `<button type="button" style="--c:${c[1]}" data-pid="${p.id}" data-i="${j}" aria-pressed="${j === i}" aria-label="${c[0]}"></button>`).join('')}<span class="swl">${p.sw[i][0]}${p.sw[i][2] ? ', ' + p.sw[i][2] : ', made to order'}</span></div></dd><dt>Its lamp</dt><dd>${p.lamp}</dd><dt>Its note</dt><dd>${p.note}</dd></dl>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:28px"><a class="pill lit" href="#visit" data-piece="${p.name}" data-msg="I would like to know more about ${p.name} (${KINDS[p.kind].toLowerCase()}) in ${p.sw[i][0]}.">Ask about ${p.name}</a><a class="pill" href="#pieces">See more pieces</a></div></div>
  <div class="ph"><img alt="${p.name}: ${p.line}" src="${IMG(p.img)}" style="object-position:${p.pos}"></div></div></div>${bandHTML()}`;
}
document.addEventListener('click', e => { const b = e.target.closest('.sw button[data-pid]'); if (!b) return; const p = PBY[b.dataset.pid], i = +b.dataset.i; pchosen[p.id] = i;
  b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  b.parentElement.querySelector('.swl').textContent = p.sw[i][0] + (p.sw[i][2] ? ', ' + p.sw[i][2] : ', made to order');
  const ask = panel.querySelector('[data-piece="' + p.name + '"]'); if (ask) ask.dataset.msg = `I would like to know more about ${p.name} (${KINDS[p.kind].toLowerCase()}) in ${p.sw[i][0]}.`; });

/* Images inserted later (panels) get their source here */
function fillImgs() { document.querySelectorAll('img[data-img]:not([src])').forEach(el => { el.src = IMG(el.dataset.img); }); }

/* Navigation: highlight the page you are on; a menu on phones */
const menu = document.getElementById('menu');
function closeMenu() { top.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
menu.addEventListener('click', () => { const o = !top.classList.contains('open'); top.classList.toggle('open', o); menu.setAttribute('aria-expanded', String(o)); });
function setNav(h) { const key = h === 'about' || h === 'team' ? 'about' : h === 'showroom' ? 'showroom' : (C[h] || PBY[h] || h === 'eclisse-loveseat' || h === 'collection' || h === 'pieces') ? 'collection' : null;
  if (key || document.body.classList.contains('away')) navs.forEach(a => a.setAttribute('aria-current', a.dataset.nav === key)); }

/* Chips: one choice per group, or several where marked "multi" */
document.addEventListener('click', e => { const b = e.target.closest('.chips button, .seg button'); if (!b) return;
  const g = b.parentElement; if (g.classList.contains('multi')) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  else g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
const pick = sel => { const b = document.querySelector(sel + ' [aria-pressed="true"]'); return b ? b.dataset.v : null; };

/* The booking form */
function setPieces(list) { document.querySelectorAll('#bkpieces button').forEach(b => b.setAttribute('aria-pressed', String(list.includes(b.dataset.v)))); }
document.addEventListener('click', e => { const a = e.target.closest('[data-piece]'); if (!a) return;
  setPieces([a.dataset.piece === 'Trade programme' ? 'A project' : a.dataset.piece]);
  const msg = document.getElementById('cmsg');
  if (a.dataset.msg) msg.value = a.dataset.msg; else if (a.dataset.k) msg.value = 'I would like to know more about ' + C[a.dataset.k].name + ' in ' + swLabel(a.dataset.k).replace(', as photographed', '') + '.'; });
document.getElementById('contact').addEventListener('submit', e => { e.preventDefault();
  const n = document.getElementById('cname').value.trim(), m = document.getElementById('cmail').value.trim(), ok = document.getElementById('cok');
  if (!n || !m.includes('@')) { ok.textContent = 'Add your name and an email address so we can reply.'; return; }
  const pieces = [...document.querySelectorAll('#bkpieces [aria-pressed="true"]')].map(b => b.dataset.v), when = pick('#bktime') || 'Evening', day = document.getElementById('cdate').value;
  ok.innerHTML = `<span class="bkdone"><b>Thank you, ${n.split(' ')[0].replace(/[<>&]/g, '')}.</b><span>${pieces.length ? pieces.join(', ') : 'The showroom'} · ${when}${day ? ' · ' + day : ''}</span><span class="cap" style="margin:0">In this concept site nothing is sent.</span></span>`; });
document.addEventListener('submit', e => { const f = e.target.closest('form.news'); if (!f) return; e.preventDefault(); const m = f.querySelector('input').value.trim();
  f.parentElement.querySelector('.nok').textContent = m.includes('@') ? 'Noted. In this concept site nothing is sent.' : 'Add an email address.'; });
const FOOT = document.querySelector('footer').outerHTML;
document.querySelectorAll('.pagefoot').forEach(x => { x.outerHTML = FOOT; });
document.querySelectorAll('.pageband').forEach(x => { x.outerHTML = document.querySelector('.vband').outerHTML.replace('class="vband"', 'class="vband inpage"'); });

/* Pages: collection and product panels, and the About page */
const panel = document.getElementById('panel'), page = document.getElementById('aboutpage'), bookpage = document.getElementById('bookpage'), showpage = document.getElementById('showpage'), piecespage = document.getElementById('piecespage');
const pbar = (back, label) => `<div class="in"><a class="back" href="${back}">&larr; ${label}</a></div>`;
const bandHTML = () => document.querySelector('.vband').outerHTML.replace('class="vband"', 'class="vband inpage"') + FOOT;
function colHTML(k) { const c = C[k];
  const piece = q => { const inner = `<div class="ph"><img alt="${q[1]}" src="${IMG(q[3])}" style="object-position:${q[4]}"></div><div class="row"><h3>${q[1]}</h3><span>${q[2]}</span></div>`; return q[0] ? `<a class="piece" href="#${q[0]}">${inner}</a>` : `<div class="piece">${inner}</div>`; };
  return `${pbar('#pieces', 'The whole collection')}<div class="in"><div class="chero"><div><p class="kicker">Collection, MMXXVI · ${c.what}</p><h1>${c.name}</h1><p class="mean">${c.mean}</p><p class="lead">${c.lead}</p>
  <dl class="facts"><dt>Price</dt><dd>${c.price}, with its lamp</dd><dt>Colours</dt><dd>${swHTML(k)}</dd><dt>Its note</dt><dd>${c.noteText}</dd></dl>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:28px"><a class="pill lit" href="#visit" data-piece="${c.name}" data-k="${k}">Ask about ${c.name}</a></div></div>
  <div class="ph"><img data-rec="${k}" alt="The ${c.name} collection with its lamp on" src="${IMG(c.img)}" style="object-position:${c.pos}"></div></div>
  <div class="pieces">${c.pieces.map(piece).join('')}</div>
  <div class="nextc"><span class="cap" style="margin:0">Next collection</span><a href="#${c.next}">${C[c.next].name}</a></div></div>${bandHTML()}`; }
const shots = [['eclisse', 'center 70%', 'The loveseat'], ['eclisse', 'center 20%', 'The lamp'], ['olive', 'center 50%', 'In an olive room']];
function prodHTML() {
  return `${pbar('#eclisse', 'The Eclisse collection')}<div class="in"><div class="prod"><div class="gal"><div class="main"><img id="mainshot" data-rec="eclisse" alt="The Eclisse loveseat" src="${IMG('eclisse')}" style="object-position:center 70%"></div>
   <div class="thumbs">${shots.map((s, i) => `<button type="button" aria-pressed="${i === 0}" data-i="${i}" aria-label="${s[2]}"><img alt="" src="${IMG(s[0])}" style="object-position:${s[1]}"></button>`).join('')}</div></div>
  <div class="buy"><p class="kicker">Eclisse collection</p><h1>Eclisse loveseat</h1><p class="cap" style="margin:0">Edition I of XII. Designed in Kigali.</p>
   <dl class="facts"><dt>Price</dt><dd>${C.eclisse.price}, with its arc lamp</dd><dt>Colours</dt><dd>${swHTML('eclisse')}</dd><dt>Cover</dt><dd>Wool velvet, or a fabric of your choice</dd><dt>Frame</dt><dd>Hardwood, oiled by hand</dd><dt>Ships with</dt><dd>The Eclisse arc lamp and its lighting note</dd><dt>The note</dt><dd>${C.eclisse.noteText}</dd></dl>
   <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="pill lit" href="#visit" data-piece="Eclisse" data-k="eclisse">Request this piece</a><a class="pill" href="#lighting-note">Read its lighting note</a></div></div></div></div>${bandHTML()}`; }
let last = { x: innerWidth / 2, y: innerHeight / 2 };
document.addEventListener('click', e => { last = { x: e.clientX, y: e.clientY }; }, true);
const lock = on => { if (lenis) on ? lenis.stop() : lenis.start(); root.style.overflow = on ? 'hidden' : ''; document.body.classList.toggle('away', on); };
let panelTok = 0;
function route() {
  const h = location.hash.slice(1);
  const pageIds = { about: 'story', team: 'team' };
  setNav(h); closeMenu();
  if (C[h] || h === 'eclisse-loveseat' || PBY[h]) {
    panel.style.setProperty('--ox', last.x + 'px'); panel.style.setProperty('--oy', last.y + 'px');
    page.hidden = true; bookpage.hidden = true; showpage.hidden = true; piecespage.hidden = true; fillImgs(panel.innerHTML = C[h] ? colHTML(h) : PBY[h] ? pieceHTML(PBY[h]) : prodHTML()); panel.scrollTop = 0; if (chosen[C[h] ? h : 'eclisse']) applyRec(C[h] ? h : 'eclisse'); panel.setAttribute('aria-label', C[h] ? C[h].name : PBY[h] ? PBY[h].name : 'Eclisse loveseat');
    const tok = ++panelTok; setTimeout(() => { if (tok === panelTok) panel.classList.add('open'); }, 20); lock(true);
    panel.querySelectorAll('.thumbs button').forEach(b => b.onclick = () => { const s = shots[+b.dataset.i]; const m = document.getElementById('mainshot'); m.src = IMG(s[0]); m.style.objectPosition = s[1];
      panel.querySelectorAll('.thumbs button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    return;
  }
  panelTok++; panel.classList.remove('open');
  if (h === 'pieces') { page.hidden = true; bookpage.hidden = true; showpage.hidden = true; const was = piecespage.hidden; piecespage.hidden = false; lock(true); if (was) piecespage.scrollTop = 0; return; }
  piecespage.hidden = true;
  if (h === 'showroom') { page.hidden = true; bookpage.hidden = true; const was = showpage.hidden; showpage.hidden = false; lock(true); if (was) showpage.scrollTop = 0; return; }
  showpage.hidden = true;
  if (h === 'visit') { page.hidden = true; const was = bookpage.hidden; bookpage.hidden = false; lock(true); if (was) bookpage.scrollTop = 0; return; }
  bookpage.hidden = true;
  if (pageIds[h]) {
    const wasHidden = page.hidden; page.hidden = false; lock(true);
    const target = document.getElementById(pageIds[h]);
    requestAnimationFrame(() => { if (h === 'about') page.scrollTop = 0; else page.scrollTo({ top: target.offsetTop - 80, behavior: wasHidden || reduce ? 'auto' : 'smooth' }); });
    return;
  }
  page.hidden = true; lock(false);
  const el = h && document.getElementById(h);
  const go = () => { if (h === 'home' || !el) { if (h === 'home') { if (lenis) lenis.scrollTo(0); else scrollTo(0, 0); } return; } if (lenis) lenis.scrollTo(el, { offset: h === 'making' ? 0 : -76 }); else el.scrollIntoView(); };
  setTimeout(go, 60);
}
addEventListener('hashchange', route); if (location.hash) route();
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (panel.classList.contains('open')) location.hash = 'pieces'; else if (!page.hidden || !bookpage.hidden || !showpage.hidden || !piecespage.hidden) location.hash = 'home'; });
})();
