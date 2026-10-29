import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { L, langHooks } from '../core/i18n.js';
import { createStage } from '../models/stage.js';
import { buildConcept, RANGES, BUILD_KEYS, POSE_KEYS } from '../models/concept.js';
import { planDemo } from '../models/motion.js';
import { makeZones } from '../models/zones.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport');
const status = $('status');
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function updateViewerLabel() { viewport.setAttribute('aria-label', L('3Dモデル。矢印キーで回転、プラスとマイナスキーで拡大縮小', '3D model. Use arrow keys to orbit and plus and minus to zoom')); }
langHooks.push(updateViewerLabel);
updateViewerLabel();
const conceptStatus = () => L('検討用モデルを表示中。実機の設計や競技規定を表すものではありません。', 'Showing a concept model. It does not represent a real robot or verified competition specifications.');
let statusText = conceptStatus;
function setStatus(text) { statusText = text; status.textContent = statusText(); }
langHooks.push(() => { status.textContent = statusText(); });

let stage;
try {
  stage = createStage(viewport);
} catch (error) {
  $('viewer-error').hidden = false;
  setStatus(() => L('3D表示を開始できませんでした。', 'The 3D viewer could not start.'));
}
if (stage) studio(stage);

function studio(stage) {
  const { scene, camera, controls } = stage;
  const ease = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

  /* ---------- state ---------- */
  const keys = [...BUILD_KEYS, ...POSE_KEYS];
  const defaults = { ...Object.fromEntries(keys.map(k => [k, RANGES[k][2]])), team: 'red', envelope: 0 };
  const storageKey = 'sakura-avenue-concept-v2';
  const inputs = Object.fromEntries(keys.map(k => [k, $(k)]));
  let state = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    for (const k of keys) {
      const value = Number(saved[k]);
      if (Number.isFinite(value) && value >= RANGES[k][0] && value <= RANGES[k][1]) state[k] = value;
    }
    if (saved.team === 'blue') state.team = 'blue';
    if ([700, 1000].includes(saved.envelope)) state.envelope = saved.envelope;
  } catch (_) {}
  const saveState = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {} };
  const pose = () => Object.fromEntries(POSE_KEYS.map(k => [k, state[k]]));
  const unit = { width: ' mm', depth: ' mm', lift: ' mm', reach: ' mm', yaw: '°', turn: '°', grip: '%' };
  function showValue(k, value) {
    inputs[k].value = value;
    inputs[k].style.setProperty('--fill', `${(value - RANGES[k][0]) / (RANGES[k][1] - RANGES[k][0]) * 100}%`);
    $(`${k}-value`).textContent = k === 'bottles' ? L(`${value}本`, String(value)) : `${Math.round(value)}${unit[k]}`;
  }
  function updateInputs() {
    for (const k of keys) showValue(k, state[k]);
    document.querySelectorAll('[data-team]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.team === state.team)));
    document.querySelectorAll('[data-envelope]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.envelope) === state.envelope)));
  }
  langHooks.push(updateInputs);

  /* ---------- models ---------- */
  let current = null, rig = null, zones = null, kind = 'concept';
  let mixer = null, clips = [], action = null, pendingLoad = 0;
  const loader = new GLTFLoader();
  const exporter = new GLTFExporter();
  const dispose = object => {
    const geometries = new Set(), materials = new Set(), textures = new Set(), bitmaps = new Set(), skeletons = new Set();
    object.traverse(item => {
      if (item.geometry) geometries.add(item.geometry);
      if (item.skeleton) skeletons.add(item.skeleton);
      for (const material of Array.isArray(item.material) ? item.material : [item.material]) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    for (const texture of textures) {
      const image = texture.source?.data;
      if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) bitmaps.add(image);
      texture.dispose();
    }
    for (const bitmap of bitmaps) bitmap.close();
    for (const material of materials) if (material !== ghost) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
  };
  function replaceModel(object) {
    if (current) { restoreMaterials(); scene.remove(current); dispose(current); }
    if (zones) { scene.remove(zones.group); dispose(zones.group); zones = null; }
    current = object;
    scene.add(current);
  }
  function buildModel() {
    stopDemo(false);
    const built = buildConcept({ width: state.width, depth: state.depth, bottles: state.bottles, team: state.team });
    replaceModel(built.object);
    rig = built.rig;
    rig.setPose(pose());
    zones = makeZones(rig.layout);
    scene.add(zones.group);
    // The long rails upset the blurred contact-shadow pass; they keep their key-light shadow.
    stage.shadowExclude = [envelope.group, zones.frames];
    applyHighlight();
    measure();
  }
  let rebuildQueued = false;
  function queueRebuild() {
    if (rebuildQueued) return;
    rebuildQueued = true;
    requestAnimationFrame(() => { rebuildQueued = false; if (kind === 'concept') buildModel(); });
  }

  /* ---------- size check against the 700 mm and 1000 mm cubes ---------- */
  const envelope = (() => {
    const group = new THREE.Group();
    group.name = 'Size limit';
    const faces = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 }));
    group.add(faces, edges);
    group.visible = false;
    scene.add(group);
    stage.shadowExclude = [group];
    return { group, faces, edges };
  })();
  const bounds = new THREE.Box3(), size = new THREE.Vector3(), centre = new THREE.Vector3();
  function measure() {
    if (!current) return;
    bounds.setFromObject(current, true);
    if (bounds.isEmpty()) return;
    bounds.getSize(size);
    bounds.getCenter(centre);
    const mm = [size.x, size.z, size.y].map(v => Math.round(v * 1000));
    $('dims').textContent = `${mm[0]} × ${mm[1]} × ${mm[2]} mm`;
    const largest = Math.max(...mm);
    for (const [id, limit] of [['fit-start', 700], ['fit-match', 1000]]) {
      const row = $(id), ok = largest <= limit;
      row.dataset.fit = ok ? 'yes' : 'no';
      row.querySelector('.fit-verdict').textContent = ok ? L('収まる', 'Fits') : L('はみ出す', 'Too big');
    }
    const s = state.envelope;
    envelope.group.visible = !!s;
    if (s) {
      const ok = largest <= s;
      const color = new THREE.Color(ok ? 0x1e8a4c : 0xd7263d);
      envelope.faces.material.color.copy(color);
      envelope.edges.material.color.copy(color);
      envelope.group.scale.setScalar(s / 1000);
      envelope.group.position.set(centre.x, bounds.min.y + s / 2000, centre.z);
    }
    stage.invalidate();
  }
  langHooks.push(measure);

  /* ---------- part focus ---------- */
  const ghost = new THREE.MeshStandardMaterial({ color: 0xe7e1dc, transparent: true, opacity: 0.12, depthWrite: false, roughness: 1, metalness: 0 });
  const originals = new WeakMap();
  let focusPart = null;
  function restoreMaterials() {
    current?.traverse(o => { const saved = originals.get(o); if (saved) { o.material = saved.material; o.castShadow = saved.cast; } });
  }
  function applyHighlight() {
    if (!current) return;
    current.traverse(o => {
      if (!o.isMesh) return;
      if (!originals.has(o)) originals.set(o, { material: o.material, cast: o.castShadow });
      const saved = originals.get(o), on = !focusPart || o.userData.part === focusPart;
      o.material = on ? saved.material : ghost;
      o.castShadow = on && saved.cast;
    });
    document.querySelectorAll('[data-part]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.part === focusPart)));
    stage.invalidate(true);
  }
  function focus(part) {
    focusPart = focusPart === part ? null : part;
    applyHighlight();
    if (!focusPart) { view('iso'); return; }
    const box = new THREE.Box3();
    current.traverse(o => { if (o.isMesh && o.userData.part === focusPart) box.expandByObject(o, false); });
    if (box.isEmpty()) return;
    const target = box.getCenter(new THREE.Vector3());
    const distance = THREE.MathUtils.clamp(box.getSize(new THREE.Vector3()).length() * 1.9, 0.55, 2.6);
    const direction = camera.position.clone().sub(controls.target).normalize();
    flyTo(target, target.clone().addScaledVector(direction, distance));
  }
  document.querySelectorAll('[data-part]').forEach(b => b.addEventListener('click', () => { if (kind === 'concept') focus(b.dataset.part); }));

  /* ---------- camera ---------- */
  let camTween = null, home = { target: new THREE.Vector3(0, 0.33, 0), radius: 0.62 };
  const VIEWS = { iso: [0.56, 0.4, 0.72], front: [0, 0.16, 1], side: [1, 0.16, 0], top: [0, 1, 0.0001] };
  function flyTo(target, position, duration = 0.8) {
    if (RM || !duration) {
      controls.target.copy(target);
      camera.position.copy(position);
      controls.update();
      camTween = null;
      stage.invalidate();
      return;
    }
    camTween = { t: 0, duration, fromTarget: controls.target.clone(), fromPos: camera.position.clone(), target, position };
  }
  function view(name, duration) {
    const fov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const fit = home.radius / Math.sin(Math.min(fov, fov * camera.aspect)) * 1.04;
    const direction = new THREE.Vector3(...VIEWS[name]).normalize();
    flyTo(home.target.clone(), home.target.clone().addScaledVector(direction, fit), duration);
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  }
  controls.addEventListener('start', () => { camTween = null; viewport.classList.add('used'); document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false')); });
  function fitView(duration = 0) {
    if (!current) return;
    const box = new THREE.Box3().setFromObject(current);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const extent = Math.max(sphere.radius, 0.05);
    home = { target: kind === 'concept' ? new THREE.Vector3(0, box.min.y + (box.max.y - box.min.y) * 0.44, 0) : sphere.center.clone(), radius: kind === 'concept' ? extent * 0.86 : extent };
    stage.setGround(box.min.y - extent * 0.002);
    controls.minDistance = extent * 0.3;
    controls.maxDistance = extent * 12;
    camera.near = Math.max(extent / 500, 0.001);
    camera.far = Math.max(extent * 60, 50);
    camera.updateProjectionMatrix();
    view('iso', duration);
  }
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => view(b.dataset.view)));
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
    event.preventDefault();
    camTween = null;
    viewport.classList.add('used');
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if (event.key === 'ArrowLeft') spherical.theta -= 0.15;
    if (event.key === 'ArrowRight') spherical.theta += 0.15;
    if (event.key === 'ArrowUp') spherical.phi -= 0.15;
    if (event.key === 'ArrowDown') spherical.phi += 0.15;
    if (event.key === '+' || event.key === '=') spherical.radius *= 0.85;
    if (event.key === '-') spherical.radius /= 0.85;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, 0.05, controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    camera.lookAt(controls.target);
    controls.update();
    stage.invalidate();
  });

  /* ---------- pose presets and the demo ---------- */
  let poseTween = null, demo = null, frameCount = 0;
  function presetPose(name) {
    const plan = planDemo(rig, pose(), 1);
    if (name === 'start') return { yaw: 90, lift: 540, reach: 0, grip: 0 };
    if (name === 'pick') return { yaw: plan.pick.yaw, lift: (rig.layout.seat + rig.layout.grab + rig.layout.drop) * 1000, reach: plan.pick.reach, grip: 38 };
    return { yaw: plan.place.yaw, lift: (rig.layout.grab + rig.layout.drop) * 1000 + 2, reach: plan.place.reach, grip: 38 };
  }
  document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
    if (kind !== 'concept' || !rig) return;
    stopDemo();
    const to = presetPose(b.dataset.preset);
    for (const k of Object.keys(to)) to[k] = THREE.MathUtils.clamp(Math.round(to[k]), RANGES[k][0], RANGES[k][1]);
    poseTween = { t: 0, duration: RM ? 0.001 : 0.9, from: pose(), to: { ...pose(), ...to } };
  }));
  function setBottle(bottle, k, where, spin = 0, placeYaw = 0) {
    if (bottle.userData.where === where) return;
    bottle.userData.where = where;
    if (where === 'slot') { rig.slots[k].add(bottle); bottle.position.set(0, 0, 0); bottle.rotation.set(0, 0, 0); }
    if (where === 'held') { rig.holder.add(bottle); bottle.position.set(0, 0, 0); bottle.rotation.set(0, spin, 0); }
    if (where === 'placed') { zones.floor.add(bottle); bottle.position.set(rig.layout.place.x + k * rig.layout.pitch, 0, rig.layout.place.z); bottle.rotation.set(0, placeYaw + spin, 0); }
  }
  function startDemo() {
    if (!rig) return;
    poseTween = null;
    if (focusPart) { focusPart = null; applyHighlight(); }
    demo = { plan: planDemo(rig, pose(), rig.bottles.length), time: 0 };
    zones.group.visible = true;
    $('animate').setAttribute('aria-pressed', 'true');
    // Pull back to a view that keeps the row of zones in frame.
    const target = new THREE.Vector3(rig.layout.place.x - 0.25, 0.2, rig.layout.place.z * 0.5);
    flyTo(target, target.clone().addScaledVector(new THREE.Vector3(0.2, 0.6, 1).normalize(), home.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2) * 1.3), 1.1);
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  }
  function stopDemo(restore = true) {
    if (!demo) return;
    demo = null;
    $('animate').setAttribute('aria-pressed', 'false');
    if (!rig) return;
    rig.bottles.forEach((b, k) => setBottle(b, k, 'slot'));
    zones.group.visible = false;
    zones.group.position.x = 0;
    rig.wheels.forEach(w => { w.wheel.rotation.x = 0; });
    rig.lamp.emissiveIntensity = 0.25;
    if (restore) { rig.setPose(pose()); measure(); stage.invalidate(true); }
  }
  function stepDemo(dt) {
    demo.time += dt;
    if (demo.time > demo.plan.duration) {
      rig.bottles.forEach((b, k) => setBottle(b, k, 'slot'));
      demo = { plan: planDemo(rig, demo.plan.at(demo.plan.duration).pose, rig.bottles.length), time: 0 };
    }
    const s = demo.plan.at(demo.time);
    rig.setPose(s.pose);
    zones.group.position.x = s.offset;
    rig.wheels.forEach(w => { w.wheel.rotation.x = w.spin * -s.offset / 0.0635; });
    rig.bottles.forEach((b, k) => setBottle(b, k, s.bottles[k].state, s.bottles[k].spin, s.placeYaw));
    rig.lamp.emissiveIntensity = 0.55 + 0.45 * Math.sin(demo.time * 7);
    if (++frameCount % 8 === 0) measure();
    stage.invalidate(frameCount % 3 === 0);
  }
  $('animate').addEventListener('click', () => { if (demo) stopDemo(); else startDemo(); });

  /* ---------- controls ---------- */
  for (const [key, input] of Object.entries(inputs)) input.addEventListener('input', () => {
    stopDemo();
    poseTween = null;
    state[key] = Number(input.value);
    saveState();
    updateInputs();
    if (BUILD_KEYS.includes(key)) queueRebuild();
    else { rig?.setPose(pose()); measure(); stage.invalidate(true); }
  });
  document.querySelectorAll('[data-team]').forEach(b => b.addEventListener('click', () => {
    if (state.team === b.dataset.team) return;
    state.team = b.dataset.team;
    saveState(); updateInputs(); queueRebuild();
  }));
  document.querySelectorAll('[data-envelope]').forEach(b => b.addEventListener('click', () => {
    state.envelope = Number(b.dataset.envelope);
    saveState(); updateInputs(); measure();
  }));
  $('reset-design').addEventListener('click', () => {
    state = { ...defaults, envelope: state.envelope };
    saveState(); updateInputs(); buildModel(); fitView(0.6);
  });
  $('reset-view').addEventListener('click', () => fitView(0.6));
  $('show-concept').addEventListener('click', () => showConcept());

  function showConcept() {
    pendingLoad++;
    kind = 'concept';
    mixer = null; clips = []; action = null;
    $('concept-controls').hidden = false;
    $('import-controls').hidden = true;
    $('parts').closest('section').hidden = false;
    $('model-kind').innerHTML = '<span lang="ja">検討用モデル</span><span lang="en">Concept model</span>';
    setStatus(conceptStatus);
    updateInputs();
    buildModel();
    fitView();
  }

  $('export-glb').addEventListener('click', async () => {
    if (kind !== 'concept' || !current) return;
    stopDemo();
    restoreMaterials();
    try {
      const bytes = await exporter.parseAsync(current, { binary: true });
      const url = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'sakura-avenue-concept.glb'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(() => L('現在の姿勢をGLBとして保存しました。', 'Exported the current pose as a GLB.'));
    } catch (_) { setStatus(() => L('GLBを書き出せませんでした。', 'Could not export the GLB.')); }
    applyHighlight();
  });

  /* ---------- importing a GLB ---------- */
  function updateAnimationOptions() {
    const select = $('animation-select');
    const selected = select.value;
    select.replaceChildren();
    if (!clips.length) select.add(new Option(L('アニメーションなし', 'No animations'), ''));
    clips.forEach((clip, index) => select.add(new Option(clip.name || `${L('アニメーション', 'Animation')} ${index + 1}`, String(index))));
    if (selected !== '' && Number(selected) < clips.length) select.value = selected;
    select.disabled = !clips.length;
    $('animation-play').disabled = !clips.length;
  }
  langHooks.push(updateAnimationOptions);
  function checkSelfContainedGLB(buffer) {
    if (buffer.byteLength < 20) throw new Error('invalid');
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('invalid');
    const jsonLength = view.getUint32(12, true);
    if (jsonLength > buffer.byteLength - 20) throw new Error('invalid');
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)).trim());
    if ([...(json.buffers || []), ...(json.images || [])].some(item => item.uri && !item.uri.startsWith('data:'))) throw new Error('external');
  }
  $('model-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = ++pendingLoad;
    if (!file.name.toLowerCase().endsWith('.glb') || file.size > 50 * 1024 * 1024) {
      setStatus(() => L('50 MB以下のGLBファイルを選んでください。', 'Choose a GLB file no larger than 50 MB.'));
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      checkSelfContainedGLB(buffer);
      const gltf = await loader.parseAsync(buffer, '');
      if (request !== pendingLoad) { dispose(gltf.scene); return; }
      const box = new THREE.Box3().setFromObject(gltf.scene);
      if (box.isEmpty()) { dispose(gltf.scene); throw new Error('empty'); }
      stopDemo(false);
      kind = 'imported'; rig = null; focusPart = null; poseTween = null;
      gltf.scene.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      replaceModel(gltf.scene);
      clips = gltf.animations; mixer = new THREE.AnimationMixer(current); action = null;
      $('concept-controls').hidden = true; $('import-controls').hidden = false;
      $('parts').closest('section').hidden = true;
      $('model-kind').innerHTML = '<span lang="ja">読み込み済み</span><span lang="en">Imported model</span>';
      updateAnimationOptions(); fitView(); measure();
      setStatus(() => L(`「${file.name}」をこの端末で表示中。サーバーには送信されていません。`, `Showing “${file.name}” locally. The file was not uploaded.`));
    } catch (error) {
      if (request !== pendingLoad) return;
      setStatus(() => error.message === 'external'
        ? L('外部ファイルを含むモデルは開けません。素材を埋め込んだGLBを選んでください。', 'External resources are not supported. Choose a self-contained GLB.')
        : L('GLBを読み込めませんでした。ファイル形式や圧縮設定を確認してください。', 'Could not load the GLB. Check the file and compression format.'));
    }
  });
  $('animation-select').addEventListener('change', () => { if (action) action.stop(); action = null; $('animation-play').setAttribute('aria-pressed', 'false'); });
  $('animation-play').addEventListener('click', () => {
    if (!mixer || !clips.length) return;
    if (!action) { action = mixer.clipAction(clips[Number($('animation-select').value)]); action.play(); }
    else action.paused = !action.paused;
    $('animation-play').setAttribute('aria-pressed', String(!action.paused));
  });

  /* ---------- render loop ---------- */
  showConcept();
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (document.hidden) return;
    if (camTween) {
      camTween.t += dt;
      const p = ease(Math.min(camTween.t / camTween.duration, 1));
      controls.target.lerpVectors(camTween.fromTarget, camTween.target, p);
      camera.position.lerpVectors(camTween.fromPos, camTween.position, p);
      if (p >= 1) camTween = null;
      stage.invalidate();
    }
    if (poseTween && rig) {
      poseTween.t += dt;
      const p = ease(Math.min(poseTween.t / poseTween.duration, 1));
      const next = {};
      for (const k of POSE_KEYS) next[k] = poseTween.from[k] + (poseTween.to[k] - poseTween.from[k]) * p;
      rig.setPose(next);
      if (p >= 1) { Object.assign(state, poseTween.to); poseTween = null; saveState(); updateInputs(); }
      else for (const k of POSE_KEYS) showValue(k, next[k]);
      measure();
      stage.invalidate(true);
    }
    if (demo && kind === 'concept') stepDemo(dt);
    if (mixer && action && !action.paused) { mixer.update(dt); if (++frameCount % 15 === 0) measure(); stage.invalidate(true); }
    controls.update();
    stage.render();
  }
  requestAnimationFrame(frame);
}
