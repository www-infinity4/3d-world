/**
 * main.js – 3D World Studio entry point.
 *
 * Wires together:
 *  • SceneManager (Three.js)
 *  • AudioAnalyzer (Web Audio API)
 *  • 5 visualizer modes: Spectrum · WaveRibbon · Particles · Globe · Tunnel
 *  • Charts3D (bar / scatter / line / surface)
 *  • Builder3D (primitive objects + prefab structures + sectors)
 *  • WorldNavigator (first-person walk mode)
 *  • Exporter (PNG + GIF with configurable duration)
 *  • MiniCanvases (sidebar waveform / freq display)
 *  • All UI controls
 */

import { SceneManager }    from './scene.js?v=20260903-repair1';
import { AudioAnalyzer }   from './audioAnalyzer.js';
import { Spectrum3D }      from './visualizers/spectrum3D.js';
import { WaveRibbon3D }    from './visualizers/waveform3D.js';
import { Particles3D }     from './visualizers/particles.js';
import { Globe3D }         from './visualizers/globe3D.js';
import { Tunnel3D }        from './visualizers/tunnel3D.js';
import { Builder3D }       from './builder3D.js';
import { WorldNavigator }  from './worldNavigator.js';
import {
  generateDataset,
  BarChart3D,
  ScatterChart3D,
  LineChart3D,
  SurfaceChart3D
} from './charts/charts3D.js';
import { Exporter }        from './export/exporter.js';
import { MiniCanvases }    from './ui/miniCanvases.js';

/* ════════════════════════════════════════════
   Bootstrap
════════════════════════════════════════════ */
const canvas = document.getElementById('mainCanvas');
const scene  = new SceneManager(canvas);
const audio  = new AudioAnalyzer();
scene.start();
document.getElementById('renderStatus').textContent = scene.isFallback
  ? 'Compatible canvas mode · all core tools ready'
  : 'WebGL studio ready';

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

/* ── World navigator (walk mode) ── */
const navigator = new WorldNavigator(scene.camera, scene.renderer, scene.controls);

/* ── Active chart ── */
let activeChart = null;

/* ── State ── */
let appMode = 'audio'; // audio | charts | build
let clips   = [];
let gifRecording = false;
let demoMode = true;

function demoData (elapsed) {
  const frequency = new Uint8Array(256);
  const waveform = new Uint8Array(512);
  for (let i = 0; i < frequency.length; i++) {
    const pulse = Math.max(0, Math.sin(elapsed * 2.4 - i * .055));
    frequency[i] = Math.max(0, Math.min(255, 28 + pulse * 168 + Math.sin(i * .31 + elapsed) * 28));
  }
  for (let i = 0; i < waveform.length; i++) {
    waveform[i] = 128 + Math.sin(i * .09 + elapsed * 4) * 55 + Math.sin(i * .021 - elapsed * 2) * 24;
  }
  return { frequency, waveform };
}

/* ════════════════════════════════════════════
   Animation loop callback
════════════════════════════════════════════ */
scene.addAnimCallback((delta, elapsed) => {
  const demo = demoData(elapsed);
  const freqData = demoMode ? demo.frequency : audio.getFrequencyData();
  const timeData = demoMode ? demo.waveform : audio.getWaveformData();
  scene.setFallbackData(freqData, timeData, activeViz, appMode);

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

  // Walk mode update
  navigator.update(delta);
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
const demoSignalBtn = document.getElementById('demoSignalBtn');

demoSignalBtn.addEventListener('click', () => {
  demoMode = !demoMode;
  demoSignalBtn.textContent = demoMode ? '⏸ Pause instant demo' : '✨ Start instant demo';
  document.getElementById('renderStatus').textContent = demoMode
    ? (scene.isFallback ? 'Compatible canvas demo running' : 'Instant signal demo running')
    : (scene.isFallback ? 'Compatible canvas mode · ready' : 'WebGL studio ready');
});

document.getElementById('audioFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  await audio.loadFile(file);
  demoMode = false;
  demoSignalBtn.textContent = '✨ Start instant demo';
  playBtn.disabled  = false;
  stopBtn.disabled  = false;
  sliceBtn.disabled = false;
  bpmEl.textContent = audio.estimateBPM();
  document.querySelector('.file-label').textContent = `📂 ${file.name}`;
});

document.getElementById('micBtn').addEventListener('click', async () => {
  try {
    await audio.startMic();
    demoMode = false;
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
   Builder controls – primitives
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

/* ── Structures ── */
document.getElementById('structureScale').addEventListener('input', e => {
  document.getElementById('structureScaleVal').textContent = parseFloat(e.target.value).toFixed(1);
});

document.getElementById('snapToGrid').addEventListener('change', e => {
  builder.snapToGrid = e.target.checked;
});

document.getElementById('addStructureBtn').addEventListener('click', () => {
  const type  = document.getElementById('structureType').value;
  const color = document.getElementById('structureColor').value;
  const scale = parseFloat(document.getElementById('structureScale').value);
  builder.addStructure(type, color, scale);
});

/* ── Sector management ── */
const activeSectorSelect = document.getElementById('activeSector');

document.getElementById('addSectorBtn').addEventListener('click', () => {
  const name  = document.getElementById('sectorName').value.trim();
  const color = document.getElementById('sectorColor').value;
  if (!name) { alert('Please enter a sector name.'); return; }

  const sector = builder.addSector(name, color);
  renderSectorList();

  // Auto-select new sector
  activeSectorSelect.value = name;
  builder.setActiveSector(name);
});

activeSectorSelect.addEventListener('change', e => {
  builder.setActiveSector(e.target.value || null);
});

function renderSectorList () {
  const sectors  = builder.getSectors();
  const list     = document.getElementById('sectorList');

  // Rebuild <select> options
  activeSectorSelect.innerHTML = '<option value="">— None (loose) —</option>';
  sectors.forEach(s => {
    const opt = document.createElement('option');
    opt.value       = s.name;
    opt.textContent = s.name;
    activeSectorSelect.appendChild(opt);
  });

  // Rebuild badge list
  list.innerHTML = '';
  sectors.forEach(s => {
    const badge = document.createElement('span');
    badge.className   = 'sector-badge';
    badge.textContent = `${s.name} (${s.objects.length})`;
    badge.style.borderColor = s.color;
    badge.style.color       = s.color;
    badge.title = `${s.objects.length} object(s) in sector "${s.name}"`;
    list.appendChild(badge);
  });
}

/* ── Scene management ── */
document.getElementById('clearSceneBtn').addEventListener('click', () => {
  builder.clearObjects();
  renderSectorList();
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
   Walk Mode
════════════════════════════════════════════ */
const walkModeBtn    = document.getElementById('walkModeBtn');
const walkIndicator  = document.getElementById('walkIndicator');
const walkHint       = document.getElementById('walkHint');
const autoRotateChk  = document.getElementById('autoRotate');

walkModeBtn.addEventListener('click', () => {
  if (navigator.active) {
    navigator.deactivate();
    exitWalkMode();
  } else {
    navigator.activate();
    enterWalkMode();
  }
});

function enterWalkMode () {
  walkModeBtn.textContent = '🛑 Exit Walk Mode';
  walkModeBtn.classList.add('active');
  walkIndicator.classList.remove('hidden');
  walkHint.classList.remove('hidden');
  // Pause auto-rotate while walking
  scene.controls.autoRotate = false;
  autoRotateChk.checked     = false;
}

function exitWalkMode () {
  walkModeBtn.textContent = '🚶 Walk Mode';
  walkModeBtn.classList.remove('active');
  walkIndicator.classList.add('hidden');
  walkHint.classList.add('hidden');
}

// Auto-exit walk mode when pointer lock is released
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && navigator.active) {
    navigator.deactivate();
    exitWalkMode();
  }
});

/* ════════════════════════════════════════════
   Export controls
════════════════════════════════════════════ */
document.getElementById('exportPngBtn').addEventListener('click', () => {
  exporter.exportPNG();
});

const gifBtn       = document.getElementById('exportGifBtn');
const gifIndicator = document.getElementById('gifIndicator');
const gifCountdown = document.getElementById('gifCountdown');

gifBtn.addEventListener('click', () => {
  if (gifRecording) return;

  const duration = Math.max(2, Math.min(30,
    parseInt(document.getElementById('gifDuration').value) || 5
  )) * 1000; // convert to ms

  gifRecording = true;
  gifBtn.disabled = true;
  gifBtn.textContent = '⏺ Recording…';
  gifIndicator.classList.remove('hidden');

  let remaining = Math.round(duration / 1000);
  gifCountdown.textContent = `${remaining}s`;
  const ticker = setInterval(() => {
    remaining--;
    gifCountdown.textContent = remaining > 0 ? `${remaining}s` : '';
  }, 1000);

  exporter.startGIF();

  setTimeout(() => {
    clearInterval(ticker);
    gifCountdown.textContent = '';
    exporter.stopGIF(
      (p)  => { gifBtn.textContent = `⏳ ${Math.round(p * 100)}%`; },
      ()   => {
        gifRecording = false;
        gifBtn.disabled = false;
        gifBtn.textContent = '🎞️ Record GIF';
        gifIndicator.classList.add('hidden');
      }
    );
  }, duration);
});
