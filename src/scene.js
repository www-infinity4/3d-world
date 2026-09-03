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
    try {
      if (!this._supportsWebGL()) throw new Error('WebGL is not available in this browser');
      this.renderer = new THREE.WebGLRenderer({
        canvas        : this.canvas,
        antialias     : true,
        alpha         : false,
        preserveDrawingBuffer: true
      });
      this.isFallback = false;
    } catch (error) {
      console.warn('WebGL is unavailable; using the World Studio canvas renderer.', error);
      this.isFallback = true;
      this._fallbackContext = this.canvas.getContext('2d');
      this.renderer = this._createCanvasRenderer();
      document.documentElement.classList.add('canvas-fallback');
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    if (!this.isFallback) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    }

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
    this.controls = this.isFallback ? {
      enabled: true, autoRotate: true, update () {}, dispose () {}
    } : new OrbitControls(this.camera, this.renderer.domElement);
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

  _supportsWebGL () {
    try {
      const probe = document.createElement('canvas');
      return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
    } catch (_) {
      return false;
    }
  }

  _createCanvasRenderer () {
    const renderer = {
      domElement: this.canvas,
      shadowMap: {},
      setPixelRatio () {},
      setSize: (w, h) => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.max(1, Math.floor(w * ratio));
        this.canvas.height = Math.max(1, Math.floor(h * ratio));
      },
      render: () => this._renderCanvasFallback()
    };
    return renderer;
  }

  setFallbackData (frequency, waveform, viz, mode) {
    this._fallbackData = { frequency, waveform, viz, mode };
  }

  _renderCanvasFallback () {
    const ctx = this._fallbackContext;
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const data = this._fallbackData || {};
    const freq = data.frequency || [];
    const wave = data.waveform || [];
    const t = performance.now() / 1000;
    const bg = ctx.createRadialGradient(w * .52, h * .42, 0, w * .52, h * .42, Math.max(w, h) * .72);
    bg.addColorStop(0, '#142a52'); bg.addColorStop(.48, '#090e23'); bg.addColorStop(1, '#03050d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(80,170,255,.13)'; ctx.lineWidth = 1;
    const step = Math.max(36, Math.floor(w / 18));
    for (let x = (t * 12) % step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const count = Math.min(72, freq.length || 72);
    const barW = w / count;
    for (let i = 0; i < count; i++) {
      const synthetic = 70 + 52 * Math.sin(t * 2.2 + i * .24) + 24 * Math.sin(t * .7 + i * .67);
      const value = freq.length ? freq[Math.floor(i * freq.length / count)] : synthetic;
      const bh = Math.max(3, (value / 255) * h * .54);
      const hue = 188 + (i / count) * 92;
      ctx.fillStyle = `hsla(${hue}, 95%, 62%, .78)`;
      ctx.fillRect(i * barW + 1, h - bh, Math.max(2, barW - 3), bh);
    }

    ctx.beginPath();
    for (let i = 0; i < 180; i++) {
      const x = i / 179 * w;
      const source = wave.length ? (wave[Math.floor(i * wave.length / 180)] - 128) / 128 : Math.sin(i * .17 + t * 3) * .42;
      const y = h * .38 + source * h * .18;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = '#85f5ff'; ctx.lineWidth = Math.max(2, w / 700); ctx.shadowBlur = 18; ctx.shadowColor = '#00c8ff'; ctx.stroke(); ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(235,246,255,.94)'; ctx.font = `700 ${Math.max(18, w / 45)}px system-ui`;
    ctx.fillText((data.mode || 'audio').toUpperCase() + ' · LIVE CANVAS', 26, 42);
    ctx.fillStyle = 'rgba(190,215,240,.7)'; ctx.font = `500 ${Math.max(12, w / 85)}px system-ui`;
    ctx.fillText('Compatible mode active — create, analyze and export without WebGL', 27, 68);
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
