/**
 * Tunnel3D – audio-reactive tunnel / vortex visualizer
 */
import * as THREE from 'three';

const RINGS    = 40;
const SEGMENTS = 32;

export class Tunnel3D {
  constructor (scene) {
    this.scene  = scene;
    this.group  = new THREE.Group();
    this.rings  = [];
    scene.scene.add(this.group);
    this._build();
  }

  _build () {
    for (let r = 0; r < RINGS; r++) {
      const geo = new THREE.RingGeometry(3, 3.4, SEGMENTS);
      const hue = r / RINGS;
      const mat = new THREE.MeshBasicMaterial({
        color      : new THREE.Color().setHSL(hue, 1, 0.5),
        side       : THREE.DoubleSide,
        transparent: true,
        opacity    : 0.6,
        wireframe  : true
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = -r * 4;
      this.group.add(mesh);
      this.rings.push(mesh);
    }

    // Camera is positioned along +z, tunnel extends in -z
    this.group.position.z = 10;
  }

  update (freqData, elapsed) {
    const bassAvg = this._bandAvg(freqData, 0, 0.1);
    const midAvg  = this._bandAvg(freqData, 0.1, 0.5);

    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];

      // Move rings toward camera
      ring.position.z += 0.15 + bassAvg * 0.4;
      if (ring.position.z > 15) ring.position.z = -RINGS * 4 + 15;

      // Scale rings
      const dist = Math.abs(ring.position.z) / (RINGS * 4);
      const v    = i < freqData.length ? freqData[i] / 255 : midAvg;
      ring.scale.setScalar(1 + v * 0.8);
      ring.rotation.z = elapsed * 0.3 + i * 0.2;

      const hue = ((i / RINGS) + elapsed * 0.05) % 1;
      ring.material.color.setHSL(hue, 1, 0.45 + v * 0.3);
    }
  }

  _bandAvg (data, lo, hi) {
    const start = Math.floor(data.length * lo);
    const end   = Math.floor(data.length * hi);
    let sum = 0;
    for (let i = start; i < end; i++) sum += data[i];
    return (sum / ((end - start) || 1)) / 255;
  }

  setVisible (v) { this.group.visible = v; }

  dispose () {
    for (const ring of this.rings) {
      ring.geometry.dispose();
      ring.material.dispose();
    }
    this.scene.scene.remove(this.group);
  }
}
