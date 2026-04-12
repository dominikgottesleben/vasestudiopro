import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import {
  Download, PenTool, Palette, RefreshCcw, Package,
  Layers, Wind, RotateCcw, Sliders, Ruler, Zap,
  Sparkles, Move, Paintbrush
} from 'lucide-react';
import React_comp from 'react';
import Vase from './components/Vase';
import ProfileEditor from './components/ProfileEditor';
import DimensionLayer from './components/DimensionLayer';
import { exportMeshToSTL } from './utils/stlExporter';

// ─── PRESETS ──────────────────────────────────────────────────────────────────
const PRESETS = [
  { label: '↗ Nordic', s: { height:220,twist:0,tiltAmount:45,tiltDirection:0,surfaceEffect:'ribbed',ribCount:28,ribDepth:0.07,geometryType:'default',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:28},{h:0.25,r:48},{h:0.65,r:40},{h:1,r:36}],color:'#e2d5c4',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '○ Organic', s: { height:175,twist:0,tiltAmount:8,tiltDirection:45,surfaceEffect:'organic',ribCount:8,ribDepth:0.25,geometryType:'default',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:22},{h:0.35,r:78},{h:0.7,r:58},{h:1,r:42}],color:'#94a3b8',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '🌀 Spiral', s: { height:200,twist:360,tiltAmount:0,tiltDirection:0,surfaceEffect:'smooth',ribCount:12,ribDepth:0.08,geometryType:'wave',waveQuantity:8,waveAmplitude:0.1,profilePoints:[{h:0,r:32},{h:0.3,r:55},{h:0.6,r:38},{h:1,r:48}],color:'#10b981',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '⬡ Geo', s: { height:155,twist:40,tiltAmount:12,tiltDirection:0,surfaceEffect:'smooth',ribCount:12,ribDepth:0.08,geometryType:'polygon',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:38},{h:0.2,r:52},{h:0.8,r:52},{h:1,r:38}],color:'#6366f1',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '≋ Fluted', s: { height:190,twist:10,tiltAmount:22,tiltDirection:180,surfaceEffect:'fluted',ribCount:20,ribDepth:0.12,geometryType:'default',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:28},{h:0.25,r:58},{h:0.65,r:36},{h:1,r:50}],color:'#e2e8f0',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
  { label: '| Slim', s: { height:280,twist:0,tiltAmount:5,tiltDirection:0,surfaceEffect:'corrugated',ribCount:18,ribDepth:0.1,geometryType:'default',waveQuantity:12,waveAmplitude:0.04,profilePoints:[{h:0,r:18},{h:0.08,r:26},{h:0.5,r:23},{h:0.9,r:20},{h:1,r:18}],color:'#1e293b',radialSegments:64,heightSegments:60,sides:6,wallThickness:2 }},
];

const DEFAULT = {
  height:200, profilePoints:[{h:0,r:40},{h:0.25,r:65},{h:0.6,r:35},{h:1,r:50}],
  radialSegments:64, heightSegments:60, twist:45, sides:6,
  geometryType:'wave', waveQuantity:12, waveAmplitude:0.04,
  surfaceEffect:'smooth', ribCount:24, ribDepth:0.08,
  tiltAmount:0, tiltDirection:0, color:'#10b981', wallThickness:2,
};

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
  { id: 'form',      icon: Layers,         label: 'Form'    },
  { id: 'texture',   icon: Sparkles,       label: 'Texture' },
  { id: 'transform', icon: RotateCcw,      label: 'Move'    },
  { id: 'style',     icon: Palette,        label: 'Style'   },
];

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [s, setS] = useState({ ...DEFAULT });
  const [tab, setTab] = useState('form');
  const [showEditor, setShowEditor] = useState(false);
  const meshRef = useRef();
  const up = (k, v) => setS(p => ({ ...p, [k]: v }));

  useEffect(() => { document.title = 'Vase Studio Pro'; }, []);

  const handleExport = async () => {
    const ts = new Date().toLocaleDateString('de-DE').replace(/\./g, '-');
    await exportMeshToSTL(meshRef.current, `Vase_Studio_Pro_${ts}.stl`);
  };

  const handleUpdatePoint = (idx, newPt) => {
    const next = [...s.profilePoints];
    next[idx] = newPt;
    up('profilePoints', next);
  };

  const hasTex = ['ribbed','fluted','organic','corrugated'].includes(s.surfaceEffect);

  return (
    <div className="app">

      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-brand">
          <div className="hdr-logo"><Package size={14} color="white" /></div>
          <span>Vase <b>Studio Pro</b></span>
        </div>
        <div className="hdr-right">
          <button className="btn-shape" onClick={() => setShowEditor(v => !v)} title="Profile Editor">
            <PenTool size={15} /> Profile
          </button>
          <button className="btn-export" onClick={handleExport}>
            <Download size={15} /> STL Export
          </button>
        </div>
      </header>

      <div className="body">

        {/* VIEWPORT */}
        <main className="vp">
          <ErrorBoundary>
            <Canvas shadows camera={{ position: [0, 220, 580], fov: 30 }}>
              <ambientLight intensity={0.7} />
              <spotLight position={[300,500,300]} angle={0.15} penumbra={1} intensity={1.8} castShadow />
              <directionalLight position={[-150,250,-100]} intensity={0.5} />
              <Vase ref={meshRef} settings={s} />
              <DimensionLayer
                profilePoints={s.profilePoints}
                height={s.height}
                onUpdatePoint={handleUpdatePoint}
              />
              <Grid infiniteGrid position={[0,-0.5,0]} cellSize={20} sectionSize={100}
                cellColor="#e8ecf0" sectionColor="#d0d7e0"
                cellThickness={0.4} sectionThickness={0.8}
                fadeDistance={1200} fadeStrength={4} />
              <ContactShadows position={[0,-0.4,0]} opacity={0.22} scale={14} blur={5} far={12} />
              <Environment preset="studio" />
              <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={80} maxDistance={2500} />
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
                height={s.height}
              />
            </div>
          )}
        </main>

        {/* SIDEBAR */}
        <aside className="sb">

          {/* PRESETS */}
          <div className="preset-bar">
            <span className="preset-bar-label">Presets</span>
            <div className="preset-list">
              {PRESETS.map(p => (
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
                <div className="grp">
                  <div className="grp-label">Shape Type</div>
                  <Pills value={s.geometryType}
                    onChange={v => up('geometryType', v)}
                    options={[{id:'default',label:'Smooth'},{id:'wave',label:'Wave'},{id:'polygon',label:'Polygon'}]}
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

                {s.geometryType === 'polygon' && (
                  <div className="grp">
                    <div className="grp-label">Polygon</div>
                    <Field label="Faces" value={s.sides} min={3} max={16} onChange={v => up('sides', v)} />
                  </div>
                )}

                <div className="grp">
                  <div className="grp-label">Dimensions</div>
                  <Field label="Height" icon={Ruler} value={s.height} display={`${s.height}mm`} min={80} max={500} onChange={v => up('height', v)} />
                  <Field label="Wall Thickness" icon={Sliders} value={s.wallThickness} display={`${s.wallThickness}mm`}
                    min={1} max={8} step={0.5} onChange={v => up('wallThickness', v)} />
                </div>
              </div>
            )}

            {tab === 'texture' && (
              <div className="tab-panel">
                <div className="grp">
                  <div className="grp-label">Effect</div>
                  <Pills value={s.surfaceEffect}
                    onChange={v => up('surfaceEffect', v)}
                    options={[
                      {id:'smooth',label:'Smooth'},
                      {id:'ribbed',label:'Ribbed'},
                      {id:'fluted',label:'Fluted'},
                      {id:'organic',label:'Organic'},
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
                <div className="grp">
                  <div className="grp-label">Top Cut</div>
                  <Field label="Tilt Amount" icon={Zap} value={s.tiltAmount} display={`${s.tiltAmount}mm`} min={0} max={80} onChange={v => up('tiltAmount', v)} />
                  {s.tiltAmount > 0 && (
                    <Field label="Direction" value={s.tiltDirection} display={`${s.tiltDirection}°`} min={0} max={360} onChange={v => up('tiltDirection', v)} />
                  )}
                </div>
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
                    {['#e2d5c4','#f8fafc','#1e293b','#10b981','#6366f1','#f43f5e','#f59e0b','#7c3aed','#ec4899','#0ea5e9'].map(c => (
                      <button key={c} className={`sw${s.color===c?' sw-on':''}`}
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
            <div className="tip">🖨 <strong>Bambu Studio:</strong> Prozess → Sonstige → <strong>Spiralvase Mode ✓</strong></div>
            <button className="btn-reset" onClick={() => setS({ ...DEFAULT })}>
              <RefreshCcw size={13} /> Restore Defaults
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}
