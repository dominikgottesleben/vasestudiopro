import React, { useState, useEffect, useRef } from 'react';

const ProfileEditor = ({ points, onChange, height }) => {
  const [draggingIdx, setDraggingIdx] = useState(null);
  const svgRef = useRef(null);

  const padding = 35;
  const width = 260; // Slightly wider for labels
  const h_px = 320;

  const toPx = (p) => ({
    x: padding + (p.r / 100) * (width - 2 * padding - 40), // leave space on right
    y: h_px - padding - p.h * (h_px - 2 * padding)
  });

  const fromPx = (x, y) => {
    const h = (h_px - padding - y) / (h_px - 2 * padding);
    const r = ((x - padding) / (width - 2 * padding - 40)) * 100;
    return { 
      h: Math.max(0, Math.min(1, h)), 
      r: Math.max(5, Math.min(100, r)) 
    };
  };

  const handleMouseDown = (e, idx) => {
    e.stopPropagation();
    setDraggingIdx(idx);
  };

  const handleMouseMove = (e) => {
    if (draggingIdx === null) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let { h, r } = fromPx(x, y);
    if (draggingIdx === 0) h = 0;
    if (draggingIdx === points.length - 1) h = 1;
    const newPoints = [...points];
    newPoints[draggingIdx] = { h, r };
    onChange(newPoints);
  };

  const handleMouseUp = () => setDraggingIdx(null);

  const addPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newPt = fromPx(x, y);
    const newPoints = [...points, newPt].sort((a, b) => a.h - b.h);
    onChange(newPoints);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const sortedPoints = [...points].sort((a, b) => a.h - b.h);
  const pathData = sortedPoints.map((p, i) => {
    const { x, y } = toPx(p);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="profile-editor-container">
      <div className="editor-header">
        <span className="editor-title">Silhouette Profile</span>
        <button onClick={() => onChange([{h:0, r:40}, {h:0.25, r:65}, {h:0.6, r:35}, {h:1, r:50}])} className="btn-small">Reset</button>
      </div>
      <svg 
        ref={svgRef}
        width={width} 
        height={h_px} 
        viewBox={`0 0 ${width} ${h_px}`}
        onMouseMove={handleMouseMove}
        onDoubleClick={addPoint}
        style={{ background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0', cursor: draggingIdx !== null ? 'grabbing' : 'crosshair' }}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" rx="14" ry="14" />
        
        {/* Mirror Line */}
        <line x1={padding} y1={padding} x2={padding} y2={h_px - padding} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />

        {/* Dimension Lines (Heights) */}
        {sortedPoints.map((p, i) => {
          if (i === sortedPoints.length - 1) return null;
          const p1 = toPx(p);
          const p2 = toPx(sortedPoints[i+1]);
          const midY = (p1.y + p2.y) / 2;
          const h_val = ((sortedPoints[i+1].h - p.h) * height).toFixed(0);
          return (
            <g key={`h-${i}`}>
              <line x1={8} y1={p1.y} x2={width-10} y2={p1.y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={8} y={midY} fontSize="10" fill="#94a3b8" fontWeight="600" textAnchor="start" alignmentBaseline="middle">
                {h_val} mm
              </text>
            </g>
          );
        })}
        <line x1={8} y1={toPx(sortedPoints[sortedPoints.length-1]).y} x2={width-10} y2={toPx(sortedPoints[sortedPoints.length-1]).y} stroke="#e2e8f0" strokeWidth="1" />

        {/* Profile Path */}
        <path d={pathData} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Points and Diameters */}
        {sortedPoints.map((p, i) => {
          const { x, y } = toPx(p);
          const diam = (p.r * 2).toFixed(0);
          const isActive = draggingIdx === i;
          return (
            <g key={`d-${i}`}>
              {/* Diameter Line */}
              <line x1={padding} y1={y} x2={x} stroke={isActive ? '#10b981' : '#e2e8f0'} strokeWidth={isActive ? 2 : 1} strokeDasharray={isActive ? 'none' : '2 2'} />
              {/* Point */}
              <circle 
                cx={x} cy={y} r={isActive ? 7 : 5.5} 
                fill={isActive ? '#059669' : '#10b981'}
                stroke="white" strokeWidth="2.5"
                onMouseDown={(e) => handleMouseDown(e, i)}
                style={{ cursor: 'grab' }}
              />
              {/* Diam Label */}
              <rect x={x + 8} y={y - 10} width="34" height="20" rx="4" fill={isActive ? '#10b981' : '#f1f5f9'} />
              <text x={x + 12} y={y + 4} fontSize="9" fontWeight="700" fill={isActive ? 'white' : '#64748b'}>
                {diam}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="editor-hint">
        <b>Diameter & Height:</b> Drag points to adjust.<br/>
        Double-click to add point.
      </div>
    </div>
  );
};

export default ProfileEditor;
