import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Line, GizmoHelper, GizmoViewport } from '@react-three/drei';
import {
  Download, PenTool, Palette, RefreshCcw, Package,
  Layers, Wind, RotateCcw, Sliders, Ruler, Zap,
  Sparkles, Paintbrush, SlidersHorizontal, X, Hand
} from 'lucide-react';
import React_comp from 'react';
import Vase from './components/Vase';
import LampShade from './components/LampShade';
import BaseModel from './components/BaseModel';
import ProfileEditor from './components/ProfileEditor';
import DimensionLayer from './components/DimensionLayer';
import { exportMeshToSTL } from './utils/stlExporter';

// ─── VASE PRESETS & DEFAULT ────────────────────────────────────────────────────
const PRESETS = [
  { label: '↗ Nordic', s: { height:220,twist:0,tiltAmount:45,tiltDirection:0,surfaceEffect:'ribbed',ribCount:28,ribDepth:0.07,geometryType:'default',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:28},{h:0.25,r:48},{h:0.65,r:40},{h:1,r:36}],color:'#e2d5c4',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '○ Organic', s: { height:175,twist:0,tiltAmount:8,tiltDirection:45,surfaceEffect:'organic',ribCount:8,ribDepth:0.25,geometryType:'default',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:22},{h:0.35,r:78},{h:0.7,r:58},{h:1,r:42}],color:'#94a3b8',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '🌀 Spiral', s: { height:200,twist:360,tiltAmount:0,tiltDirection:0,surfaceEffect:'smooth',ribCount:12,ribDepth:0.08,geometryType:'wave',waveQuantity:8,waveAmplitude:0.1,profilePoints:[{h:0,r:32},{h:0.3,r:55},{h:0.6,r:38},{h:1,r:48}],color:'#10b981',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '⬡ Geo', s: { height:155,twist:40,tiltAmount:12,tiltDirection:0,surfaceEffect:'smooth',ribCount:12,ribDepth:0.08,geometryType:'polygon',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:38},{h:0.2,r:52},{h:0.8,r:52},{h:1,r:38}],color:'#6366f1',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '≋ Fluted', s: { height:190,twist:10,tiltAmount:22,tiltDirection:180,surfaceEffect:'fluted',ribCount:20,ribDepth:0.12,geometryType:'default',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:28},{h:0.25,r:58},{h:0.65,r:36},{h:1,r:50}],color:'#e2e8f0',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '| Slim', s: { height:280,twist:0,tiltAmount:5,tiltDirection:0,surfaceEffect:'corrugated',ribCount:18,ribDepth:0.1,geometryType:'default',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:18},{h:0.08,r:26},{h:0.5,r:23},{h:0.9,r:20},{h:1,r:18}],color:'#1e293b',radialSegments:64,heightSegments:60,sides:6,diamondRows:12,wallThickness:2 }},
  { label: '◇ Low-Poly', s: { height:180,twist:15,tiltAmount:0,tiltDirection:0,surfaceEffect:'smooth',ribCount:24,ribDepth:0.08,geometryType:'diamond',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:32},{h:0.28,r:68},{h:0.65,r:42},{h:1,r:52}],color:'#3b82f6',radialSegments:64,heightSegments:60,sides:8,diamondRows:12,wallThickness:2 }},
];

const DEFAULT = {
  height:200, profilePoints:[{h:0,r:40},{h:0.25,r:65},{h:0.6,r:35},{h:1,r:50}],
  radialSegments:64, heightSegments:60, twist:45, sides:8, diamondRows:12,
  geometryType:'wave', waveQuantity:12, waveAmplitude:0.04,
  surfaceEffect:'smooth', ribCount:24, ribDepth:0.08,
  tiltAmount:0, tiltDirection:0, color:'#10b981', wallThickness:2,
};

// ─── LAMP PRESETS & DEFAULT ────────────────────────────────────────────────────
const LAMP_PRESETS = [
  { label: '🔔 Classic',  s: { height:130, twist:0,   surfaceEffect:'smooth',  ribCount:16, ribDepth:0.06, profilePoints:[{h:0,r:37},{h:0.25,r:62},{h:0.7,r:47},{h:1,r:30}],  color:'#f5f0e8', sides:0 }},
  { label: '| Taper',     s: { height:140, twist:0,   surfaceEffect:'smooth',  ribCount:16, ribDepth:0.06, profilePoints:[{h:0,r:37},{h:0.4,r:55},{h:1,r:28}],                color:'#e2d5c4', sides:0 }},
  { label: '○ Drum',      s: { height:100, twist:0,   surfaceEffect:'smooth',  ribCount:16, ribDepth:0.06, profilePoints:[{h:0,r:37},{h:0.15,r:62},{h:0.85,r:62},{h:1,r:56}], color:'#94a3b8', sides:0 }},
  { label: '≋ Fluted',    s: { height:140, twist:0,   surfaceEffect:'fluted',  ribCount:20, ribDepth:0.10, profilePoints:[{h:0,r:37},{h:0.3,r:58},{h:1,r:32}],                color:'#e2e8f0', sides:0 }},
  { label: '🌀 Spiral',   s: { height:130, twist:200, surfaceEffect:'smooth',  ribCount:16, ribDepth:0.06, profilePoints:[{h:0,r:37},{h:0.45,r:60},{h:1,r:30}],               color:'#10b981', sides:0 }},
  { label: '○ Organic',   s: { height:120, twist:0,   surfaceEffect:'organic', ribCount:8,  ribDepth:0.20, profilePoints:[{h:0,r:37},{h:0.3,r:65},{h:0.7,r:50},{h:1,r:33}],  color:'#ddd6fe', sides:0 }},
  { label: '⬡ Hex',       s: { height:130, twist:0,   surfaceEffect:'smooth',  ribCount:16, ribDepth:0.06, profilePoints:[{h:0,r:37},{h:0.25,r:62},{h:0.7,r:47},{h:1,r:30}],  color:'#f5f0e8', sides:6 }},
  { label: '◻ Quadrat',   s: { height:120, twist:45,  surfaceEffect:'smooth',  ribCount:16, ribDepth:0.06, profilePoints:[{h:0,r:37},{h:0.3,r:58},{h:1,r:32}],                color:'#6366f1', sides:4 }},
];

const LAMP_DEFAULT = {
  height:130, profilePoints:[{h:0,r:37},{h:0.25,r:62},{h:0.7,r:47},{h:1,r:30}],
  radialSegments:64, heightSegments:60, twist:0,
  surfaceEffect:'smooth', ribCount:16, ribDepth:0.06,
  color:'#f5f0e8', wallThickness:2, sides:0,
};

// ─── CIRCULAR GRID ────────────────────────────────────────────────────────────
const RING_SEGS    = 120;
const RING_SPACING = 35;
const RING_COUNT   = 12;
const SPOKE_COUNT  = 24;

const circlePoints = (r) =>
  Array.from({ length: RING_SEGS + 1 }, (_, i) => {
    const a = (i / RING_SEGS) * Math.PI * 2;
    return [Math.cos(a) * r, 0, Math.sin(a) * r];
  });

function CircularGrid() {
  const outerR = RING_SPACING * RING_COUNT;
  return (
    <group position={[0, -0.4, 0]}>
      {Array.from({ length: RING_COUNT }, (_, i) => {
        const r  = RING_SPACING * (i + 1);
        const t  = (i + 1) / RING_COUNT;
        const op = 0.55 * (1 - t * t);
        return (
          <Line key={r} points={circlePoints(r)}
            color="#8fa4bf" lineWidth={t < 0.35 ? 1.1 : 0.75} transparent opacity={op} />
        );
      })}
      {Array.from({ length: SPOKE_COUNT }, (_, i) => {
        const a = (i / SPOKE_COUNT) * Math.PI * 2;
        return (
          <Line key={i}
            points={[[0, 0, 0], [Math.cos(a) * outerR, 0, Math.sin(a) * outerR]]}
            color="#8fa4bf" lineWidth={0.6} transparent opacity={0.13} />
        );
      })}
    </group>
  );
}

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends React_comp.Component {
  constructor(p) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) return <div className="err-fallback"><p>Engine error</p><button onClick={() => window.location.reload()}>Restart</button></div>;
    return this.props.children;
  }
}

// ─── SLIDER ───────────────────────────────────────────────────────────────────
const Field = ({ label, value, display, min, max, step = 1, icon: Icon, onChange }) => (
  <div className="field">
    <div className="field-row">
      <label className="field-label">{Icon && <Icon size={12} strokeWidth={2.5} />}{label}</label>
      <span className="field-val">{display ?? value}</span>
    </div>
    <input type="range"
      min={min} max={max} step={step} value={value}
      onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
    />
  </div>
);

// ─── OPTION PILLS ─────────────────────────────────────────────────────────────
const Pills = ({ options, value, onChange }) => (
  <div className="pills">
    {options.map(o => (
      <button key={o.id} className={`pill${value === o.id ? ' pill-on' : ''}`} onClick={() => onChange(o.id)}>
        {o.label}
      </button>
    ))}
  </div>
);

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'form',      icon: Layers,    label: 'Form'    },
  { id: 'texture',   icon: Sparkles,  label: 'Texture' },
  { id: 'transform', icon: RotateCcw, label: 'Move'    },
  { id: 'style',     icon: Palette,   label: 'Style'   },
];

// ─── MODE SELECTOR ────────────────────────────────────────────────────────────
function ModeSelector({ onSelect }) {
  return (
    <div className="mode-sel">
      <div className="mode-sel-inner">
        <div className="mode-sel-brand">
          <div className="hdr-logo mode-sel-logo"><Package size={22} color="white" /></div>
          <h1 className="mode-sel-title">Studio <b>Pro</b></h1>
        </div>
        <p className="mode-sel-sub">Was möchtest du gestalten?</p>
        <div className="mode-sel-cards">
          <button className="mode-card" onClick={() => onSelect('vase')}>
            <div className="mode-card-icon">🏺</div>
            <div className="mode-card-name">Vase</div>
            <div className="mode-card-desc">Parametrische Vasen für den 3D-Druck</div>
          </button>
          <button className="mode-card" onClick={() => onSelect('lamp')}>
            <div className="mode-card-icon">💡</div>
            <div className="mode-card-name">Lampe</div>
            <div className="mode-card-desc">Lampenschirme für das BambuLab LED Kit</div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]           = useState(null); // null | 'vase' | 'lamp'
  const [s, setS]                 = useState({ ...DEFAULT });
  const [tab, setTab]             = useState('form');
  const [showEditor, setShowEditor] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [touchMode, setTouchMode] = useState(false);
  const meshRef = useRef();
  const up = (k, v) => setS(p => ({ ...p, [k]: v }));

  const isLamp        = mode === 'lamp';
  const activePresets = isLamp ? LAMP_PRESETS : PRESETS;
  const activeDefault = isLamp ? LAMP_DEFAULT : DEFAULT;

  useEffect(() => {
    document.title = isLamp ? 'Lamp Studio Pro' : 'Vase Studio Pro';
  }, [isLamp]);

  const handleSelectMode = (m) => {
    setMode(m);
    setS(m === 'lamp' ? { ...LAMP_DEFAULT } : { ...DEFAULT });
    setTab('form');
    setShowEditor(false);
  };

  const handleExport = async () => {
    const ts = new Date().toLocaleDateString('de-DE').replace(/\./g, '-');
    if (isLamp) {
      await exportMeshToSTL(meshRef.current, `Lamp_Shade_${ts}.stl`);
      // Download base.stl as a separate file after a short delay
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = '/base.stl';
        a.download = 'BambuLab_LED_Base.stl';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, 600);
    } else {
      await exportMeshToSTL(meshRef.current, `Vase_Studio_Pro_${ts}.stl`);
    }
  };

  const handleUpdatePoint = (idx, newPt) => {
    const next = [...s.profilePoints];
    next[idx] = newPt;
    up('profilePoints', next);
  };

  const hasTex = ['ribbed', 'fluted', 'organic', 'corrugated'].includes(s.surfaceEffect);

  // Wall runs from y=0 to domeBaseY; dim handles overlay the wall exactly.
  const lampTopR  = isLamp
    ? ([...s.profilePoints].sort((a, b) => a.h - b.h).pop()?.r ?? 30)
    : 0;
  const dimHeight = isLamp ? Math.max(10, s.height - lampTopR) : s.height;

  // ── Mode selector screen ───────────────────────────────────────────────
  if (!mode) return <ModeSelector onSelect={handleSelectMode} />;

  return (
    <div className={`app${touchMode ? ' touch-mode' : ''}`}>

      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-brand">
          <div className="hdr-logo"><Package size={14} color="white" /></div>
          <span>{isLamp ? 'Lamp' : 'Vase'} <b>Studio Pro</b></span>
          <button className="btn-mode-switch" onClick={() => setMode(null)} title="Modus wechseln">
            {isLamp ? '🏺' : '💡'}
          </button>
        </div>
        <div className="hdr-right">
          <button className="btn-shape" onClick={() => setShowEditor(v => !v)} title="Profile Editor">
            <PenTool size={15} /> Profile
          </button>
          <button
            className={`btn-touch${touchMode ? ' btn-touch-on' : ''}`}
            onClick={() => setTouchMode(v => !v)}
            title="Touch Mode"
          >
            <Hand size={15} />
          </button>
          <button className="btn-export" onClick={handleExport}>
            <Download size={15} /> {isLamp ? 'Export (2× STL)' : 'STL Export'}
          </button>
          <button className="btn-sidebar-toggle" onClick={() => setSidebarOpen(v => !v)} title="Toggle settings">
            {sidebarOpen ? <X size={16} /> : <SlidersHorizontal size={16} />}
          </button>
        </div>
      </header>

      <div className="body">

        {/* VIEWPORT */}
        <main className="vp">
          <ErrorBoundary>
            <Canvas shadows camera={{ position: [0, 220, 580], fov: 30, near: 5, far: 4000 }}>
              <ambientLight intensity={0.7} />
              <spotLight position={[300,500,300]} angle={0.15} penumbra={1} intensity={1.8} castShadow />
              <directionalLight position={[-150,250,-100]} intensity={0.5} />

              {isLamp ? (
                <>
                  <BaseModel />
                  <group position={[0, 15, 0]}>
                    <LampShade ref={meshRef} settings={s} />
                  </group>
                </>
              ) : (
                <Vase ref={meshRef} settings={s} />
              )}

              <group position={[0, isLamp ? 15 : 0, 0]}>
                <DimensionLayer
                  profilePoints={s.profilePoints}
                  height={dimHeight}
                  onUpdatePoint={handleUpdatePoint}
                  isLamp={isLamp}
                  touchMode={touchMode}
                />
              </group>

              <CircularGrid />
              <ContactShadows position={[0,-0.4,0]} opacity={0.22} scale={14} blur={5} far={12} />
              <Environment preset="studio" />
              <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={150} maxDistance={1100} zoomSpeed={0.4} />
              <GizmoHelper alignment="bottom-right" margin={[36,36]}>
                <GizmoViewport axisColors={['#f43f5e','#10b981','#3b82f6']} labelColor="transparent" hideLabels />
              </GizmoHelper>
            </Canvas>
          </ErrorBoundary>

          {showEditor && (
            <div className="editor-overlay">
              <ProfileEditor
                points={s.profilePoints}
                onChange={pts => up('profilePoints', pts)}
                height={dimHeight}
                isLamp={isLamp}
                touchMode={touchMode}
              />
            </div>
          )}
        </main>

        {/* SIDEBAR BACKDROP */}
        {sidebarOpen && <div className="sb-backdrop" onClick={() => setSidebarOpen(false)} />}

        {/* SIDEBAR */}
        <aside className={`sb${sidebarOpen ? ' sb-open' : ''}`}>

          {/* PRESETS */}
          <div className="preset-bar">
            <span className="preset-bar-label">Presets</span>
            <div className="preset-list">
              {activePresets.map(p => (
                <button key={p.label} className="preset-btn"
                  onClick={() => setS(prev => ({ ...prev, ...p.s }))}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* TABS */}
          <div className="tab-bar">
            {TABS.map(t => (
              <button key={t.id}
                className={`tab-btn${tab === t.id ? ' tab-on' : ''}`}
                onClick={() => setTab(t.id)}>
                <t.icon size={14} strokeWidth={2} />
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="tab-content">

            {tab === 'form' && (
              <div className="tab-panel">
                {!isLamp && (
                  <>
                    <div className="grp">
                      <div className="grp-label">Shape Type</div>
                      <Pills value={s.geometryType}
                        onChange={v => up('geometryType', v)}
                        options={[
                          {id:'default', label:'Smooth'},
                          {id:'wave',    label:'Wave'},
                          {id:'polygon', label:'Polygon'},
                          {id:'diamond', label:'◇ Low-Poly'},
                        ]}
                      />
                    </div>

                    {s.geometryType === 'wave' && (
                      <div className="grp">
                        <div className="grp-label">Wave</div>
                        <Field label="Count" icon={Wind} value={s.waveQuantity} min={2} max={64} onChange={v => up('waveQuantity', v)} />
                        <Field label="Amplitude" value={s.waveAmplitude} display={`${(s.waveAmplitude*100).toFixed(0)}%`}
                          min={0.01} max={0.3} step={0.01} onChange={v => up('waveAmplitude', v)} />
                      </div>
                    )}

                    {(s.geometryType === 'polygon' || s.geometryType === 'diamond') && (
                      <div className="grp">
                        <div className="grp-label">{s.geometryType === 'diamond' ? 'Low-Poly' : 'Polygon'}</div>
                        <Field label="Seiten" value={s.sides} min={3} max={16} onChange={v => up('sides', v)} />
                        {s.geometryType === 'diamond' && (
                          <Field label="Reihen" value={s.diamondRows ?? 12} min={3} max={40} onChange={v => up('diamondRows', v)} />
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="grp">
                  <div className="grp-label">Dimensions</div>
                  <Field label="Height" icon={Ruler} value={s.height}
                    display={`${s.height}mm`}
                    min={isLamp ? 60 : 80} max={isLamp ? 300 : 500}
                    onChange={v => up('height', v)} />
                  {!isLamp && (
                    <Field label="Wall Thickness" icon={Sliders} value={s.wallThickness} display={`${s.wallThickness}mm`}
                      min={1} max={8} step={0.5} onChange={v => up('wallThickness', v)} />
                  )}
                </div>

                {isLamp && (
                  <>
                    <div className="grp">
                      <div className="grp-label">Querschnitt</div>
                      <Pills
                        value={(s.sides ?? 0) >= 3 ? 'polygon' : 'round'}
                        onChange={v => up('sides', v === 'polygon' ? 6 : 0)}
                        options={[{id:'round', label:'Rund'}, {id:'polygon', label:'Polygon'}]}
                      />
                      {(s.sides ?? 0) >= 3 && (
                        <Field label="Seiten" value={s.sides} min={3} max={16} onChange={v => up('sides', v)} />
                      )}
                    </div>
                    <div className="grp">
                      <div className="grp-label">Klickmechanismus</div>
                      <div className="lamp-hint">
                        Klick-Kragen passt auf den BambuLab LED Kit Sockel. Export erzeugt zwei separate STL-Dateien.
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'texture' && (
              <div className="tab-panel">
                <div className="grp">
                  <div className="grp-label">Effect</div>
                  <Pills value={s.surfaceEffect}
                    onChange={v => up('surfaceEffect', v)}
                    options={[
                      {id:'smooth',    label:'Smooth'},
                      {id:'ribbed',    label:'Ribbed'},
                      {id:'fluted',    label:'Fluted'},
                      {id:'organic',   label:'Organic'},
                      {id:'corrugated',label:'Coils'},
                    ]}
                  />
                </div>
                {hasTex && (
                  <div className="grp">
                    <div className="grp-label">Intensity</div>
                    <Field label="Density" icon={Paintbrush} value={s.ribCount} min={3} max={64} onChange={v => up('ribCount', v)} />
                    <Field label="Depth" value={s.ribDepth} display={`${(s.ribDepth*100).toFixed(0)}%`}
                      min={0.01} max={0.4} step={0.01} onChange={v => up('ribDepth', v)} />
                  </div>
                )}
              </div>
            )}

            {tab === 'transform' && (
              <div className="tab-panel">
                <div className="grp">
                  <div className="grp-label">Spiral</div>
                  <Field label="Twist Angle" icon={RotateCcw} value={s.twist} display={`${s.twist}°`} min={-720} max={720} onChange={v => up('twist', v)} />
                </div>
                {!isLamp && (
                  <div className="grp">
                    <div className="grp-label">Top Cut</div>
                    <Field label="Tilt Amount" icon={Zap} value={s.tiltAmount} display={`${s.tiltAmount}mm`} min={0} max={80} onChange={v => up('tiltAmount', v)} />
                    {s.tiltAmount > 0 && (
                      <Field label="Direction" value={s.tiltDirection} display={`${s.tiltDirection}°`} min={0} max={360} onChange={v => up('tiltDirection', v)} />
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === 'style' && (
              <div className="tab-panel">
                <div className="grp">
                  <div className="grp-label">Color</div>
                  <div className="color-row">
                    <div className="color-swatch" style={{ background: s.color }}>
                      <input type="color" value={s.color} onChange={e => up('color', e.target.value)} />
                    </div>
                    <span className="color-hex">{s.color}</span>
                  </div>
                  <div className="color-palette">
                    {(isLamp
                      ? ['#f5f0e8','#e2d5c4','#fef9ee','#1e293b','#e2e8f0','#fde68a','#fed7aa','#ddd6fe','#99f6e4','#fce7f3']
                      : ['#e2d5c4','#f8fafc','#1e293b','#10b981','#6366f1','#f43f5e','#f59e0b','#7c3aed','#ec4899','#0ea5e9']
                    ).map(c => (
                      <button key={c} className={`sw${s.color === c ? ' sw-on' : ''}`}
                        style={{ background: c }}
                        onClick={() => up('color', c)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className="sb-footer">
            <div className="tip">
              {isLamp
                ? <>🖨 <strong>Bambu Studio:</strong> Infill 0 % · nur den Schirm drucken.</>
                : <>🖨 <strong>Bambu Studio:</strong> Prozess → Sonstige → <strong>Spiralvase Mode ✓</strong></>
              }
            </div>
            <button className="btn-reset" onClick={() => setS({ ...activeDefault })}>
              <RefreshCcw size={13} /> Restore Defaults
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}
