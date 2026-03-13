/**
 * Builder3D – add/remove primitive objects to the scene.
 */
import * as THREE from 'three';

export class Builder3D {
  constructor (scene) {
    this.scene   = scene;
    this.group   = new THREE.Group();
    this.objects = [];
    scene.scene.add(this.group);

    // Grid floor
    this.gridHelper = new THREE.GridHelper(60, 30, 0x334466, 0x223355);
    scene.scene.add(this.gridHelper);
    this._gridVisible = true;

    // Star-field background particles
    this._stars = this._buildStars();
    scene.scene.add(this._stars);
  }

  _buildStars () {
    const count = 2000;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 150 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true });
    return new THREE.Points(geo, mat);
  }

  addPrimitive (type, color, scale) {
    let geo;
    switch (type) {
      case 'sphere':   geo = new THREE.SphereGeometry(1, 32, 32); break;
      case 'cylinder': geo = new THREE.CylinderGeometry(0.8, 0.8, 2, 32); break;
      case 'torus':    geo = new THREE.TorusGeometry(1, 0.35, 16, 60); break;
      case 'cone':     geo = new THREE.ConeGeometry(1, 2, 32); break;
      default:         geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    }

    const mat  = new THREE.MeshPhongMaterial({
      color    : new THREE.Color(color),
      emissive : new THREE.Color(color).multiplyScalar(0.1),
      shininess: 80
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(scale);
    mesh.position.set(
      (Math.random() - 0.5) * 20,
      scale + 0.5,
      (Math.random() - 0.5) * 20
    );
    mesh.castShadow    = true;
    mesh.receiveShadow = true;

    this.group.add(mesh);
    this.objects.push(mesh);
    return mesh;
  }

  clearObjects () {
    for (const obj of [...this.objects]) {
      obj.geometry.dispose();
      obj.material.dispose();
      this.group.remove(obj);
    }
    this.objects = [];
  }

  setGrid (visible) {
    this.gridHelper.visible = visible;
    this._gridVisible = visible;
  }

  setStars (visible) {
    this._stars.visible = visible;
  }

  /** Export the builder scene as a JSON string */
  exportJSON () {
    const items = this.objects.map(mesh => ({
      type    : mesh.geometry.type,
      position: mesh.position.toArray(),
      scale   : mesh.scale.x,
      color   : '#' + mesh.material.color.getHexString()
    }));
    return JSON.stringify({ objects: items }, null, 2);
  }

  dispose () {
    this.clearObjects();
    this.scene.scene.remove(this.group);
    this.scene.scene.remove(this.gridHelper);
    this.scene.scene.remove(this._stars);
  }
}
