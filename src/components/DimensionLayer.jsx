import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Line, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';

// ── constants ──────────────────────────────────────────────────────────────────
const SEG  = 80;   // ellipse segments
const DRAG = 0.55; // mm per screen pixel

// ── helpers ────────────────────────────────────────────────────────────────────
const ellipsePoints = (r, y) =>
  Array.from({ length: SEG + 1 }, (_, i) => {
    const a = (i / SEG) * Math.PI * 2;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });

// ── DragHandle – sphere that fires onDragX / onDragY callbacks ────────────────
const DragHandle = ({ position, onDragX, onDragY, cursor, active, size = 4 }) => {
  const { gl } = useThree();
  const dragging = useRef(false);
  const last     = useRef({ x: 0, y: 0 });

  /* stable refs for callbacks so the window listener never goes stale */
  const cbX = useRef(onDragX); useEffect(() => { cbX.current = onDragX; }, [onDragX]);
  const cbY = useRef(onDragY); useEffect(() => { cbY.current = onDragY; }, [onDragY]);

  useEffect(() => {
    const move = (e) => {
      if (!dragging.current) return;
      const dx =  (e.clientX - last.current.x) * DRAG;
      const dy = -(e.clientY - last.current.y) * DRAG;
      last.current = { x: e.clientX, y: e.clientY };
      if (dx && cbX.current) cbX.current(dx);
      if (dy && cbY.current) cbY.current(dy);
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      gl.domElement.style.cursor = '';
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
    };
  }, [gl]);

  return (
    <mesh
      position={position}
      onPointerDown={e => {
        e.stopPropagation();
        dragging.current = true;
        last.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
        gl.domElement.style.cursor = cursor ?? 'grabbing';
      }}
      onPointerOver={() => { gl.domElement.style.cursor = cursor ?? 'grab'; }}
      onPointerOut ={() => { if (!dragging.current) gl.domElement.style.cursor = ''; }}
    >
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial
        color={active ? '#10b981' : '#ffffff'}
        emissive={active ? '#10b981' : '#e2e8f0'}
        emissiveIntensity={active ? 0.5 : 0.2}
        roughness={0.1}
        metalness={0.3}
      />
    </mesh>
  );
};

// ── One profile-point's visual layer ─────────────────────────────────────────
const PointLayer = ({
  pt, origIdx, sortedIndex, totalPoints,
  nextPt,         // next sorted point (or null)
  height,
  maxR,
  active,
  onUpdatePoint,
  onSelect,
}) => {
  const y  = pt.h * height;
  const r  = pt.r;
  const isBoundary = pt.h <= 0 || pt.h >= 1;

  // Radius drag (right handle) → change r
  const dragRadius = useCallback(dx => {
    onUpdatePoint(origIdx, { ...pt, r: Math.max(5, Math.min(200, r + dx)) });
  }, [pt, origIdx, r, onUpdatePoint]);

  // Height drag (center handle) → change h
  const dragHeight = useCallback((_, dy) => {
    const newH = Math.max(0.01, Math.min(0.99, pt.h + dy / height));
    onUpdatePoint(origIdx, { ...pt, h: newH });
  }, [pt, origIdx, height, onUpdatePoint]);

  // Vertical dimension to NEXT point
  const arrowX = maxR + 36;
  const showVDim = nextPt !== null;
  const y2      = nextPt ? nextPt.h * height : 0;
  const segH    = showVDim ? ((nextPt.h - pt.h) * height).toFixed(0) : '';
  const midY    = showVDim ? (y + y2) / 2 : 0;

  return (
    <group onClick={e => { e.stopPropagation(); onSelect(origIdx); }}>

      {/* ── Ellipse ring ───────────────────────────────────────────────────── */}
      <Line
        points={ellipsePoints(r, y)}
        color={active ? '#34d399' : '#ffffff'}
        lineWidth={active ? 2.5 : 1.5}
        transparent
        opacity={active ? 0.95 : 0.45}
      />

      {/* ── Horizontal extension lines ───────────────────────────────────── */}
      <Line points={[[ r, y, 0], [ r + 18, y, 0]]} color="#ffffff" lineWidth={1} transparent opacity={0.35} />
      <Line points={[[-r, y, 0], [-r - 18, y, 0]]} color="#ffffff" lineWidth={1} transparent opacity={0.35} />

      {/* ── Right handle (drag → radius) ─────────────────────────────────── */}
      <DragHandle
        position={[r, y, 0]}
        onDragX={dragRadius}
        cursor="ew-resize"
        active={active}
        size={active ? 5 : 3.5}
      />

      {/* ── Center handle (drag up/down → height) ────────────────────────── */}
      {!isBoundary && (
        <DragHandle
          position={[0, y, 0]}
          onDragY={(dy) => dragHeight(0, dy)}
          cursor="ns-resize"
          active={active}
          size={active ? 4 : 2.8}
        />
      )}

      {/* ── Diameter label ───────────────────────────────────────────────── */}
      <Html
        position={[r + 22, y, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        occlude={false}
      >
        <div className={`dim-tag dim-tag-h${active ? ' dim-tag-on' : ''}`}>
          <span className="dim-arrow">{'|< >'}</span>
          {(r * 2).toFixed(0)} mm
        </div>
      </Html>

      {/* ── Vertical segment dimension ────────────────────────────────────── */}
      {showVDim && (
        <>
          {/* Arrow line */}
          <Line points={[[arrowX, y, 0], [arrowX, y2, 0]]} color="#ffffff" lineWidth={1} transparent opacity={0.4} />
          {/* Tick caps */}
          <Line points={[[arrowX - 4, y,  0], [arrowX + 4, y,  0]]} color="#ffffff" lineWidth={1.5} transparent opacity={0.55} />
          <Line points={[[arrowX - 4, y2, 0], [arrowX + 4, y2, 0]]} color="#ffffff" lineWidth={1.5} transparent opacity={0.55} />
          {/* Extension dashes from ring to arrow */}
          <Line points={[[maxR, y,  0], [arrowX, y,  0]]} color="#ffffff" lineWidth={0.7} transparent opacity={0.2} />
          <Line points={[[maxR, y2, 0], [arrowX, y2, 0]]} color="#ffffff" lineWidth={0.7} transparent opacity={0.2} />
          {/* Label */}
          <Html
            position={[arrowX + 8, midY, 0]}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
            occlude={false}
          >
            <div className="dim-tag dim-tag-v">
              <span className="dim-arrow-v">↕</span>
              {segH} mm
            </div>
          </Html>
        </>
      )}
    </group>
  );
};

// ── Main DimensionLayer ───────────────────────────────────────────────────────
const DimensionLayer = ({ profilePoints, height, onUpdatePoint }) => {
  const [activeIdx, setActiveIdx] = useState(null);

  const sorted = [...profilePoints]
    .map((pt, i) => ({ ...pt, origIdx: i }))
    .sort((a, b) => a.h - b.h);

  const maxR = Math.max(...sorted.map(p => p.r));

  const handleSelect = (idx) => setActiveIdx(prev => prev === idx ? null : idx);

  return (
    <group renderOrder={10}>
      {sorted.map((pt, si) => (
        <PointLayer
          key={pt.origIdx}
          pt={pt}
          origIdx={pt.origIdx}
          sortedIndex={si}
          totalPoints={sorted.length}
          nextPt={si < sorted.length - 1 ? sorted[si + 1] : null}
          height={height}
          maxR={maxR}
          active={activeIdx === pt.origIdx}
          onUpdatePoint={onUpdatePoint}
          onSelect={handleSelect}
        />
      ))}
    </group>
  );
};

export default DimensionLayer;
