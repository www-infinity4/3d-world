# 🌐 3D World Studio

> **Everything you need for 3D visualization and audio analysis in one open-source widget.**

A fully browser-based 3D studio that combines audio signal analysis, interactive 3D visualizers, chart builders, and a 3D object builder — all in one page, with no server required.

---

## ✨ Features

### 🎵 Audio Visualizer
| Feature | Description |
|---|---|
| File loading | Load any audio file (MP3, WAV, OGG, FLAC, …) |
| Microphone input | Capture live audio from the system microphone |
| Playback | Play / pause / stop with volume control |
| **8-band equalizer** | Low-shelf, peaking, and high-shelf filters (±12 dB) |
| FFT size | 512 – 8192 bins; adjustable smoothing |
| **Clip slicer** | Split audio into short segments and play/analyze each clip |
| Live stats | BPM estimate, peak frequency, RMS loudness, FPS |

### 🌈 5 Visualizer Modes
| Mode | Description |
|---|---|
| **Spectrum** | 3D frequency bars that scale with each FFT bin |
| **Waveform** | Mirrored ribbon line that traces the time-domain signal |
| **Particles** | 4 000 audio-reactive particles expanding with the bass |
| **Globe** | Fibonacci-sphere spikes that respond to frequency bands |
| **Tunnel** | Fly-through vortex of animated rings |

### 📊 3D Chart Builder
| Type | Description |
|---|---|
| Bar | Grid of 3D bars |
| Scatter | 3D scatter plot (sphere markers) |
| Line | Smooth tube through all points (CatmullRom curve) |
| Surface | Height-map plane with vertex colours |

Datasets: **Random · Sine wave · Spiral · Gaussian**  
Colour schemes: **Rainbow · Heat map · Cool blues · Monochrome**

### 🏗️ 3D Builder
- Add **Box / Sphere / Cylinder / Torus / Cone** primitives
- Choose colour and scale
- Toggle starfield background and grid floor
- Auto-rotate camera
- **Export scene as JSON**

### 💾 Export
- **PNG screenshot** – exports the current WebGL frame
- **GIF recorder** – records 3 seconds at ~15 fps and downloads a GIF

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/www-infinity/3d-world.git
cd 3d-world

# 2. Serve locally (any static server works)
npx serve .
# or: python3 -m http.server 8080

# 3. Open in browser
open http://localhost:3000
```

> ⚠️ The app uses ES modules and the Web Audio API — it must be served over HTTP(S), not opened as a `file://` URL.

---

## 🏗️ Project Structure

```
3d-world/
├── index.html                  # Entry point (importmap, layout)
├── package.json
├── styles/
│   └── main.css                # Dark-theme UI
└── src/
    ├── main.js                 # App bootstrap & UI wiring
    ├── scene.js                # Three.js renderer / camera / controls
    ├── audioAnalyzer.js        # Web Audio API (FFT, EQ, slicer)
    ├── builder3D.js            # Primitive 3D object builder
    ├── visualizers/
    │   ├── spectrum3D.js       # Frequency bar chart in 3D
    │   ├── waveform3D.js       # Time-domain ribbon
    │   ├── particles.js        # Particle system
    │   ├── globe3D.js          # Spherical spike visualizer
    │   └── tunnel3D.js         # Tunnel / vortex
    ├── charts/
    │   └── charts3D.js         # Bar / scatter / line / surface charts
    ├── export/
    │   └── exporter.js         # PNG + GIF export
    └── ui/
        └── miniCanvases.js     # Sidebar waveform + spectrum display
```

---

## 🔧 Technologies (all open-source, loaded from CDN)

| Library | Version | Purpose |
|---|---|---|
| [Three.js](https://threejs.org) | r160 | 3D rendering (WebGL) |
| [gif.js](https://jnordberg.github.io/gif.js/) | 0.2.0 | GIF encoding (lazy-loaded on first use) |
| Web Audio API | browser built-in | Audio analysis & EQ |
| OrbitControls | Three.js addon | Mouse/touch camera control |

No build step required — everything runs directly in the browser via ES module `importmap`.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
