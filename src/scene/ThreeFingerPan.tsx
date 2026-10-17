import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls } from 'three-stdlib';

/** Translate along the island ground, keeping camera angle and zoom unchanged. */
export function panIsland(camera: PerspectiveCamera, controls: OrbitControls, dx: number, dy: number, height: number) {
  const offset = camera.position.clone().sub(controls.target);
  const scale = 2 * offset.length() * Math.tan(MathUtils.degToRad(camera.fov / 2)) / Math.max(height, 1);
  const right = new Vector3().setFromMatrixColumn(camera.matrix, 0).setY(0).normalize();
  const forward = new Vector3().crossVectors(new Vector3(0, 1, 0), right);
  const pitch = Math.max(.25, Math.abs(offset.y) / offset.length());
  const delta = right.multiplyScalar(-dx * scale).addScaledVector(forward, dy * scale / pitch);
  // Keep the island reachable even after repeated swipes; never use screen dimensions.
  delta.x = MathUtils.clamp(controls.target.x + delta.x, -18, 18) - controls.target.x;
  delta.z = MathUtils.clamp(controls.target.z + delta.z, -16, 14) - controls.target.z;
  controls.target.add(delta);
  camera.position.add(delta);
  controls.update();
}

export function attachThreeFingerPan(element: HTMLElement, camera: PerspectiveCamera, controls: OrbitControls, onStart: () => void) {
  let active = false;
  let previous: {x:number;y:number} | null = null;
  let wasEnabled = true;
  let wasDamping = true;
  let suppressClickUntil = 0;
  const centroid = (touches: TouchList) => ({
    x: Array.from(touches).reduce((n,t) => n + t.clientX, 0) / touches.length,
    y: Array.from(touches).reduce((n,t) => n + t.clientY, 0) / touches.length,
  });
  const restore = () => {
    if (active) {
      controls.enabled = wasEnabled;
      controls.enableDamping = wasDamping;
      suppressClickUntil = performance.now() + 300;
    }
    active = false;
    previous = null;
  };
  const start = (event: TouchEvent) => {
    // Fingers must all begin on the canvas, not on the companion card or navigation.
    if (event.targetTouches.length < 3) return;
    if (!active) {
      active = true;
      wasEnabled = controls.enabled;
      wasDamping = controls.enableDamping;
      controls.enabled = false;
      // Flush residual rotation before panning, otherwise damping keeps orbiting.
      controls.enableDamping = false;
      controls.update();
      onStart();
    }
    previous = event.targetTouches.length === 3 ? centroid(event.targetTouches) : null;
    event.preventDefault();
  };
  const move = (event: TouchEvent) => {
    if (!active) return;
    event.preventDefault();
    if (event.targetTouches.length !== 3) { previous = null; return; }
    const next = centroid(event.targetTouches);
    if (previous) panIsland(camera, controls, next.x - previous.x, next.y - previous.y, element.clientHeight);
    previous = next;
  };
  const end = (event: TouchEvent) => {
    if (!active) return;
    event.preventDefault();
    previous = event.targetTouches.length === 3 ? centroid(event.targetTouches) : null;
    // Wait for all fingers to lift: a 3→2→1 transition must not suddenly orbit or zoom.
    if (!event.targetTouches.length) restore();
  };
  const click = (event: MouseEvent) => {
    if (active || performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const blur = () => restore();
  element.addEventListener('touchstart', start, {passive:false});
  element.addEventListener('touchmove', move, {passive:false});
  element.addEventListener('touchend', end, {passive:false});
  element.addEventListener('touchcancel', end, {passive:false});
  element.addEventListener('click', click, true);
  window.addEventListener('blur', blur);
  return () => {
    restore();
    element.removeEventListener('touchstart', start);
    element.removeEventListener('touchmove', move);
    element.removeEventListener('touchend', end);
    element.removeEventListener('touchcancel', end);
    element.removeEventListener('click', click, true);
    window.removeEventListener('blur', blur);
  };
}

export function ThreeFingerPan({ onStart }: {onStart: () => void}) {
  const {gl, camera, controls} = useThree();
  const callback = useRef(onStart);
  callback.current = onStart;
  useEffect(() => {
    if (!controls || !(camera instanceof PerspectiveCamera)) return;
    return attachThreeFingerPan(gl.domElement, camera, controls as OrbitControls, () => callback.current());
  }, [gl, camera, controls]);
  return null;
}
