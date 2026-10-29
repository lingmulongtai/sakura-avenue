import * as THREE from 'three';

// An illustrative, adjustable study model. Dimensions are relative, not engineering measurements.
export function makeConcept({ width, depth, arm, angle, grip }) {
  const root = new THREE.Group();
  root.name = 'Concept robot';
  const pink = new THREE.MeshStandardMaterial({ color: 0xc9476f, roughness: 0.43, metalness: 0.15 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xf5e7e7, roughness: 0.55, metalness: 0.1 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x98a4a5, roughness: 0.4, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.68, metalness: 0.15 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf6c244, roughness: 0.5 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd72b38, roughness: 0.4 });
  const w = 1.12 * width, d = 1.05 * depth;
  const box = (parent, name, size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  box(root, 'Chassis', [w, 0.19, d], [0, 0.28, 0], dark);
  box(root, 'Top plate', [w * 0.88, 0.07, d * 0.88], [0, 0.41, 0], pale);
  for (const side of [-1, 1]) {
    box(root, 'Side panel', [0.09, 0.20, d * 0.8], [side * w * 0.45, 0.30, 0], pink);
    for (const end of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 24), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * (w / 2 + 0.025), 0.19, end * d * 0.31);
      wheel.castShadow = true;
      root.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.125, 20), steel);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      root.add(hub);
    }
  }
  for (const side of [-1, 1]) box(root, 'Mast', [0.075, 0.66, 0.075], [side * 0.23, 0.78, -d * 0.13], steel);
  box(root, 'Mast crossbar', [0.58, 0.08, 0.09], [0, 1.1, -d * 0.13], pink);
  const joint = new THREE.Group();
  joint.name = 'Arm pivot';
  joint.position.set(0, 1.02, -d * 0.13);
  joint.rotation.x = -THREE.MathUtils.degToRad(angle);
  root.add(joint);
  const length = 0.86 * arm;
  box(joint, 'Arm', [0.19, 0.12, length], [0, 0, length / 2], steel);
  box(joint, 'Arm trim', [0.11, 0.04, length * 0.7], [0, 0.08, length * 0.48], pink);
  box(joint, 'Gripper mount', [0.42, 0.11, 0.11], [0, 0, length], pink);
  for (const side of [-1, 1]) {
    box(joint, 'Gripper finger', [0.06, 0.10, 0.30], [side * (0.095 + grip * 0.0013), -0.03, length + 0.14], dark);
    box(joint, 'Finger tip', [0.065, 0.105, 0.07], [side * (0.095 + grip * 0.0013), -0.03, length + 0.28], pale);
  }
  box(root, 'Emergency stop base', [0.18, 0.035, 0.18], [-w * 0.22, 0.46, -d * 0.30], yellow);
  const stop = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.06, 24), red);
  stop.position.set(-w * 0.22, 0.505, -d * 0.30);
  root.add(stop);
  return root;
}
