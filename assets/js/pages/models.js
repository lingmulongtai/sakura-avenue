import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { L, langHooks } from '../core/i18n.js';
import { makeConcept } from '../models/concept.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport');
const status = $('status');
function updateViewerLabel() { viewport.setAttribute('aria-label', L('3Dモデル。矢印キーで回転、プラスとマイナスキーで拡大縮小', '3D model. Use arrow keys to orbit and plus and minus to zoom')); }
langHooks.push(updateViewerLabel);
updateViewerLabel();
let statusText = () => L('検討用モデルを表示中。実機の設計や競技規定を表すものではありません。', 'Showing a concept model. It does not represent a real robot or verified competition specifications.');
function setStatus(text) { statusText = text; status.textContent = statusText(); }
langHooks.push(() => { status.textContent = statusText(); });

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
} catch (error) {
  $('viewer-error').hidden = false;
  setStatus(() => L('3D表示を開始できませんでした。', 'The 3D viewer could not start.'));
}

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewport.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3eceb);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.6, 0);
  controls.minDistance = 0.3;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI * 0.49;
  viewport.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) return;
    event.preventDefault();
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
  });
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc6b0a8, 2));
  const light = new THREE.DirectionalLight(0xffffff, 2.5);
  light.position.set(4, 7, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = light.shadow.camera.bottom = -5;
  light.shadow.camera.right = light.shadow.camera.top = 5;
  scene.add(light);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0xe9dddb, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(12, 24, 0xd1bcb9, 0xdfcfcc);
  grid.position.y = 0.002;
  scene.add(grid);

  const defaults = { width: 1, depth: 1, arm: 1, angle: 20, grip: 50 };
  const inputs = Object.fromEntries(Object.keys(defaults).map(key => [key, $(key)]));
  const storageKey = 'sakura-avenue-concept-design-v1';
  let state = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    for (const key of Object.keys(defaults)) {
      const value = Number(saved[key]);
      if (Number.isFinite(value) && value >= Number(inputs[key].min) && value <= Number(inputs[key].max)) state[key] = value;
    }
  } catch (_) {}
  let current = null, kind = 'concept', mixer = null, clips = [], action = null, moving = false, motionTime = 0;
  const loader = new GLTFLoader();
  const exporter = new GLTFExporter();
  let pendingLoad = 0;
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
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
  };
  function updateInputs() {
    for (const key of Object.keys(defaults)) {
      inputs[key].value = state[key];
      $(`${key}-value`).textContent = key === 'angle' ? `${Math.round(state[key])}°` : key === 'grip' ? `${Math.round(state[key])}%` : `${state[key].toFixed(2)}×`;
    }
  }
  function replaceModel(object) {
    if (current) { scene.remove(current); dispose(current); }
    current = object;
    scene.add(current);
  }
  function fitView() {
    if (!current) return;
    const bounds = new THREE.Box3().setFromObject(current);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const extent = Math.max(size.x, size.y, size.z, 0.1);
    floor.position.y = bounds.min.y - extent * 0.005;
    grid.position.y = floor.position.y + extent * 0.001;
    controls.target.copy(center);
    controls.minDistance = extent * 0.15;
    controls.maxDistance = extent * 12;
    camera.near = Math.max(extent / 1000, 0.001);
    camera.far = Math.max(extent * 100, 100);
    camera.position.copy(center).add(new THREE.Vector3(extent * 1.55, extent * 1.15, extent * 1.8));
    camera.updateProjectionMatrix();
    controls.update();
  }
  function stopMotion() { moving = false; $('animate').setAttribute('aria-pressed', 'false'); }
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
  function showConcept(resetView = true) {
    pendingLoad++;
    kind = 'concept';
    mixer = null; clips = []; action = null;
    stopMotion();
    replaceModel(makeConcept(state));
    $('concept-controls').hidden = false;
    $('import-controls').hidden = true;
    $('model-kind').innerHTML = '<span lang="ja">検討用モデル</span><span lang="en">Concept model</span>';
    setStatus(() => L('検討用モデルを表示中。実機の設計や競技規定を表すものではありません。', 'Showing a concept model. It does not represent a real robot or verified competition specifications.'));
    updateInputs();
    if (resetView) fitView();
  }
  function saveState() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {} }
  for (const [key, input] of Object.entries(inputs)) input.addEventListener('input', () => {
    stopMotion();
    state[key] = Number(input.value);
    saveState();
    replaceModel(makeConcept(state));
    updateInputs();
  });
  $('reset-design').addEventListener('click', () => { state = { ...defaults }; saveState(); showConcept(false); });
  $('reset-view').addEventListener('click', fitView);
  $('show-concept').addEventListener('click', () => showConcept());
  $('animate').addEventListener('click', () => {
    moving = !moving;
    motionTime = 0;
    $('animate').setAttribute('aria-pressed', String(moving));
  });
  $('export-glb').addEventListener('click', async () => {
    if (kind !== 'concept' || !current) return;
    try {
      const bytes = await exporter.parseAsync(current, { binary: true });
      const url = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'sakura-avenue-concept.glb'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(() => L('現在の姿勢をGLBとして保存しました。', 'Exported the current pose as a GLB.'));
    } catch (_) { setStatus(() => L('GLBを書き出せませんでした。', 'Could not export the GLB.')); }
  });
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
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      if (bounds.isEmpty()) { dispose(gltf.scene); throw new Error('empty'); }
      kind = 'imported'; stopMotion();
      replaceModel(gltf.scene);
      clips = gltf.animations; mixer = new THREE.AnimationMixer(current); action = null;
      $('concept-controls').hidden = true; $('import-controls').hidden = false;
      $('model-kind').innerHTML = '<span lang="ja">読み込み済み</span><span lang="en">Imported model</span>';
      updateAnimationOptions(); fitView();
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
  const resize = () => {
    const width = viewport.clientWidth, height = viewport.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
  };
  new ResizeObserver(resize).observe(viewport);
  showConcept(); resize();
  let last = performance.now();
  function render(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!document.hidden) {
      if (moving && kind === 'concept') {
        motionTime += dt;
        const pose = { ...state, angle: 20 + 20 * (1 + Math.sin(motionTime * 1.2)) / 2, grip: 30 + 50 * (1 + Math.sin(motionTime * 1.2 + 1)) / 2 };
        const pivot = current.getObjectByName('Arm pivot');
        if (pivot) {
          pivot.rotation.x = -THREE.MathUtils.degToRad(pose.angle);
          const fingers = pivot.children.filter(child => child.name === 'Gripper finger' || child.name === 'Finger tip');
          fingers.forEach(finger => { finger.position.x = Math.sign(finger.position.x) * (0.095 + pose.grip * 0.0013); });
        }
      }
      if (mixer) mixer.update(dt);
      controls.update(); renderer.render(scene, camera);
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
