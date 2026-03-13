/**
 * Charts3D – build 3D bar charts, scatter plots, line graphs, and surface grids.
 */
import * as THREE from 'three';

/* ─── color helpers ─── */
function heatColor (t) {
  const c = new THREE.Color();
  c.setHSL((1 - t) * 0.67, 1, 0.5); // blue→green→red
  return c;
}

function schemeColor (scheme, t, value) {
  const c = new THREE.Color();
  switch (scheme) {
    case 'rainbow': c.setHSL(t, 1, 0.5); break;
    case 'heat':    c.setHSL((1 - value) * 0.67, 1, 0.5); break;
    case 'cool':    c.setHSL(0.55 + t * 0.15, 0.9, 0.45 + t * 0.2); break;
    case 'mono':    c.setScalar(0.3 + value * 0.7); break;
    default:        c.setHSL(t, 1, 0.5);
  }
  return c;
}

/* ─── Dataset generators ─── */
export function generateDataset (preset, count) {
  const data = [];
  switch (preset) {
    case 'sine':
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 4;
        data.push({ x: i, y: Math.sin(t) * 5 + 5, z: Math.cos(t * 0.5) * 3 });
      }
      break;
    case 'spiral':
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 8;
        const r = (i / count) * 10;
        data.push({ x: Math.cos(t) * r, y: (i / count) * 10, z: Math.sin(t) * r });
      }
      break;
    case 'gaussian': {
      const gauss = () => {
        let u = 0, v = 0;
        while (!u) u = Math.random();
        while (!v) v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      };
      for (let i = 0; i < count; i++) {
        data.push({ x: gauss() * 5, y: Math.abs(gauss() * 4), z: gauss() * 5 });
      }
      break;
    }
    default: // random
      for (let i = 0; i < count; i++) {
        data.push({ x: (Math.random() - 0.5) * 20, y: Math.random() * 10, z: (Math.random() - 0.5) * 20 });
      }
  }
  return data;
}

/* ─── Chart classes ─── */

export class BarChart3D {
  constructor (scene, data, scheme = 'rainbow') {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.scene.add(this.group);

    const maxY = Math.max(...data.map(d => d.y), 0.01);

    data.forEach((d, i) => {
      const h   = Math.max(0.1, d.y);
      const t   = i / data.length;
      const col = schemeColor(scheme, t, d.y / maxY);

      const geo = new THREE.BoxGeometry(0.7, h, 0.7);
      const mat = new THREE.MeshPhongMaterial({ color: col, emissive: col.clone().multiplyScalar(0.2) });
      const mesh = new THREE.Mesh(geo, mat);

      const cols = Math.ceil(Math.sqrt(data.length));
      mesh.position.set(
        (i % cols - cols / 2) * 1.1,
        h / 2,
        (Math.floor(i / cols) - cols / 2) * 1.1
      );
      mesh.castShadow = true;
      this.group.add(mesh);
    });

    this._addAxes(data.length);
  }

  _addAxes (count) {
    const cols = Math.ceil(Math.sqrt(count));
    const size = cols * 1.1;
    const mat  = new THREE.LineBasicMaterial({ color: 0x444466 });

    const mkLine = (pts) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
      const l   = new THREE.Line(geo, mat);
      this.group.add(l);
    };

    mkLine([[-size, 0, 0], [size, 0, 0]]);
    mkLine([[0, 0, -size], [0, 0, size]]);
    mkLine([[0, 0, 0], [0, 12, 0]]);
  }

  setVisible (v) { this.group.visible = v; }
  dispose () {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.scene.scene.remove(this.group);
  }
}

export class ScatterChart3D {
  constructor (scene, data, scheme = 'rainbow') {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.scene.add(this.group);

    const maxY = Math.max(...data.map(d => d.y), 0.01);
    const geo  = new THREE.SphereGeometry(0.2, 8, 8);

    data.forEach((d, i) => {
      const t   = i / data.length;
      const col = schemeColor(scheme, t, d.y / maxY);
      const mat = new THREE.MeshPhongMaterial({ color: col });
      const m   = new THREE.Mesh(geo, mat);
      m.position.set(d.x, d.y, d.z);
      this.group.add(m);
    });
  }

  setVisible (v) { this.group.visible = v; }
  dispose () {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.scene.scene.remove(this.group);
  }
}

export class LineChart3D {
  constructor (scene, data, scheme = 'rainbow') {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.scene.add(this.group);

    const points = data.map(d => new THREE.Vector3(d.x / 2, d.y, d.z / 2));
    const curve  = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, data.length * 2, 0.12, 8, false);

    const mat  = new THREE.MeshPhongMaterial({
      color  : 0x00aaff,
      emissive: 0x002244,
      shininess: 80
    });

    if (scheme !== 'mono') {
      // Vertex colors
      const colors = [];
      const posArr = tubeGeo.attributes.position.array;
      for (let i = 0; i < posArr.length / 3; i++) {
        const t   = i / (posArr.length / 3);
        const col = schemeColor(scheme, t, t);
        colors.push(col.r, col.g, col.b);
      }
      tubeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      mat.vertexColors = true;
    }

    const mesh = new THREE.Mesh(tubeGeo, mat);
    this.group.add(mesh);
  }

  setVisible (v) { this.group.visible = v; }
  dispose () {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.scene.scene.remove(this.group);
  }
}

export class SurfaceChart3D {
  constructor (scene, data, scheme = 'heat') {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.scene.add(this.group);

    const gridN = Math.ceil(Math.sqrt(data.length));
    const geo   = new THREE.PlaneGeometry(20, 20, gridN - 1, gridN - 1);
    geo.rotateX(-Math.PI / 2);

    const posArr = geo.attributes.position.array;
    const colors = [];
    let maxH = 0;
    const heights = [];

    // Sample height from data
    for (let i = 0; i < posArr.length / 3; i++) {
      const d = data[i % data.length] || { y: 0 };
      heights.push(d.y);
      if (d.y > maxH) maxH = d.y;
    }

    for (let i = 0; i < posArr.length / 3; i++) {
      posArr[i * 3 + 1] = heights[i];
      const col = schemeColor(scheme, i / (posArr.length / 3), heights[i] / (maxH || 1));
      colors.push(col.r, col.g, col.b);
    }

    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat  = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side        : THREE.DoubleSide,
      shininess   : 40
    });

    const mesh = new THREE.Mesh(geo, mat);
    this.group.add(mesh);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x224466, wireframe: true, transparent: true, opacity: 0.3 });
    const wire    = new THREE.Mesh(geo.clone(), wireMat);
    this.group.add(wire);
  }

  setVisible (v) { this.group.visible = v; }
  dispose () {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.scene.scene.remove(this.group);
  }
}
