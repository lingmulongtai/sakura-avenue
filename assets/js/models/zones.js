import * as THREE from 'three';

// A strip of the Common Zones in front of the robot for the demo: 38 × 89 mm wooden frames, zones 507 mm apart.
function grain() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#d6a674';
  g.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 70; i++) {
    const y = (i * 37) % 64, w = 0.6 + (i % 5) * 0.5;
    g.strokeStyle = `rgba(${120 + (i % 3) * 20}, ${70 + (i % 4) * 10}, 30, ${0.12 + (i % 4) * 0.05})`;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 2.2);
    g.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}
function label(n) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = 'rgba(42, 29, 23, 0.55)';
  g.font = '700 64px "Azeret Mono", ui-monospace, monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), 64, 68);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
}

export function makeZones(layout) {
  const group = new THREE.Group();
  group.name = 'Common Zones';
  const frames = new THREE.Group();
  frames.name = 'Wooden frames';
  group.add(frames);
  const wood = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grain(), roughness: 0.75, metalness: 0 });
  const near = layout.place.z - 0.169, far = near + 0.338, h = 0.089, w = 0.038;
  const x0 = layout.place.x - 2.8, x1 = layout.place.x + 8;
  for (const z of [near, far]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, w), wood);
    rail.position.set((x0 + x1) / 2, h / 2, z);
    frames.add(rail);
  }
  const rung = new THREE.BoxGeometry(w, h, far - near - w);
  for (let k = -6; k <= 15; k++) {
    const mesh = new THREE.Mesh(rung, wood);
    mesh.position.set(layout.place.x + (k + 0.5) * layout.pitch, h / 2, (near + far) / 2);
    frames.add(mesh);
  }
  const tile = new THREE.PlaneGeometry(0.09, 0.09).rotateX(-Math.PI / 2);
  for (let n = 1; n <= 12; n++) {
    const mesh = new THREE.Mesh(tile, label(n));
    mesh.position.set(layout.place.x + (n - 1) * layout.pitch + 0.17, 0.001, far - 0.07);
    frames.add(mesh);
  }
  group.traverse(o => { if (o.isMesh && o.material === wood) o.castShadow = o.receiveShadow = true; });
  const floor = new THREE.Group();
  floor.name = 'Placed bottles';
  group.add(floor);
  group.visible = false;
  return { group, frames, floor };
}
