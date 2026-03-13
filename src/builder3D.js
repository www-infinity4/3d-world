/**
 * Builder3D – add/remove primitive objects and prefab structures to the scene.
 *
 * Features:
 *  • Primitive shapes (box, sphere, cylinder, torus, cone)
 *  • Prefab structures (marketplace, spa, corridor, plaza, tower)
 *  • Snap-to-grid positioning
 *  • Sector system – named zones that group placed structures
 *  • JSON export (includes sectors)
 */
import * as THREE from 'three';

const SNAP_SIZE       = 4; // grid unit for prefab structures (world units)
const PRIM_SNAP_SIZE  = 2; // finer grid for primitives (smaller objects)

export class Builder3D {
  constructor (scene) {
    this.scene   = scene;
    this.group   = new THREE.Group();
    this.objects = [];
    scene.scene.add(this.group);

    // ── Sector system ──
    this.sectors       = [];   // [{ name, color, group, objects }]
    this.activeSector  = null; // currently selected sector

    // ── Snap-to-grid ──
    this.snapToGrid = true;

    // Grid floor
    this.gridHelper = new THREE.GridHelper(120, 60, 0x334466, 0x223355);
    scene.scene.add(this.gridHelper);
    this._gridVisible = true;

    // Star-field background particles
    this._stars = this._buildStars();
    scene.scene.add(this._stars);
  }

  /* ─────────────────── Stars ─────────────────── */

  _buildStars () {
    const count = 2000;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r     = 150 + Math.random() * 100;
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

  /* ─────────────────── Grid snap ─────────────────── */

  _snap (v, unit) {
    return Math.round(v / unit) * unit;
  }

  _snappedPosition (base, unit = SNAP_SIZE) {
    if (!this.snapToGrid) return base.clone();
    return new THREE.Vector3(
      this._snap(base.x, unit),
      base.y,
      this._snap(base.z, unit)
    );
  }

  _randomBase (range = 24) {
    return new THREE.Vector3(
      (Math.random() - 0.5) * range,
      0,
      (Math.random() - 0.5) * range
    );
  }

  /* ─────────────────── Helpers ─────────────────── */

  _mat (hexColor, shininess = 80) {
    const col = new THREE.Color(hexColor);
    return new THREE.MeshPhongMaterial({
      color    : col,
      emissive : col.clone().multiplyScalar(0.15),
      shininess
    });
  }

  _mesh (geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow    = true;
    m.receiveShadow = true;
    return m;
  }

  _setShadows (group) {
    group.traverse(child => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
      }
    });
  }

  /* ─────────────────── Target group ─────────────────── */

  _targetGroup () {
    if (this.activeSector) return this.activeSector.group;
    return this.group;
  }

  _register (obj) {
    this.objects.push(obj);
    if (this.activeSector) this.activeSector.objects.push(obj);
  }

  /* ─────────────────── Primitive shapes ─────────────────── */

  addPrimitive (type, color, scale) {
    let geo;
    switch (type) {
      case 'sphere':   geo = new THREE.SphereGeometry(1, 32, 32); break;
      case 'cylinder': geo = new THREE.CylinderGeometry(0.8, 0.8, 2, 32); break;
      case 'torus':    geo = new THREE.TorusGeometry(1, 0.35, 16, 60); break;
      case 'cone':     geo = new THREE.ConeGeometry(1, 2, 32); break;
      default:         geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    }

    const mesh = this._mesh(geo, this._mat(color));
    mesh.scale.setScalar(scale);

    const base = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      0,
      (Math.random() - 0.5) * 20
    );
    const snapped = this._snappedPosition(base, PRIM_SNAP_SIZE);
    mesh.position.set(snapped.x, scale + 0.5, snapped.z);
    mesh.userData.structureType = type;

    this._targetGroup().add(mesh);
    this._register(mesh);
    return mesh;
  }

  /* ─────────────────── Prefab structures ─────────────────── */

  /**
   * Place a prefab structure into the scene.
   * @param {string}       type     – 'marketplace'|'spa'|'corridor'|'plaza'|'tower'
   * @param {string}       color    – hex color string
   * @param {number}       scale    – uniform scale factor
   * @param {THREE.Vector3|null} position – world position (snapped if snapToGrid)
   */
  addStructure (type, color = '#00aaff', scale = 1, position = null) {
    const group = new THREE.Group();
    group.userData.structureType = type;
    group.userData.color         = color;

    switch (type) {
      case 'marketplace': this._buildMarketplace(group, color); break;
      case 'spa':         this._buildSpa(group, color);         break;
      case 'corridor':    this._buildCorridor(group, color);    break;
      case 'plaza':       this._buildPlaza(group, color);       break;
      case 'tower':       this._buildTower(group, color);       break;
      default:            this._buildMarketplace(group, color);
    }

    group.scale.setScalar(scale);
    this._setShadows(group);

    const base  = position || this._randomBase(40);
    const final = this._snappedPosition(base);
    group.position.copy(final);

    this._targetGroup().add(group);
    this._register(group);
    return group;
  }

  /* ── Marketplace stall ── */
  _buildMarketplace (g, color) {
    const accent = '#cc8833';
    // Floor platform
    g.add(this._mesh(new THREE.BoxGeometry(4, 0.2, 4), this._mat('#223344')));
    // Corner poles
    for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
      const pole = this._mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 8), this._mat('#888899'));
      pole.position.set(x, 1.7, z);
      g.add(pole);
    }
    // Canopy
    const canopy = this._mesh(new THREE.BoxGeometry(4.6, 0.15, 4.6), this._mat(color));
    canopy.position.y = 3.3;
    g.add(canopy);
    // Counter
    const counter = this._mesh(new THREE.BoxGeometry(3.2, 0.8, 0.4), this._mat(accent));
    counter.position.set(0, 0.5, 1.9);
    g.add(counter);
    // Display shelf
    const shelf = this._mesh(new THREE.BoxGeometry(2.8, 0.08, 0.35), this._mat(accent));
    shelf.position.set(0, 1.1, 1.9);
    g.add(shelf);
    // Sign banner
    const sign = this._mesh(new THREE.BoxGeometry(2.5, 0.6, 0.08), this._mat(color));
    sign.position.set(0, 2.7, 2.1);
    g.add(sign);
  }

  /* ── Spa room ── */
  _buildSpa (g, color) {
    const wallMat  = this._mat(color);
    const floorMat = this._mat('#1a2a3a');
    const poolMat  = this._mat('#0066bb');
    // Floor
    const floor = this._mesh(new THREE.BoxGeometry(7, 0.2, 7), floorMat);
    floor.position.y = 0.1;
    g.add(floor);
    // Walls (four sides, with gap on one for doorway)
    const wallDefs = [
      [0, -3.4, 7.2, 0.2, 2.6],   // back
      [-3.4, 0, 0.2, 7, 2.6],     // left
      [3.4, 0, 0.2, 7, 2.6],      // right
    ];
    for (const [x, z, w, d, h] of wallDefs) {
      const wall = this._mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, h / 2, z);
      g.add(wall);
    }
    // Front wall with doorway
    const fwL = this._mesh(new THREE.BoxGeometry(2.3, 2.6, 0.2), wallMat);
    fwL.position.set(-2.45, 1.3, 3.4);
    g.add(fwL);
    const fwR = this._mesh(new THREE.BoxGeometry(2.3, 2.6, 0.2), wallMat);
    fwR.position.set(2.45, 1.3, 3.4);
    g.add(fwR);
    const arch = this._mesh(new THREE.BoxGeometry(2.4, 0.4, 0.2), wallMat);
    arch.position.set(0, 2.4, 3.4);
    g.add(arch);
    // Ceiling
    const ceiling = this._mesh(new THREE.BoxGeometry(7, 0.2, 7), wallMat);
    ceiling.position.y = 2.7;
    g.add(ceiling);
    // Pool (circular)
    const pool = this._mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.45, 28), poolMat);
    pool.position.set(0, 0.32, -0.5);
    g.add(pool);
    // Pool water surface
    const water = this._mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.05, 28),
      new THREE.MeshPhongMaterial({ color: 0x0099ff, transparent: true, opacity: 0.7, shininess: 200 }));
    water.position.set(0, 0.52, -0.5);
    g.add(water);
    // Lounge chairs
    for (const [x, z] of [[-2, 1.5], [2, 1.5]]) {
      const chair = this._mesh(new THREE.BoxGeometry(0.8, 0.25, 1.8), this._mat('#cc9966'));
      chair.position.set(x, 0.23, z);
      g.add(chair);
    }
  }

  /* ── Corridor connector ── */
  _buildCorridor (g, color) {
    const mat = this._mat(color);
    // Floor
    const floor = this._mesh(new THREE.BoxGeometry(2.4, 0.2, 6), this._mat('#1e2e3e'));
    floor.position.y = 0.1;
    g.add(floor);
    // Walls
    for (const x of [-1.1, 1.1]) {
      const wall = this._mesh(new THREE.BoxGeometry(0.2, 2.8, 6), mat);
      wall.position.set(x, 1.5, 0);
      g.add(wall);
    }
    // Ceiling
    const ceiling = this._mesh(new THREE.BoxGeometry(2.4, 0.2, 6), mat);
    ceiling.position.y = 2.9;
    g.add(ceiling);
    // Overhead strip lights
    for (const z of [-2, 0, 2]) {
      const light = this._mesh(new THREE.BoxGeometry(1.2, 0.08, 0.3),
        new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.6 }));
      light.position.set(0, 2.8, z);
      g.add(light);
    }
  }

  /* ── Plaza tile ── */
  _buildPlaza (g, color) {
    const mat = this._mat(color);
    // Main floor
    const floor = this._mesh(new THREE.BoxGeometry(8, 0.15, 8), mat);
    floor.position.y = 0.075;
    g.add(floor);
    // Decorative center fountain
    const base = this._mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.4, 16), this._mat('#aabbcc'));
    base.position.y = 0.35;
    g.add(base);
    const basin = this._mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 16),
      new THREE.MeshPhongMaterial({ color: 0x0088cc, transparent: true, opacity: 0.8, shininess: 200 }));
    basin.position.y = 0.67;
    g.add(basin);
    const pillar = this._mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 8), this._mat('#aabbcc'));
    pillar.position.y = 1.2;
    g.add(pillar);
    // Corner lamp posts
    for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) {
      const post = this._mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 8), this._mat('#667788'));
      post.position.set(x, 1.5, z);
      g.add(post);
      const lamp = this._mesh(new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshPhongMaterial({ color: 0xffee88, emissive: new THREE.Color(0xffee88), emissiveIntensity: 0.8 }));
      lamp.position.set(x, 3.15, z);
      g.add(lamp);
    }
    // Low perimeter railings
    for (const [x, z, w, d] of [[0, -3.9, 8, 0.18], [0, 3.9, 8, 0.18], [-3.9, 0, 0.18, 8], [3.9, 0, 0.18, 8]]) {
      const rail = this._mesh(new THREE.BoxGeometry(w, 0.55, d), this._mat('#99aabb'));
      rail.position.set(x, 0.42, z);
      g.add(rail);
    }
  }

  /* ── Tower ── */
  _buildTower (g, color) {
    const mat = this._mat(color);
    // Base platform
    const base = this._mesh(new THREE.CylinderGeometry(2.2, 2.8, 1.2, 8), mat);
    base.position.y = 0.6;
    g.add(base);
    // Tower body (3 tapering segments)
    const seg1 = this._mesh(new THREE.CylinderGeometry(1.6, 2.2, 4, 8), mat);
    seg1.position.y = 3.2;
    g.add(seg1);
    const seg2 = this._mesh(new THREE.CylinderGeometry(1.1, 1.6, 3.5, 8), mat);
    seg2.position.y = 6.95;
    g.add(seg2);
    const seg3 = this._mesh(new THREE.CylinderGeometry(0.7, 1.1, 2.5, 8), mat);
    seg3.position.y = 9.95;
    g.add(seg3);
    // Battlement ring
    for (let i = 0; i < 8; i++) {
      const a      = (i / 8) * Math.PI * 2;
      const merlon = this._mesh(new THREE.BoxGeometry(0.45, 0.9, 0.45), mat);
      merlon.position.set(Math.cos(a) * 0.75, 11.4, Math.sin(a) * 0.75);
      g.add(merlon);
    }
    // Spire
    const spire = this._mesh(new THREE.ConeGeometry(0.65, 3.5, 8), this._mat('#ff6600'));
    spire.position.y = 13.0;
    g.add(spire);
    // Windows (flat square insets)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const win = this._mesh(new THREE.BoxGeometry(0.5, 0.6, 0.1),
        new THREE.MeshPhongMaterial({ color: 0xffdd88, emissive: new THREE.Color(0xffdd88), emissiveIntensity: 0.5 }));
      win.position.set(Math.cos(a) * 1.55, 5.5, Math.sin(a) * 1.55);
      win.lookAt(win.position.clone().add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))));
      g.add(win);
    }
  }

  /* ─────────────────── Sector management ─────────────────── */

  /**
   * Create a new named sector (zone) in the scene.
   * @param {string} name  – unique sector name
   * @param {string} color – hex color for sector indicator
   * @returns {{ name, color, group, objects }}
   */
  addSector (name, color = '#00aaff') {
    if (this.sectors.find(s => s.name === name)) {
      return this.sectors.find(s => s.name === name);
    }
    const sectorGroup = new THREE.Group();
    sectorGroup.userData.sectorName  = name;
    sectorGroup.userData.sectorColor = color;
    this.group.add(sectorGroup);

    const sector = { name, color, group: sectorGroup, objects: [] };
    this.sectors.push(sector);
    return sector;
  }

  /** Set the active sector for subsequent addPrimitive / addStructure calls. */
  setActiveSector (name) {
    this.activeSector = this.sectors.find(s => s.name === name) || null;
  }

  getSectors () { return this.sectors; }

  /* ─────────────────── Scene management ─────────────────── */

  clearObjects () {
    for (const obj of [...this.objects]) {
      if (obj.type === 'Group') {
        obj.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(m => m.dispose());
          }
        });
      } else {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
      // Remove from whichever group holds it
      if (obj.parent) obj.parent.remove(obj);
    }
    this.objects = [];
    // Clear sector object lists
    for (const s of this.sectors) s.objects = [];
  }

  /** Clear per-sector object lists without removing objects from the scene. */
  clearSectorObjects () {
    for (const s of this.sectors) s.objects = [];
  }

  setGrid (visible) {
    this.gridHelper.visible = visible;
    this._gridVisible = visible;
  }

  setStars (visible) {
    this._stars.visible = visible;
  }

  /* ─────────────────── Export ─────────────────── */

  exportJSON () {
    const serializeObj = obj => {
      if (obj.isGroup) {
        return {
          type    : obj.userData.structureType || 'group',
          position: obj.position.toArray(),
          scale   : obj.scale.x,
          color   : obj.userData.color || '#ffffff'
        };
      }
      return {
        type    : obj.geometry ? obj.geometry.type : 'unknown',
        position: obj.position.toArray(),
        scale   : obj.scale.x,
        color   : obj.material ? '#' + obj.material.color.getHexString() : '#ffffff'
      };
    };

    const sectorData = this.sectors.map(s => ({
      name   : s.name,
      color  : s.color,
      objects: s.objects.map(serializeObj)
    }));

    // Ungrouped objects (not in any sector)
    const sectorObjs = new Set(this.sectors.flatMap(s => s.objects));
    const loose      = this.objects.filter(o => !sectorObjs.has(o)).map(serializeObj);

    return JSON.stringify({ sectors: sectorData, objects: loose }, null, 2);
  }

  dispose () {
    this.clearObjects();
    this.scene.scene.remove(this.group);
    this.scene.scene.remove(this.gridHelper);
    this.scene.scene.remove(this._stars);
  }
}
