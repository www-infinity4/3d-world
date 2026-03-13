/**
 * main.js – 3D World Studio entry point.
 *
 * Wires together:
 *  • SceneManager (Three.js)
 *  • AudioAnalyzer (Web Audio API)
 *  • 5 visualizer modes: Spectrum · WaveRibbon · Particles · Globe · Tunnel
 *  • Charts3D (bar / scatter / line / surface)
 *  • Builder3D (primitive objects)
 *  • Exporter (PNG + GIF)
 *  • MiniCanvases (sidebar waveform / freq display)
 *  • All UI controls
 */

import { SceneManager }  from './scene.js';
import { AudioAnalyzer } from './audioAnalyzer.js';
import { Spectrum3D }    from './visualizers/spectrum3D.js';
import { WaveRibbon3D }  from './visualizers/waveform3D.js';
import { Particles3D }   from './visualizers/particles.js';
import { Globe3D }       from './visualizers/globe3D.js';
import { Tunnel3D }      from './visualizers/tunnel3D.js';
import { Builder3D }     from './builder3D.js';
import {
  generateDataset,
  BarChart3D,
  ScatterChart3D,
  LineChart3D,
  SurfaceChart3D
} from './charts/charts3D.js';
import { Exporter }      from './export/exporter.js';
import { MiniCanvases }  from './ui/miniCanvases.js';

/* ════════════════════════════════════════════
   Bootstrap
════════════════════════════════════════════ */
const canvas = document.getElementById('mainCanvas');
const scene  = new SceneManager(canvas);
const audio  = new AudioAnalyzer();
scene.start();

/* ── Exporter ── */
const exporter = new Exporter(scene.renderer, scene.scene, scene.camera);

/* ── Mini canvases ── */
const mini = new MiniCanvases(
  document.getElementById('waveCanvas'),
  document.getElementById('freqCanvas')
);

/* ── Visualizers ── */
const spectrum  = new Spectrum3D(scene);
const waveRib   = new WaveRibbon3D(scene);
const particles = new Particles3D(scene);
const globe     = new Globe3D(scene);
const tunnel    = new Tunnel3D(scene);

const ALL_VIZ = { spectrum, waveRibbon: waveRib, particles, globe, tunnel };
let activeViz = 'spectrum';

function setVizMode (mode) {
  activeViz = mode;
  for (const [k, v] of Object.entries(ALL_VIZ)) v.setVisible(k === mode);
}
setVizMode('spectrum');

/* ── Builder ── */
const builder = new Builder3D(scene);
builder.setGrid(false); // hidden until Build mode

/* ── Active chart ── */
let activeChart = null;

/* ── State ── */
let appMode = 'audio'; // audio | charts | build
let clips   = [];
let gifRecording = false;

/* ════════════════════════════════════════════
   Animation loop callback
════════════════════════════════════════════ */
scene.addAnimCallback((delta, elapsed) => {
  const freqData = audio.getFrequencyData();
  const timeData = audio.getWaveformData();

  // Feed active visualizer
  switch (activeViz) {
    case 'spectrum':   spectrum.update(freqData);          break;
    case 'waveRibbon': waveRib.update(timeData);           break;
    case 'particles':  particles.update(freqData, elapsed);break;
    case 'globe':      globe.update(freqData);             break;
    case 'tunnel':     tunnel.update(freqData, elapsed);   break;
  }

  // Mini canvases
  mini.drawWaveform(timeData);
  mini.drawFrequency(freqData.slice(0, 64));

  // Live stats
  updateStats(freqData, timeData);
});

/* ════════════════════════════════════════════
   Live stats
════════════════════════════════════════════ */
const bpmEl    = document.getElementById('bpmVal');
const peakEl   = document.getElementById('peakFreqVal');
const rmsEl    = document.getElementById('rmsVal');
const loudEl   = document.getElementById('loudnessVal');
const fpsEl    = document.getElementById('fpsVal');

let bpm = 0;
let statsThrottle = 0;

function updateStats (freqData, timeData) {
  statsThrottle++;
  if (statsThrottle % 30 !== 0) return; // update every 30 frames

  const rms    = audio.getRMS();
  const peak   = audio.getPeakFrequency();
  const loud   = Math.round(rms * 100);

  if (statsThrottle % 300 === 0 && audio.audioBuffer) {
    bpm = audio.estimateBPM();
    bpmEl.textContent = bpm;
  }

  peakEl.textContent  = peak > 0 ? `${Math.round(peak)} Hz` : '–';
  rmsEl.textContent   = rms.toFixed(3);
  loudEl.textContent  = `${loud}%`;
  fpsEl.textContent   = scene.fps;
}

/* ════════════════════════════════════════════
   Mode tabs
════════════════════════════════════════════ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    appMode = btn.dataset.mode;
    switchMode(appMode);
  });
});

function switchMode (mode) {
  // panels
  document.getElementById('audioPanel').classList.toggle('hidden',  mode !== 'audio');
  document.getElementById('chartsPanel').classList.toggle('hidden', mode !== 'charts');
  document.getElementById('buildPanel').classList.toggle('hidden',  mode !== 'build');

  // right panel
  document.getElementById('infoPanel').style.display = mode === 'audio' ? '' : 'none';

  // visualizers
  for (const v of Object.values(ALL_VIZ)) v.setVisible(false);

  if (mode === 'audio') {
    setVizMode(activeViz);
    builder.setGrid(false);
    builder.setStars(false);
    if (activeChart) activeChart.setVisible(false);
  } else if (mode === 'charts') {
    builder.setGrid(false);
    builder.setStars(false);
    if (activeChart) activeChart.setVisible(true);
  } else if (mode === 'build') {
    builder.setGrid(true);
    builder.setStars(true);
    if (activeChart) activeChart.setVisible(false);
  }
}

/* ════════════════════════════════════════════
   Viz mode buttons (right panel)
════════════════════════════════════════════ */
document.querySelectorAll('.viz-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.viz-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setVizMode(btn.dataset.viz);
  });
});

/* ════════════════════════════════════════════
   Audio controls
════════════════════════════════════════════ */
const playBtn  = document.getElementById('playBtn');
const stopBtn  = document.getElementById('stopBtn');
const sliceBtn = document.getElementById('sliceBtn');

document.getElementById('audioFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  await audio.loadFile(file);
  playBtn.disabled  = false;
  stopBtn.disabled  = false;
  sliceBtn.disabled = false;
  bpmEl.textContent = audio.estimateBPM();
  document.querySelector('.file-label').textContent = `📂 ${file.name}`;
});

document.getElementById('micBtn').addEventListener('click', async () => {
  try {
    await audio.startMic();
    playBtn.disabled = true;
    stopBtn.disabled = false;
  } catch (err) {
    alert('Microphone access denied: ' + err.message);
  }
});

let isPlaying = false;
playBtn.addEventListener('click', () => {
  if (!isPlaying) {
    audio.play(audio.pauseOffset);
    playBtn.textContent = '⏸ Pause';
    isPlaying = true;
  } else {
    audio.pause();
    playBtn.textContent = '▶ Play';
    isPlaying = false;
  }
});

audio.onEnded = () => {
  playBtn.textContent = '▶ Play';
  isPlaying = false;
};

stopBtn.addEventListener('click', () => {
  audio.stopPlayback();
  audio.stopMic();
  playBtn.textContent = '▶ Play';
  isPlaying = false;
});

/* Volume */
document.getElementById('volSlider').addEventListener('input', e => {
  const v = e.target.value / 100;
  audio.setVolume(v);
  document.getElementById('volVal').textContent = e.target.value;
});

/* FFT size */
document.getElementById('fftSize').addEventListener('change', e => {
  audio.setFftSize(parseInt(e.target.value));
});

/* Smoothing */
document.getElementById('smoothing').addEventListener('input', e => {
  audio.setSmoothing(e.target.value / 100);
});

/* ── Equalizer ── */
const EQ_LABELS = ['60', '170', '310', '600', '1k', '3k', '6k', '14k'];
const eqGrid    = document.getElementById('eqGrid');

EQ_LABELS.forEach((label, i) => {
  const band = document.createElement('div');
  band.className = 'eq-band';

  const slider = document.createElement('input');
  slider.type  = 'range';
  slider.min   = '-12';
  slider.max   = '12';
  slider.value = '0';
  slider.style.writingMode  = 'vertical-lr';
  slider.style.direction    = 'rtl';
  slider.addEventListener('input', e => audio.setEqBand(i, parseFloat(e.target.value)));

  const lbl = document.createElement('span');
  lbl.textContent = label;

  band.appendChild(slider);
  band.appendChild(lbl);
  eqGrid.appendChild(band);
});

/* ── Clip slicer ── */
sliceBtn.addEventListener('click', () => {
  const len  = parseFloat(document.getElementById('clipLen').value) || 2;
  clips      = audio.sliceIntoClips(len);
  renderClips(clips);
});

function renderClips (clips) {
  const container = document.getElementById('clipList');
  container.innerHTML = '';
  clips.forEach(clip => {
    const btn = document.createElement('button');
    btn.className = 'clip-item';
    btn.textContent = `#${clip.index + 1}`;
    btn.title = `${clip.start.toFixed(1)}s – ${clip.end.toFixed(1)}s  rms:${clip.rms.toFixed(3)}`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.clip-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      audio.playClip(clip.buffer);
      showClipDetail(clip);
    });
    container.appendChild(btn);
  });
}

function showClipDetail (clip) {
  const el = document.getElementById('clipDetail');
  el.innerHTML = `
    <b>Clip #${clip.index + 1}</b><br/>
    Start: ${clip.start.toFixed(2)}s<br/>
    End: ${clip.end.toFixed(2)}s<br/>
    Duration: ${(clip.end - clip.start).toFixed(2)}s<br/>
    RMS: ${clip.rms.toFixed(4)}
  `;
}

/* ════════════════════════════════════════════
   Charts controls
════════════════════════════════════════════ */
document.getElementById('chartPoints').addEventListener('input', e => {
  document.getElementById('chartPointsVal').textContent = e.target.value;
});

document.getElementById('buildChartBtn').addEventListener('click', () => {
  const type    = document.getElementById('chartType').value;
  const preset  = document.getElementById('datasetPreset').value;
  const count   = parseInt(document.getElementById('chartPoints').value);
  const scheme  = document.getElementById('colorScheme').value;
  const wire    = document.getElementById('wireframeToggle').checked;
  const data    = generateDataset(preset, count);

  // Dispose previous
  if (activeChart) {
    activeChart.dispose();
    activeChart = null;
  }
  // Dispose audio visualizers in this mode
  for (const v of Object.values(ALL_VIZ)) v.setVisible(false);

  switch (type) {
    case 'bar':     activeChart = new BarChart3D(scene, data, scheme);     break;
    case 'scatter': activeChart = new ScatterChart3D(scene, data, scheme); break;
    case 'line':    activeChart = new LineChart3D(scene, data, scheme);    break;
    case 'surface': activeChart = new SurfaceChart3D(scene, data, scheme); break;
  }
});

/* ════════════════════════════════════════════
   Builder controls
════════════════════════════════════════════ */
document.getElementById('primitiveScale').addEventListener('input', e => {
  document.getElementById('primitiveScaleVal').textContent = parseFloat(e.target.value).toFixed(1);
});

document.getElementById('addPrimitiveBtn').addEventListener('click', () => {
  const type  = document.getElementById('primitiveType').value;
  const color = document.getElementById('primitiveColor').value;
  const scale = parseFloat(document.getElementById('primitiveScale').value);
  builder.addPrimitive(type, color, scale);
});

document.getElementById('clearSceneBtn').addEventListener('click', () => {
  builder.clearObjects();
});

document.getElementById('bgPreset').addEventListener('change', e => {
  scene.setBackground(e.target.value);
});

document.getElementById('autoRotate').addEventListener('change', e => {
  scene.controls.autoRotate = e.target.checked;
});

document.getElementById('particleToggle').addEventListener('change', e => {
  builder.setStars(e.target.checked);
});

document.getElementById('exportSceneBtn').addEventListener('click', () => {
  const json = builder.exportJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = '3d-world-scene.json';
  a.click();
});

/* ════════════════════════════════════════════
   Export controls
════════════════════════════════════════════ */
document.getElementById('exportPngBtn').addEventListener('click', () => {
  exporter.exportPNG();
});

const gifBtn      = document.getElementById('exportGifBtn');
const gifIndicator = document.getElementById('gifIndicator');

gifBtn.addEventListener('click', () => {
  if (gifRecording) return;
  gifRecording = true;
  gifBtn.disabled = true;
  gifBtn.textContent = '⏺ Recording…';
  gifIndicator.classList.remove('hidden');

  exporter.startGIF();

  setTimeout(() => {
    exporter.stopGIF(
      (p)  => { gifBtn.textContent = `⏳ ${Math.round(p * 100)}%`; },
      ()   => {
        gifRecording = false;
        gifBtn.disabled = false;
        gifBtn.textContent = '🎞️ Record GIF';
        gifIndicator.classList.add('hidden');
      }
    );
  }, 3000);
});
