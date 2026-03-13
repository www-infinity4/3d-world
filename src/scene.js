/**
 * SceneManager – wraps Three.js scene, camera, renderer, and OrbitControls.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
  constructor (canvas) {
    this.canvas   = canvas;
    this.objects  = [];       // managed scene objects
    this.animCbs  = [];       // per-frame callbacks
    this._running = false;
    this._raf     = null;
    this._clock   = new THREE.Clock();
    this._frames  = 0;
    this._lastFpsTime = 0;
    this.fps      = 0;

    this._init();
  }

  _init () {
    /* ── Renderer ── */
    this.renderer = new THREE.WebGLRenderer({
      canvas        : this.canvas,
      antialias     : true,
      alpha         : false,
      preserveDrawingBuffer: true  // needed for PNG export
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;

    /* ── Scene ── */
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080810);
    this.scene.fog = new THREE.FogExp2(0x080810, 0.02);

    /* ── Camera ── */
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 30);

    /* ── Controls ── */
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping    = true;
    this.controls.dampingFactor    = 0.05;
    this.controls.autoRotate       = true;
    this.controls.autoRotateSpeed  = 0.4;
    this.controls.minDistance      = 2;
    this.controls.maxDistance      = 200;

    /* ── Lights ── */
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    this.pointLight = new THREE.PointLight(0x00aaff, 2, 60);
    this.pointLight.position.set(0, 10, 0);
    this.scene.add(this.pointLight);

    this.pointLight2 = new THREE.PointLight(0xaa00ff, 1.5, 60);
    this.pointLight2.position.set(-10, 5, -10);
    this.scene.add(this.pointLight2);

    /* ── Resize observer ── */
    const ro = new ResizeObserver(() => this._onResize());
    ro.observe(this.canvas.parentElement);
  }

  _onResize () {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /* ─── Animation loop ─── */
  start () {
    if (this._running) return;
    this._running = true;
    this._clock.start();
    this._loop();
  }

  stop () {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _loop () {
    if (!this._running) return;
    this._raf = requestAnimationFrame(() => this._loop());

    const delta = this._clock.getDelta();
    const elapsed = this._clock.getElapsedTime();

    // FPS counter
    this._frames++;
    if (elapsed - this._lastFpsTime >= 1) {
      this.fps = this._frames;
      this._frames = 0;
      this._lastFpsTime = elapsed;
    }

    // Animate point lights
    this.pointLight.position.x  = Math.sin(elapsed * 0.4) * 15;
    this.pointLight.position.z  = Math.cos(elapsed * 0.4) * 15;
    this.pointLight2.position.x = Math.cos(elapsed * 0.3) * 12;
    this.pointLight2.position.z = Math.sin(elapsed * 0.3) * 12;

    this.controls.update();

    // Call all registered animation callbacks
    for (const cb of this.animCbs) cb(delta, elapsed);

    this.renderer.render(this.scene, this.camera);
  }

  /* ─── API ─── */
  addAnimCallback (fn) { this.animCbs.push(fn); }
  removeAnimCallback (fn) {
    const i = this.animCbs.indexOf(fn);
    if (i !== -1) this.animCbs.splice(i, 1);
  }

  add (obj) { this.scene.add(obj); this.objects.push(obj); }

  remove (obj) {
    this.scene.remove(obj);
    const i = this.objects.indexOf(obj);
    if (i !== -1) this.objects.splice(i, 1);
  }

  /** Dispose all user-added objects */
  clearObjects () {
    for (const obj of [...this.objects]) {
      this.disposeObject(obj);
      this.scene.remove(obj);
    }
    this.objects = [];
  }

  disposeObject (obj) {
    obj.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(m => m.dispose());
      }
    });
  }

  /* ─── Background presets ─── */
  setBackground (preset) {
    switch (preset) {
      case 'space':
        this.scene.background = new THREE.Color(0x080810);
        this.scene.fog = new THREE.FogExp2(0x080810, 0.01);
        break;
      case 'grid':
        this.scene.background = new THREE.Color(0x080810);
        this.scene.fog = null;
        break;
      case 'fog':
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.04);
        break;
      case 'black':
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = null;
        break;
    }
  }

  /** Export current frame as PNG data-URL */
  exportPNG () {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }
}
