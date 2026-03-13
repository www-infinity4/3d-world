/**
 * Exporter – PNG screenshot and GIF recorder.
 *
 * GIF recording uses the open-source gif.js library loaded from CDN.
 * Frames are captured at ~15 fps for 3 seconds then compiled.
 */

export class Exporter {
  constructor (renderer, scene, camera) {
    this.renderer = renderer;
    this.scene    = scene;
    this.camera   = camera;
    this._recording = false;
    this._frames    = [];
    this._gifWorker = null;
  }

  /* ─── PNG ─── */
  exportPNG (filename = '3d-world-export.png') {
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this._download(url, filename);
  }

  /* ─── GIF ─── */
  /** Start capturing frames (non-blocking).  Call stopGIF() after desired duration. */
  startGIF () {
    if (this._recording) return;
    this._recording = true;
    this._frames    = [];
    this._captureInterval = setInterval(() => this._captureFrame(), 1000 / 15);
  }

  _captureFrame () {
    this.renderer.render(this.scene, this.camera);
    const canvas = this.renderer.domElement;
    // Downscale to keep GIF size manageable
    const scale = 0.5;
    const w = Math.floor(canvas.width  * scale);
    const h = Math.floor(canvas.height * scale);

    const tmp = document.createElement('canvas');
    tmp.width  = w;
    tmp.height = h;
    tmp.getContext('2d').drawImage(canvas, 0, 0, w, h);
    this._frames.push({ dataURL: tmp.toDataURL('image/png'), width: w, height: h });
  }

  stopGIF (onProgress, onDone) {
    if (!this._recording) return;
    this._recording = false;
    clearInterval(this._captureInterval);

    const frames = this._frames;
    if (!frames.length) return;

    // Load gif.js dynamically from CDN
    if (!window.GIF) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js';
      script.onload = () => this._encodeGIF(frames, onProgress, onDone);
      document.head.appendChild(script);
    } else {
      this._encodeGIF(frames, onProgress, onDone);
    }
  }

  _encodeGIF (frames, onProgress, onDone) {
    const { width, height } = frames[0];

    /* global GIF */
    const gif = new GIF({
      workers  : 2,
      quality  : 12,
      width,
      height,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
    });

    const loadImage = (dataURL) => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src    = dataURL;
    });

    (async () => {
      for (const f of frames) {
        const img = await loadImage(f.dataURL);
        gif.addFrame(img, { delay: 67 }); // ~15 fps
      }

      gif.on('progress', p => { if (onProgress) onProgress(p); });
      gif.on('finished', blob => {
        const url = URL.createObjectURL(blob);
        this._download(url, '3d-world-recording.gif');
        if (onDone) onDone();
      });

      gif.render();
    })();
  }

  _download (url, filename) {
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
  }
}
