/**
 * AudioAnalyzer – wraps the Web Audio API for real-time analysis.
 *
 * Responsibilities:
 *  • Load audio files (ArrayBuffer)
 *  • Capture microphone input
 *  • Provide FFT frequency data + time-domain waveform data
 *  • 8-band equalizer (BiquadFilter nodes)
 *  • Volume gain
 *  • Playback control
 *  • "Slice" audio into short analysable clips
 */
export class AudioAnalyzer {
  constructor () {
    this.ctx         = null;   // AudioContext (created on first user gesture)
    this.source      = null;   // AudioBufferSourceNode | MediaStreamAudioSourceNode
    this.gainNode    = null;
    this.analyser    = null;
    this.eqFilters   = [];     // 8 BiquadFilterNode
    this.audioBuffer = null;   // decoded audio
    this.stream      = null;   // MediaStream (mic)
    this.isPlaying   = false;
    this.startedAt   = 0;
    this.pauseOffset = 0;

    // FFT buffers – allocated after analyser is created
    this.freqData  = null;
    this.timeData  = null;

    // EQ band frequencies (Hz)
    this.eqFreqs = [60, 170, 310, 600, 1000, 3000, 6000, 14000];

    // Callbacks
    this.onEnded = null;
  }

  /* ─── initialise AudioContext ─── */
  async init () {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._buildGraph();
  }

  _buildGraph () {
    const ctx = this.ctx;

    // Gain node
    this.gainNode = ctx.createGain();

    // EQ filters
    this.eqFilters = this.eqFreqs.map((freq, i) => {
      const f = ctx.createBiquadFilter();
      f.type      = i === 0 ? 'lowshelf' : i === this.eqFreqs.length - 1 ? 'highshelf' : 'peaking';
      f.frequency.value = freq;
      f.gain.value      = 0;
      f.Q.value         = 1;
      return f;
    });

    // Analyser
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize          = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);

    // Chain: gainNode → eq[0] → … → eq[n] → analyser → destination
    let prev = this.gainNode;
    for (const f of this.eqFilters) {
      prev.connect(f);
      prev = f;
    }
    prev.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }

  /* ─── Load audio from File object ─── */
  async loadFile (file) {
    await this.init();
    const ab = await file.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(ab);
    return this.audioBuffer;
  }

  /* ─── Microphone input ─── */
  async startMic () {
    await this.init();
    this.stopPlayback();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.source.connect(this.gainNode);
    this.isPlaying = true;
  }

  stopMic () {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (_) { /* empty */ }
      this.source = null;
    }
    this.isPlaying = false;
  }

  /* ─── Playback ─── */
  play (offset = 0) {
    if (!this.audioBuffer || !this.ctx) return;
    this.stopPlayback();

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.gainNode);
    this.source.onended = () => {
      this.isPlaying   = false;
      this.pauseOffset = 0;
      if (this.onEnded) this.onEnded();
    };

    this.source.start(0, offset);
    this.startedAt   = this.ctx.currentTime - offset;
    this.pauseOffset = 0;
    this.isPlaying   = true;
  }

  pause () {
    if (!this.isPlaying || !this.source) return;
    this.pauseOffset = this.ctx.currentTime - this.startedAt;
    this.source.stop();
    this.isPlaying = false;
  }

  stopPlayback () {
    if (this.source) {
      try { this.source.stop(); } catch (_) { /* empty */ }
      try { this.source.disconnect(); } catch (_) { /* empty */ }
      this.source = null;
    }
    this.isPlaying   = false;
    this.pauseOffset = 0;
  }

  get currentTime () {
    if (!this.ctx) return 0;
    if (this.isPlaying) return this.ctx.currentTime - this.startedAt;
    return this.pauseOffset;
  }

  get duration () {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  /* ─── FFT settings ─── */
  setFftSize (size) {
    if (!this.analyser) return;
    this.analyser.fftSize = size;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);
  }

  setSmoothing (v) {
    if (this.analyser) this.analyser.smoothingTimeConstant = v;
  }

  /* ─── Volume ─── */
  setVolume (v) {
    if (this.gainNode) this.gainNode.gain.value = v;
  }

  /* ─── EQ ─── */
  setEqBand (index, gainDb) {
    if (this.eqFilters[index]) this.eqFilters[index].gain.value = gainDb;
  }

  /* ─── Data getters ─── */
  getFrequencyData () {
    if (!this.analyser) return this.freqData || new Uint8Array(0);
    this.analyser.getByteFrequencyData(this.freqData);
    return this.freqData;
  }

  getWaveformData () {
    if (!this.analyser) return this.timeData || new Uint8Array(0);
    this.analyser.getByteTimeDomainData(this.timeData);
    return this.timeData;
  }

  /* ─── Derived metrics ─── */
  getRMS () {
    const td = this.getWaveformData();
    let sum = 0;
    for (let i = 0; i < td.length; i++) {
      const v = (td[i] / 128) - 1;
      sum += v * v;
    }
    return Math.sqrt(sum / td.length);
  }

  getPeakFrequency () {
    const fd    = this.getFrequencyData();
    let max = -1, idx = 0;
    for (let i = 0; i < fd.length; i++) {
      if (fd[i] > max) { max = fd[i]; idx = i; }
    }
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    return (idx * sampleRate) / (this.analyser ? this.analyser.fftSize : 2048);
  }

  /** Estimate BPM using zero-crossing rate as a fast heuristic */
  estimateBPM () {
    if (!this.audioBuffer) return 0;
    const data  = this.audioBuffer.getChannelData(0);
    const sr    = this.audioBuffer.sampleRate;
    const step  = Math.floor(sr * 0.01); // 10 ms buckets
    let crosses = 0;
    for (let i = step; i < Math.min(data.length, sr * 10); i += step) {
      if (Math.sign(data[i]) !== Math.sign(data[i - step])) crosses++;
    }
    const hz  = crosses / (Math.min(data.length, sr * 10) / sr);
    const bpm = Math.round((hz / 2) * 60 / 4);
    return Math.min(Math.max(bpm, 40), 220);
  }

  /* ─── Clip slicer ─── */
  /**
   * Split the loaded audioBuffer into clips of `clipLenSec` seconds.
   * Returns an array of { index, start, end, buffer, rms } objects.
   */
  sliceIntoClips (clipLenSec) {
    if (!this.audioBuffer) return [];
    const buf  = this.audioBuffer;
    const sr   = buf.sampleRate;
    const ch   = buf.numberOfChannels;
    const step = Math.floor(sr * clipLenSec);
    const clips = [];

    for (let offset = 0; offset < buf.length; offset += step) {
      const len    = Math.min(step, buf.length - offset);
      const clip   = this.ctx.createBuffer(ch, len, sr);
      let   sumSq  = 0;

      for (let c = 0; c < ch; c++) {
        const src = buf.getChannelData(c).subarray(offset, offset + len);
        clip.copyToChannel(src, c);
        for (let i = 0; i < src.length; i++) sumSq += src[i] * src[i];
      }

      const rms = Math.sqrt(sumSq / (len * ch));
      clips.push({
        index : clips.length,
        start : offset / sr,
        end   : (offset + len) / sr,
        buffer: clip,
        rms
      });
    }

    return clips;
  }

  /** Play a clip buffer */
  playClip (clipBuffer) {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource();
    s.buffer = clipBuffer;
    s.connect(this.gainNode);
    s.start();
  }
}
