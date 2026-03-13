/**
 * MiniCanvases – draw 2D waveform and frequency spectrum overlays
 * in the small canvases shown in the sidebar.
 */
export class MiniCanvases {
  constructor (waveCanvas, freqCanvas) {
    this.waveCtx = waveCanvas.getContext('2d');
    this.freqCtx = freqCanvas.getContext('2d');
    this.ww = waveCanvas.width;
    this.wh = waveCanvas.height;
    this.fw = freqCanvas.width;
    this.fh = freqCanvas.height;
  }

  drawWaveform (timeData) {
    const ctx = this.waveCtx;
    const W = this.ww, H = this.wh;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth   = 1.5;

    const step = Math.ceil(timeData.length / W);
    for (let x = 0; x < W; x++) {
      const i = x * step;
      const v = i < timeData.length ? (timeData[i] / 128) - 1 : 0;
      const y = (v * H / 2) + H / 2;
      if (x === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawFrequency (freqData) {
    const ctx = this.freqCtx;
    const W = this.fw, H = this.fh;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const barW = W / freqData.length;

    for (let i = 0; i < freqData.length; i++) {
      const v   = freqData[i] / 255;
      const h   = v * H;
      const hue = i / freqData.length * 300;
      ctx.fillStyle = `hsl(${hue}, 100%, 55%)`;
      ctx.fillRect(i * barW, H - h, Math.max(1, barW - 1), h);
    }
  }
}
