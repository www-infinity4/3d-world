/**
 * WaveRibbon3D – audio waveform displayed as a flowing 3D ribbon
 */
import * as THREE from 'three';

export class WaveRibbon3D {
  constructor (scene) {
    this.scene    = scene;
    this.group    = new THREE.Group();
    this.segments = 256;
    scene.scene.add(this.group);
    this._build();
  }

  _build () {
    // Line geometry that will be updated every frame
    const positions = new Float32Array(this.segments * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.lineMat = new THREE.LineBasicMaterial({ color: 0x00aaff, linewidth: 2 });
    this.line    = new THREE.Line(this.geo, this.lineMat);
    this.group.add(this.line);

    // Mirror
    const pos2   = new Float32Array(this.segments * 3);
    this.geo2 = new THREE.BufferGeometry();
    this.geo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    this.lineMat2 = new THREE.LineBasicMaterial({ color: 0xaa00ff, linewidth: 2 });
    this.line2    = new THREE.Line(this.geo2, this.lineMat2);
    this.group.add(this.line2);
  }

  update (timeData) {
    const pos  = this.geo.attributes.position.array;
    const pos2 = this.geo2.attributes.position.array;
    const len  = this.segments;
    const spread = 50;

    for (let i = 0; i < len; i++) {
      const t  = i / (len - 1);
      const x  = (t - 0.5) * spread;
      const raw = i < timeData.length ? (timeData[i] / 128) - 1 : 0;
      const y  = raw * 8;
      const z  = 0;

      pos [i * 3]     = x;
      pos [i * 3 + 1] = y;
      pos [i * 3 + 2] = z;

      pos2[i * 3]     = x;
      pos2[i * 3 + 1] = -y;  // mirror
      pos2[i * 3 + 2] = 2;
    }

    this.geo.attributes.position.needsUpdate  = true;
    this.geo2.attributes.position.needsUpdate = true;
  }

  setVisible (v) { this.group.visible = v; }

  dispose () {
    this.geo.dispose();
    this.geo2.dispose();
    this.lineMat.dispose();
    this.lineMat2.dispose();
    this.scene.scene.remove(this.group);
  }
}
