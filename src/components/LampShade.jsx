import React, { useMemo, forwardRef } from 'react';
import * as THREE from 'three';

const DOME_SEGS    = 28;
const COLLAR_H     = 7.5;
const COLLAR_OUTER = 35;

const BORE_PROFILE = [
  { y:  0.0, r: 34.5 },
  { y: -0.7, r: 34.5 },
  { y: -1.0, r: 33.0 },  // snap ridge
  { y: -1.5, r: 33.8 },  // groove 1
  { y: -3.5, r: 33.8 },  // groove 2
  { y: -4.5, r: 32.2 },  // post holding zone
  { y: -7.5, r: 32.2 },  // collar bottom
];

const LampShade = forwardRef(({ settings }, ref) => {
  const geometry = useMemo(() => {
    const {
      height        = 130,
      profilePoints = [{ h: 0, r: 37 }, { h: 0.3, r: 62 }, { h: 0.7, r: 47 }, { h: 1, r: 32 }],
      radialSegments = 64,
      heightSegments = 60,
      twist          = 0,
      surfaceEffect  = 'smooth',
      ribCount       = 16,
      ribDepth       = 0.06,
      wallThickness  = 2,
    } = settings;

    const sortedPts = [...profilePoints].sort((a, b) => a.h - b.h);

    const getRadius = (h) => {
      if (h <= sortedPts[0].h) return sortedPts[0].r;
      if (h >= sortedPts[sortedPts.length - 1].h) return sortedPts[sortedPts.length - 1].r;
      for (let i = 0; i < sortedPts.length - 1; i++) {
        if (h >= sortedPts[i].h && h <= sortedPts[i + 1].h) {
          const t  = (h - sortedPts[i].h) / ((sortedPts[i + 1].h - sortedPts[i].h) || 0.001);
          const st = t * t * (3 - 2 * t);
          return sortedPts[i].r + (sortedPts[i + 1].r - sortedPts[i].r) * st;
        }
      }
      return 50;
    };

    const rs       = Math.max(6, radialSegments);
    const hs       = Math.max(20, heightSegments);
    const twistRad = (twist * Math.PI) / 180;
    const topR     = getRadius(1);
    const topRInner = Math.max(1, topR - wallThickness);

    const domeBaseY = Math.max(0, height - topR);

    const positions = [];
    const indices   = [];

    // ── OUTER WALL ROWS (rows 0 … hs) ────────────────────────────────────
    for (let i = 0; i <= hs; i++) {
      const h  = i / hs;
      const br = getRadius(h);
      const ht = h * twistRad;

      for (let j = 0; j < rs; j++) {
        const phi = (j / rs) * Math.PI * 2;
        let r = br;

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

        r = Math.max(0.2, r);
        positions.push(Math.cos(phi + ht) * r, h * domeBaseY, Math.sin(phi + ht) * r);
      }
    }

    // ── OUTER DOME ROWS (rows hs+1 … hs+DOME_SEGS-1) ─────────────────────
    for (let k = 1; k < DOME_SEGS; k++) {
      const angle     = (k / DOME_SEGS) * (Math.PI / 2);
      const fade      = Math.cos(angle);
      const baseR     = topR * fade;
      const domeY     = topR * Math.sin(angle);
      const y         = domeBaseY + domeY;
      const h         = 1 + domeY / (domeBaseY || 1);
      const domeTwist = twistRad + (twistRad * domeY / (domeBaseY || 1)) * fade;

      for (let j = 0; j < rs; j++) {
        const phi = (j / rs) * Math.PI * 2;
        let r = baseR;

        if (surfaceEffect === 'ribbed') {
          r *= 1 - ribDepth * fade * ((Math.sin(phi * ribCount) + 1) * 0.5);
        } else if (surfaceEffect === 'fluted') {
          r += Math.max(0, Math.sin(phi * ribCount)) * ribDepth * baseR * 0.6 * fade;
        } else if (surfaceEffect === 'organic') {
          const n = Math.sin(phi * 4.1 + h * 6.3) * 0.5 + Math.cos(phi * 7.2 - h * 11.1) * 0.3;
          r += n * ribDepth * baseR * 0.35 * fade;
        } else if (surfaceEffect === 'corrugated') {
          r += (Math.sin(h * Math.PI * 2 * ribCount) * 0.5 + 0.5) * ribDepth * baseR * 0.4 * fade;
        }

        r = Math.max(0.01, r);
        positions.push(Math.cos(phi + domeTwist) * r, y, Math.sin(phi + domeTwist) * r);
      }
    }

    // ── SHARED APEX VERTEX ────────────────────────────────────────────────
    const apexIdx = (hs + DOME_SEGS) * rs;
    positions.push(0, height, 0);

    // ── INNER WALL ROWS ───────────────────────────────────────────────────
    // Offset inward by wallThickness. Clamped to COLLAR_OUTER so the inner
    // wall never intrudes into the collar bore.
    const innerWallBase = apexIdx + 1;
    for (let i = 0; i <= hs; i++) {
      const h  = i / hs;
      const br = Math.max(COLLAR_OUTER, getRadius(h) - wallThickness);
      const ht = h * twistRad;
      for (let j = 0; j < rs; j++) {
        const phi = (j / rs) * Math.PI * 2;
        positions.push(Math.cos(phi + ht) * br, h * domeBaseY, Math.sin(phi + ht) * br);
      }
    }

    // ── INNER DOME ROWS ───────────────────────────────────────────────────
    // Same y-height progression as outer dome, smaller radius.
    for (let k = 1; k < DOME_SEGS; k++) {
      const angle     = (k / DOME_SEGS) * (Math.PI / 2);
      const fade      = Math.cos(angle);
      const baseR     = Math.max(0.01, topRInner * fade);
      const domeY     = topR * Math.sin(angle);  // same height as outer dome
      const y         = domeBaseY + domeY;
      const domeTwist = twistRad + (twistRad * domeY / (domeBaseY || 1)) * fade;

      for (let j = 0; j < rs; j++) {
        const phi = (j / rs) * Math.PI * 2;
        positions.push(Math.cos(phi + domeTwist) * baseR, y, Math.sin(phi + domeTwist) * baseR);
      }
    }

    // ── COLLAR VERTICES ───────────────────────────────────────────────────
    const boreN      = BORE_PROFILE.length;
    const collarBase = innerWallBase + (hs + DOME_SEGS) * rs;

    for (let k = 0; k < boreN; k++) {
      const { y: by, r: br } = BORE_PROFILE[k];
      for (let j = 0; j < rs; j++) {
        const phi = (j / rs) * Math.PI * 2;
        positions.push(Math.cos(phi) * COLLAR_OUTER, by, Math.sin(phi) * COLLAR_OUTER);
      }
      for (let j = 0; j < rs; j++) {
        const phi = (j / rs) * Math.PI * 2;
        positions.push(Math.cos(phi) * br, by, Math.sin(phi) * br);
      }
    }

    // ── OUTER WALL FACES (normals outward) ────────────────────────────────
    for (let i = 0; i < hs; i++) {
      for (let j = 0; j < rs; j++) {
        const a = i * rs + j,                  b = (i + 1) * rs + j;
        const c = (i + 1) * rs + (j + 1) % rs, d = i * rs + (j + 1) % rs;
        indices.push(a, b, c);
        indices.push(a, c, d);
      }
    }

    // ── OUTER DOME QUAD FACES ─────────────────────────────────────────────
    for (let i = hs; i < hs + DOME_SEGS - 1; i++) {
      for (let j = 0; j < rs; j++) {
        const a = i * rs + j,                  b = (i + 1) * rs + j;
        const c = (i + 1) * rs + (j + 1) % rs, d = i * rs + (j + 1) % rs;
        indices.push(a, b, c);
        indices.push(a, c, d);
      }
    }

    // ── OUTER APEX TRIANGLES ──────────────────────────────────────────────
    const outerLastRing = (hs + DOME_SEGS - 1) * rs;
    for (let j = 0; j < rs; j++) {
      indices.push(outerLastRing + j, outerLastRing + (j + 1) % rs, apexIdx);
    }

    // ── INNER WALL FACES (normals inward = reversed winding) ──────────────
    for (let i = 0; i < hs; i++) {
      for (let j = 0; j < rs; j++) {
        const a = innerWallBase + i * rs + j;
        const b = innerWallBase + (i + 1) * rs + j;
        const c = innerWallBase + (i + 1) * rs + (j + 1) % rs;
        const d = innerWallBase + i * rs + (j + 1) % rs;
        indices.push(a, c, b);
        indices.push(a, d, c);
      }
    }

    // ── INNER DOME QUAD FACES (reversed) ─────────────────────────────────
    for (let i = hs; i < hs + DOME_SEGS - 1; i++) {
      for (let j = 0; j < rs; j++) {
        const a = innerWallBase + i * rs + j;
        const b = innerWallBase + (i + 1) * rs + j;
        const c = innerWallBase + (i + 1) * rs + (j + 1) % rs;
        const d = innerWallBase + i * rs + (j + 1) % rs;
        indices.push(a, c, b);
        indices.push(a, d, c);
      }
    }

    // ── INNER APEX TRIANGLES (reversed, share same apex vertex) ──────────
    const innerLastRing = innerWallBase + (hs + DOME_SEGS - 1) * rs;
    for (let j = 0; j < rs; j++) {
      indices.push(innerLastRing + j, apexIdx, innerLastRing + (j + 1) % rs);
    }

    // ── BOTTOM RIM (y=0): outer wall row 0 → inner wall row 0 ─────────────
    // Closes the hollow shell at the bottom and connects it to the collar.
    for (let j = 0; j < rs; j++) {
      const outerJ  = j;
      const outerJ1 = (j + 1) % rs;
      const innerJ  = innerWallBase + j;
      const innerJ1 = innerWallBase + (j + 1) % rs;
      indices.push(outerJ, innerJ1, innerJ);
      indices.push(outerJ, outerJ1, innerJ1);
    }

    // ── COLLAR OUTER WALL ─────────────────────────────────────────────────
    for (let k = 0; k < boreN - 1; k++) {
      for (let j = 0; j < rs; j++) {
        const a = collarBase + k * (2 * rs) + j;
        const b = collarBase + (k + 1) * (2 * rs) + j;
        const c = collarBase + (k + 1) * (2 * rs) + (j + 1) % rs;
        const d = collarBase + k * (2 * rs) + (j + 1) % rs;
        indices.push(a, b, c);
        indices.push(a, c, d);
      }
    }

    // ── COLLAR INNER BORE ─────────────────────────────────────────────────
    for (let k = 0; k < boreN - 1; k++) {
      for (let j = 0; j < rs; j++) {
        const a = collarBase + k * (2 * rs) + rs + j;
        const b = collarBase + (k + 1) * (2 * rs) + rs + j;
        const c = collarBase + (k + 1) * (2 * rs) + rs + (j + 1) % rs;
        const d = collarBase + k * (2 * rs) + rs + (j + 1) % rs;
        indices.push(a, c, b);
        indices.push(a, d, c);
      }
    }

    // ── COLLAR BOTTOM CAP ─────────────────────────────────────────────────
    const lastK = boreN - 1;
    for (let j = 0; j < rs; j++) {
      const aO = collarBase + lastK * (2 * rs) + j;
      const bO = collarBase + lastK * (2 * rs) + (j + 1) % rs;
      const aI = collarBase + lastK * (2 * rs) + rs + j;
      const bI = collarBase + lastK * (2 * rs) + rs + (j + 1) % rs;
      indices.push(aO, aI, bI);
      indices.push(aO, bI, bO);
    }

    // ── COLLAR TOP DISC (y=0): outer wall → collar outer ring ─────────────
    // Thin annular face connecting the lamp body bottom to the collar.
    for (let j = 0; j < rs; j++) {
      const shadeJ   = j;
      const shadeJ1  = (j + 1) % rs;
      const collarJ  = collarBase + j;
      const collarJ1 = collarBase + (j + 1) % rs;
      indices.push(shadeJ, collarJ1, collarJ);
      indices.push(shadeJ, shadeJ1, collarJ1);
    }

    // ── COLLAR TOP RING (y=0): collar outer → collar inner bore ───────────
    for (let j = 0; j < rs; j++) {
      const outerJ  = collarBase + j;
      const outerJ1 = collarBase + (j + 1) % rs;
      const innerJ  = collarBase + rs + j;
      const innerJ1 = collarBase + rs + (j + 1) % rs;
      indices.push(outerJ, innerJ, innerJ1);
      indices.push(outerJ, innerJ1, outerJ1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(positions), 3));
    geo.setIndex(new THREE.Uint32BufferAttribute(new Uint32Array(indices), 1));
    geo.computeVertexNormals();
    return geo;
  }, [settings]);

  return (
    <mesh ref={ref} name="LampShade" geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={settings.color || '#f5f0e8'}
        roughness={0.85}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});

LampShade.displayName = 'LampShade';
export default LampShade;
