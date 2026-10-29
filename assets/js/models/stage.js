import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

// A photo-studio scene: soft environment light, a key light with soft shadows, blurred contact shadows
// and a seamless backdrop. Rendering happens on demand through invalidate().
const BACKDROP = {
  light: ['#f6f1ec', '#e9e1da', '#d9cec5'],
  dark: ['#2f2925', '#221d1a', '#141110'],
};

class ContactShadow {
  constructor(renderer, size = 3, height = 0.32, resolution = 512) {
    this.renderer = renderer;
    this.group = new THREE.Group();
    this.group.name = 'Contact shadow';
    this.target = new THREE.WebGLRenderTarget(resolution, resolution);
    this.blurTarget = new THREE.WebGLRenderTarget(resolution, resolution);
    this.target.texture.generateMipmaps = this.blurTarget.texture.generateMipmaps = false;
    const plane = new THREE.PlaneGeometry(size, size).rotateX(Math.PI / 2);
    const fade = document.createElement('canvas');
    fade.width = fade.height = 64;
    const g = fade.getContext('2d'), grad = g.createRadialGradient(32, 32, 14, 32, 32, 32);
    grad.addColorStop(0, '#fff'); grad.addColorStop(1, '#000');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this.plane = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: this.target.texture, alphaMap: new THREE.CanvasTexture(fade), transparent: true, opacity: 0.62, depthWrite: false, color: 0x2a1d17 }));
    this.plane.renderOrder = 1;
    this.plane.scale.y = -1;
    this.group.add(this.plane);
    this.blurPlane = new THREE.Mesh(plane);
    this.blurPlane.visible = false;
    this.group.add(this.blurPlane);
    this.camera = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, height);
    this.camera.rotation.x = Math.PI / 2;
    this.group.add(this.camera);
    this.depth = new THREE.MeshDepthMaterial();
    this.depth.userData.darkness = { value: 1.25 };
    this.depth.onBeforeCompile = shader => {
      shader.uniforms.darkness = this.depth.userData.darkness;
      shader.fragmentShader = 'uniform float darkness;\n' + shader.fragmentShader.replace(
        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );');
    };
    this.depth.depthTest = this.depth.depthWrite = false;
    this.hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
    this.vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
    this.hBlur.depthTest = this.vBlur.depthTest = false;
  }
  blur(amount) {
    const { renderer, blurPlane } = this;
    blurPlane.visible = true;
    blurPlane.material = this.hBlur;
    this.hBlur.uniforms.tDiffuse.value = this.target.texture;
    this.hBlur.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(this.blurTarget);
    renderer.render(blurPlane, this.camera);
    blurPlane.material = this.vBlur;
    this.vBlur.uniforms.tDiffuse.value = this.blurTarget.texture;
    this.vBlur.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(this.target);
    renderer.render(blurPlane, this.camera);
    blurPlane.visible = false;
  }
  update(scene, hidden) {
    const { renderer } = this;
    const background = scene.background, clearAlpha = renderer.getClearAlpha();
    const visibility = hidden.map(o => o.visible);
    hidden.forEach(o => { o.visible = false; });
    this.plane.visible = false;
    scene.background = null;
    scene.overrideMaterial = this.depth;
    renderer.setClearAlpha(0);
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, this.camera);
    scene.overrideMaterial = null;
    this.blur(2.4);
    this.blur(0.9);
    renderer.setRenderTarget(null);
    renderer.setClearAlpha(clearAlpha);
    scene.background = background;
    this.plane.visible = true;
    hidden.forEach((o, i) => { o.visible = visibility[i]; });
  }
}

export function createStage(container, { alpha = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.035).texture;
  scene.environmentIntensity = 0.7;
  room.dispose();
  pmrem.dispose();

  const backdropCanvas = document.createElement('canvas');
  backdropCanvas.width = 256; backdropCanvas.height = 256;
  const backdrop = new THREE.CanvasTexture(backdropCanvas);
  backdrop.colorSpace = THREE.SRGBColorSpace;
  if (!alpha) scene.background = backdrop;
  function paintBackdrop(dark) {
    const [a, b, c] = BACKDROP[dark ? 'dark' : 'light'];
    const g = backdropCanvas.getContext('2d');
    const grad = g.createRadialGradient(128, 112, 10, 128, 140, 200);
    grad.addColorStop(0, a); grad.addColorStop(0.55, b); grad.addColorStop(1, c);
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    backdrop.needsUpdate = true;
  }

  const hemi = new THREE.HemisphereLight(0xfff7f2, 0xb9a79d, 0.35);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4ea, 2.5);
  key.position.set(1.1, 4.2, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 7;
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 8 });
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xf3e6ff, 1.1);
  rim.position.set(-2.2, 1.8, -2.4);
  scene.add(rim);

  const ground = new THREE.Group();
  ground.name = 'Ground';
  scene.add(ground);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: 0x2a1d17, opacity: 0.16 }));
  catcher.receiveShadow = true;
  ground.add(catcher);
  const contact = new ContactShadow(renderer);
  ground.add(contact.group);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  camera.position.set(1.5, 1.05, 1.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 0.3, 0);

  let dirty = true, shadowDirty = true;
  const invalidate = (shadows = false) => { dirty = true; if (shadows) shadowDirty = true; };
  controls.addEventListener('change', () => invalidate());

  const scheme = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const isDark = () => {
    const theme = document.documentElement.dataset.theme;
    return theme ? theme === 'dark' : !!scheme?.matches;
  };
  const applyTheme = () => {
    const dark = isDark();
    paintBackdrop(dark);
    catcher.material.opacity = dark ? 0.32 : 0.16;
    contact.plane.material.opacity = dark ? 0.8 : 0.62;
    invalidate();
  };
  scheme?.addEventListener?.('change', applyTheme);
  applyTheme();

  function resize() {
    const width = container.clientWidth, height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    invalidate();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  return {
    renderer, scene, camera, controls, ground, invalidate,
    setGround(y) { ground.position.y = y; invalidate(true); },
    // Objects that should cast neither contact shadows nor be drawn into them.
    shadowExclude: [],
    render() {
      if (!dirty && !shadowDirty) return false;
      if (shadowDirty) contact.update(scene, [catcher, ...this.shadowExclude]);
      renderer.render(scene, camera);
      dirty = shadowDirty = false;
      return true;
    },
  };
}
