import React, { useMemo, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import * as THREE from 'three';

/**
 * Loads and displays base.stl (BambuLab LED Kit base) as a read-only reference.
 *
 * The STL uses Z-up (3D print convention). Three.js uses Y-up.
 * Conversion: translate to centre, then rotate –PI/2 around X so
 *   STL (x, y, z)  →  Three.js (x,  z, –y)
 * Result: base sits flat at y = 0 … 15 mm.
 */
function BaseModelInner() {
  const rawGeo = useLoader(STLLoader, '/base.stl');

  const geometry = useMemo(() => {
    const geo = rawGeo.clone();
    // Centre the 70×70 footprint (STL origin is at one corner)
    geo.translate(-35, -35, 0);
    // Convert Z-up → Y-up  (rotation –PI/2 around X)
    geo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    geo.computeVertexNormals();
    return geo;
  }, [rawGeo]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#c8cdd6" roughness={0.55} metalness={0.18} />
    </mesh>
  );
}

export default function BaseModel() {
  return (
    <Suspense fallback={null}>
      <BaseModelInner />
    </Suspense>
  );
}
