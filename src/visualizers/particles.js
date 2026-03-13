/**
 * Particles3D – audio-reactive particle system
 */
import * as THREE from 'three';

const PARTICLE_COUNT = 4000;

export class Particles3D {
  constructor (scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.scene.add(this.group);
    this._build();
  }

  _build () {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 30 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      velocities[i * 3]     = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      const hue = Math.random();
      const col = new THREE.Color().setHSL(hue, 1, 0.6);
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    this.geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    this._velocities = velocities;
    this._basePositions = positions.slice();

    this.mat = new THREE.PointsMaterial({
      size            : 0.4,
      vertexColors    : true,
      transparent     : true,
      opacity         : 0.8,
      sizeAttenuation : true
    });

    this.points = new THREE.Points(this.geo, this.mat);
    this.group.add(this.points);
  }

  update (freqData, elapsed) {
    const pos  = this.geo.attributes.position.array;
    const base = this._basePositions;
    const vel  = this._velocities;

    // Use low/mid/high bands as scale factors
    let bassSum = 0, midSum = 0, highSum = 0;
    const len = freqData.length;
    for (let i = 0; i < len; i++) {
      const v = freqData[i] / 255;
      if (i < len * 0.1)       bassSum  += v;
      else if (i < len * 0.5)  midSum   += v;
      else                     highSum  += v;
    }
    const bass  = bassSum  / (len * 0.1)  || 0;
    const mid   = midSum   / (len * 0.4)  || 0;
    const high  = highSum  / (len * 0.5)  || 0;

    const scale = 1 + bass * 0.6;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;

      // Drift
      pos[ix] = base[ix] * scale + Math.sin(elapsed * 0.3 + i * 0.01) * mid * 2;
      pos[iy] = base[iy] * scale + Math.cos(elapsed * 0.2 + i * 0.01) * high * 2;
      pos[iz] = base[iz] * scale;
    }

    this.geo.attributes.position.needsUpdate = true;
    this.mat.size = 0.3 + bass * 0.5;
  }

  setVisible (v) { this.group.visible = v; }

  dispose () {
    this.geo.dispose();
    this.mat.dispose();
    this.scene.scene.remove(this.group);
  }
}
