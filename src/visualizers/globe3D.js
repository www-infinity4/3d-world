/**
 * Globe3D – visualize frequency data projected onto a sphere
 */
import * as THREE from 'three';

export class Globe3D {
  constructor (scene) {
    this.scene   = scene;
    this.group   = new THREE.Group();
    this.spikes  = [];
    this.spikeCount = 256;
    this.radius  = 10;
    scene.scene.add(this.group);
    this._build();
  }

  _build () {
    // Fibonacci sphere distribution
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < this.spikeCount; i++) {
      const y     = 1 - (i / (this.spikeCount - 1)) * 2;
      const r     = Math.sqrt(1 - y * y);
      const theta = golden * i;

      const geo = new THREE.CylinderGeometry(0.05, 0.15, 1, 5);
      const hue = i / this.spikeCount;
      const mat = new THREE.MeshPhongMaterial({
        color    : new THREE.Color().setHSL(hue, 1, 0.55),
        emissive : new THREE.Color().setHSL(hue, 1, 0.1)
      });

      const mesh = new THREE.Mesh(geo, mat);

      // Position and orient spike
      const nx = r * Math.cos(theta);
      const ny = y;
      const nz = r * Math.sin(theta);

      mesh.position.set(nx * this.radius, ny * this.radius, nz * this.radius);

      // Orient along radial direction
      const dir = new THREE.Vector3(nx, ny, nz);
      const up  = new THREE.Vector3(0, 1, 0);
      mesh.quaternion.setFromUnitVectors(up, dir);

      this.group.add(mesh);
      this.spikes.push({ mesh, nx, ny, nz });
    }

    // Core sphere
    const coreGeo = new THREE.SphereGeometry(this.radius - 0.1, 32, 32);
    const coreMat = new THREE.MeshPhongMaterial({
      color      : 0x001122,
      emissive   : 0x000a15,
      transparent: true,
      opacity    : 0.85,
      wireframe  : false
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(this.core);
  }

  update (freqData) {
    const len = Math.min(freqData.length, this.spikes.length);
    for (let i = 0; i < this.spikes.length; i++) {
      const v = (i < len ? freqData[i] : 0) / 255;
      const h = Math.max(0.3, v * 8);
      const { mesh, nx, ny, nz } = this.spikes[i];

      // Scale height
      mesh.scale.y = h;
      // Move base to surface
      const off = this.radius + h * 0.5;
      mesh.position.set(nx * off, ny * off, nz * off);

      const hue = i / this.spikes.length;
      mesh.material.emissive.setHSL(hue, 1, v * 0.35);
    }
  }

  setVisible (v) { this.group.visible = v; }

  dispose () {
    for (const { mesh } of this.spikes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.core.geometry.dispose();
    this.core.material.dispose();
    this.scene.scene.remove(this.group);
  }
}
