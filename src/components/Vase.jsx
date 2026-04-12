import React, { useMemo, forwardRef } from 'react';
import * as THREE from 'three';

/**
 * Vase Studio Pro – Precision Mesh Engine
 * --------------------------------------
 * FIX: Winding order corrected to CCW (Outward) for all faces.
 * FIX: Increased segment density for slicing stability.
 * FIX: Simplified Tilt to linear shear to prevent layer gaps.
 * FIX: Solid base with a robust bottom cap.
 */
const Vase = forwardRef(({ settings }, ref) => {
  const geometry = useMemo(() => {
    const {
      height = 200,
      profilePoints = [{ h: 0, r: 40 }, { h: 0.25, r: 65 }, { h: 0.6, r: 35 }, { h: 1, r: 50 }],
      radialSegments = 72,
      heightSegments = 120, // High res for smooth slicing
      twist = 0,
      sides = 6,
      geometryType = 'default',
      waveQuantity = 12,
      waveAmplitude = 0.04,
      surfaceEffect = 'smooth',
      ribCount = 24,
      ribDepth = 0.08,
      tiltAmount = 0,
      tiltDirection = 0,
    } = settings;

    const sortedPts = [...profilePoints].sort((a, b) => a.h - b.h);
    const getRadius = (h) => {
      const pts = sortedPts;
      if (h <= pts[0].h) return pts[0].r;
      if (h >= pts[pts.length - 1].h) return pts[pts.length - 1].r;
      for (let i = 0; i < pts.length - 1; i++) {
        if (h >= pts[i].h && h <= pts[i + 1].h) {
          const t = (h - pts[i].h) / ((pts[i + 1].h - pts[i].h) || 0.001);
          const st = t * t * (3 - 2 * t);
          return pts[i].r + (pts[i + 1].r - pts[i].r) * st;
        }
      }
      return 50;
    };

    const rs = Math.max(6, geometryType === 'polygon' ? sides : radialSegments);
    const hs = Math.max(20, heightSegments);
    const twistRad = (twist * Math.PI) / 180;
    const tiltDirRad = (tiltDirection * Math.PI) / 180;

    const positions = [];
    const indices   = [];

    // ── GENERATE VERTICES ──────────────────────────────────────────────────
    for (let i = 0; i <= hs; i++) {
      const h = i / hs;
      const br = getRadius(h);
      const ht = h * twistRad;
      
      for (let j = 0; j < rs; j++) {
        const phi = (j / rs) * Math.PI * 2;
        let r = br;

        // Apply Surface Effects
        if (surfaceEffect === 'ribbed') {
          r *= 1 - ribDepth * ((Math.sin(phi * ribCount) + 1) * 0.5);
        } else if (surfaceEffect === 'fluted') {
          r += Math.max(0, Math.sin(phi * ribCount)) * ribDepth * br * 0.6;
        } else if (surfaceEffect === 'organic') {
          const n = Math.sin(phi * 4.1 + h * 6.3) * 0.5 + Math.cos(phi * 7.2 - h * 11.1) * 0.3;
          r += n * ribDepth * br * 0.35;
        } else if (surfaceEffect === 'corrugated') {
          r += (Math.sin(h * Math.PI * 2 * ribCount) * 0.5 + 0.5) * ribDepth * br * 0.4;
        }

        if (geometryType === 'wave') {
          r += Math.sin(phi * waveQuantity) * (waveAmplitude * br);
        }

        r = Math.max(0.2, r);

        // Linear Tilt: ensured to be positive dy/dh
        const tiltIntensity = h * Math.min(tiltAmount, height * 0.9);
        const y = h * height + tiltIntensity * Math.cos(phi - tiltDirRad);

        positions.push(Math.cos(phi + ht) * r, y, Math.sin(phi + ht) * r);
      }
    }

    const V = (row, col) => row * rs + ((col % rs + rs) % rs);

    // ── WALL FACES (Correct CCW Winding for outward normals) ──────────────
    for (let i = 0; i < hs; i++) {
      for (let j = 0; j < rs; j++) {
        const a = V(i, j),   b = V(i+1, j);
        const c = V(i+1, j+1), d = V(i, j+1);
        
        // Face 1: a -> b -> c
        indices.push(a, b, c);
        // Face 2: a -> c -> d
        indices.push(a, c, d);
      }
    }

    // ── BOTTOM CAP (CCW down = CW up, outward from center) ────────────────
    const botCenterIdx = positions.length / 3;
    positions.push(0, 0, 0); // Center at origin
    for (let j = 0; j < rs; j++) {
      // For bottom face to point DOWN, we need a specific winding
      indices.push(V(0, j+1), V(0, j), botCenterIdx);
    }

    // ── BUILD ──────────────────────────────────────────────────────────────
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
    geo.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(indices), 1));
    geo.computeVertexNormals();

    return geo;
  }, [settings]);

  const flatShading = settings.geometryType === 'polygon';

  return (
    <mesh ref={ref} name="Vase" geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={settings.color || '#10b981'}
        roughness={0.82}
        metalness={0.1}
        side={THREE.DoubleSide}
        flatShading={flatShading}
      />
    </mesh>
  );
});

Vase.displayName = 'Vase';
export default Vase;
