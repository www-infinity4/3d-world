/**
 * Spectrum3D – audio frequency visualizer as 3D bars
 */
import * as THREE from 'three';

export class Spectrum3D {
  constructor (scene) {
    this.scene   = scene;
    this.group   = new THREE.Group();
    this.bars    = [];
    this.barCount = 128;
    scene.scene.add(this.group);
    this._build();
  }

  _build () {
    const geo = new THREE.BoxGeometry(0.6, 1, 0.6);
    const spread = this.barCount * 0.8;

    for (let i = 0; i < this.barCount; i++) {
      const hue = i / this.barCount;
      const mat = new THREE.MeshPhongMaterial({
        color    : new THREE.Color().setHSL(hue, 1, 0.5),
        emissive : new THREE.Color().setHSL(hue, 1, 0.15),
        shininess: 60
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.x = (i / this.barCount - 0.5) * spread;
      mesh.position.y = 0.5;
      mesh.castShadow = true;
      this.group.add(mesh);
      this.bars.push(mesh);
    }
  }

  update (freqData) {
    const len = Math.min(freqData.length, this.bars.length);
    for (let i = 0; i < this.bars.length; i++) {
      const v       = (i < len ? freqData[i] : 0) / 255;
      const targetH = Math.max(0.05, v * 20);
      const bar     = this.bars[i];
      bar.scale.y   = bar.scale.y + (targetH - bar.scale.y) * 0.3;
      bar.position.y = bar.scale.y * 0.5;

      // Dynamic emissive
      const hue = i / this.bars.length;
      bar.material.emissive.setHSL(hue, 1, v * 0.4);
    }
  }

  setVisible (v) { this.group.visible = v; }

  dispose () {
    for (const bar of this.bars) {
      bar.geometry.dispose();
      bar.material.dispose();
    }
    this.scene.scene.remove(this.group);
  }
}
