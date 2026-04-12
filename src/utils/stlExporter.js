/**
 * Vase Studio Pro – Binary STL Exporter
 *
 * Coordinate convention:
 *   Three.js: Y-up  →  STL/slicer: Z-up
 *   Swap: write (X, Z, Y) so the vase stands upright in Bambu Studio.
 *
 * Winding fix:
 *   Swapping Y↔Z inverts handedness (right→left), which reverses CCW→CW.
 *   Compensate by writing triangle vertices in REVERSED order: [c, b, a]
 *   so winding is restored to CCW in the Z-up coordinate frame.
 *
 * Normals:
 *   Recomputed AFTER coordinate swap so they point correctly outward.
 */

function buildBinarySTL(mesh) {
  const geometry = mesh.geometry;
  if (!geometry) throw new Error('No geometry on mesh');

  // Flatten indexed geometry → raw triangles
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position;

  if (!pos) throw new Error('No position attribute');

  const triCount = pos.count / 3;
  const buffer   = new ArrayBuffer(80 + 4 + triCount * 50);
  const view     = new DataView(buffer);

  // 80-byte ASCII header
  const hdr = 'Vase Studio Pro - 3D Print Ready';
  for (let i = 0; i < 80; i++) view.setUint8(i, i < hdr.length ? hdr.charCodeAt(i) : 0);

  // Triangle count
  view.setUint32(80, triCount, true);

  let off = 84;

  for (let i = 0; i < triCount; i++) {
    const p = i * 3;

    // --- Read Three.js (Y-up) positions  ---
    const ax = pos.getX(p),   ay = pos.getY(p),   az = pos.getZ(p);
    const bx = pos.getX(p+1), by = pos.getY(p+1), bz = pos.getZ(p+1);
    const cx = pos.getX(p+2), cy = pos.getY(p+2), cz = pos.getZ(p+2);

    // --- Convert to Z-up (swap Y and Z) ---
    // Three.js (X, Y, Z) → STL (X, Z, Y)
    const Ax = ax, Ay = az, Az = ay;   // A in Z-up
    const Bx = bx, By = bz, Bz = by;
    const Cx = cx, Cy = cz, Cz = cy;

    // --- Compute face normal in Z-up space ---
    // Edges CA and CB (cross product gives outward normal with CCW winding)
    // Winding after swap is reversed → use C→A, C→B to get correct outward normal
    const e1x = Ax - Cx, e1y = Ay - Cy, e1z = Az - Cz;
    const e2x = Bx - Cx, e2y = By - Cy, e2z = Bz - Cz;

    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;

    // Write normal
    view.setFloat32(off, nx, true); off += 4;
    view.setFloat32(off, ny, true); off += 4;
    view.setFloat32(off, nz, true); off += 4;

    // Write vertices in REVERSED order (C, B, A) to compensate winding flip from swap
    view.setFloat32(off, Cx, true); off += 4;
    view.setFloat32(off, Cy, true); off += 4;
    view.setFloat32(off, Cz, true); off += 4;

    view.setFloat32(off, Bx, true); off += 4;
    view.setFloat32(off, By, true); off += 4;
    view.setFloat32(off, Bz, true); off += 4;

    view.setFloat32(off, Ax, true); off += 4;
    view.setFloat32(off, Ay, true); off += 4;
    view.setFloat32(off, Az, true); off += 4;

    // Attribute byte count (always 0)
    view.setUint16(off, 0, true); off += 2;
  }

  return buffer;
}

export const exportMeshToSTL = async (mesh, filename = 'Designer_Vase.stl') => {
  if (!mesh || !mesh.geometry) {
    alert('Modell noch nicht bereit. Bitte warte einen Moment.');
    return;
  }

  const safeName = filename.endsWith('.stl') ? filename : `${filename}.stl`;

  let stlBuffer;
  try {
    stlBuffer = buildBinarySTL(mesh);
    console.log(`STL: ${Math.round(stlBuffer.byteLength / 50)} triangles, ${stlBuffer.byteLength} bytes`);
  } catch (err) {
    alert('Geometry error: ' + err.message);
    return;
  }

  // Primary: native File System Access API (macOS save dialog)
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: safeName,
        types: [{ description: '3D STL File', accept: { 'application/octet-stream': ['.stl'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(stlBuffer);
      await writable.close();
      console.log('Saved via File System Access API ✓');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // user cancelled
      console.warn('showSaveFilePicker failed, trying blob download:', err);
    }
  }

  // Fallback: Blob download
  const blob = new Blob([stlBuffer], { type: 'application/octet-stream' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = safeName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
  console.log('Saved via blob download ✓');
};
