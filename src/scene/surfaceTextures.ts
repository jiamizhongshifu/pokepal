import * as THREE from 'three';

// Four tiny, shared maps: surface detail stays soft at tablet viewing distance.
// Lazy creation keeps geometry/navigation tests independent of the DOM.
const maps = new Map<string, THREE.CanvasTexture>();
export function surfaceTexture(kind: 'wood' | 'weave' | 'wicker' | 'stone') {
  const cached = maps.get(kind); if (cached) return cached;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#f5f1e7'; c.fillRect(0, 0, 128, 128);
  if (kind === 'wood') {
    c.lineWidth = 1;
    for (let row = -4; row < 132; row += 7) {
      c.strokeStyle = row % 3 ? '#d9ccb4' : '#e5dac5'; c.beginPath();
      for (let x = 0; x <= 128; x += 2) {
        const y = row + Math.sin(x * Math.PI / 64 + row) * 1.8;
        if (!x) c.moveTo(x, y); else c.lineTo(x, y);
      } c.stroke();
    }
    c.strokeStyle = '#d7c5a8'; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(47, 62, 12, 3, 0, 0, Math.PI * 2); c.stroke();
  } else if (kind === 'weave' || kind === 'wicker') {
    const step = kind === 'weave' ? 4 : 16;
    for (let y = 0; y < 128; y += step) for (let x = 0; x < 128; x += step) {
      c.fillStyle = (x / step + y / step) % 2 ? '#ded6c5' : '#eee7d9';
      c.fillRect(x, y, step - 1, step - 1);
      if (kind === 'wicker') { c.fillStyle = '#c9b99d'; c.fillRect(x, y + step - 3, step - 1, 2); }
    }
  } else {
    let seed = 74;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 1000; i++) {
      c.fillStyle = i % 3 ? '#e9e6dc' : '#d9d8cf';
      c.fillRect(random() * 128, random() * 128, 1 + random() * 2, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  maps.set(kind, texture);
  return texture;
}
