import * as THREE from "three";
import { shrubGeometry } from "../scene/hq/Garden";
import { tuftGeometry } from "../scene/hq/Grass";

/**
 * 离屏渲染 3D 小道具成图片（草丛页用）：和家园里同一套建模，风格与宝可梦的 3D 立绘统一。
 * 每种只渲染一次并缓存为 dataURL；渲染完立即释放 WebGL 上下文。
 */
const cache = new Map<string, Promise<string>>();

function withRenderer(w: number, h: number, draw: (r: THREE.WebGLRenderer) => void): string {
  const canvas = document.createElement("canvas");
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  r.setClearColor(0x000000, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1.18;
  draw(r);
  const url = canvas.toDataURL("image/png");
  r.dispose();
  r.forceContextLoss();
  return url;
}

function lights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight("#e6f4ff", "#a9c98a", 1.6));
  const sun = new THREE.DirectionalLight("#fff3dc", 2.4);
  sun.position.set(-2, 4, 3);
  scene.add(sun);
  const rim = new THREE.DirectionalLight("#cfe8ff", 0.9);
  rim.position.set(3, 2, -3);
  scene.add(rim);
}

/** 草丛：一丛圆团灌木 + 前面几簇小草 */
function renderBush(seed: number) {
  return withRenderer(440, 260, (r) => {
    const scene = new THREE.Scene();
    lights(scene);
    const foliage = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const { geo } = shrubGeometry(seed);
    const bush = new THREE.Mesh(geo, foliage);
    bush.scale.set(1.6, 1.15, 1.1);
    scene.add(bush);
    // 两侧再各加一丛小一点的，形成一排草丛
    for (const [x, s, sd] of [[-1.05, 0.85, seed + 3], [1.05, 0.9, seed + 7]] as const) {
      const g = shrubGeometry(sd).geo;
      const m = new THREE.Mesh(g, foliage);
      m.position.set(x, -0.05, 0.15);
      m.scale.set(s * 1.15, s * 0.95, s);
      scene.add(m);
    }
    const tuftMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
    const tg = tuftGeometry();
    for (let i = 0; i < 7; i++) {
      const t = new THREE.Mesh(tg, tuftMat);
      const x = -1.3 + i * 0.43 + Math.sin(i * 7 + seed) * 0.08;
      t.position.set(x, 0, 0.55 + Math.cos(i * 3 + seed) * 0.08);
      const s = 2.4 + ((i * 37 + seed) % 5) * 0.15;
      t.scale.set(s, s * 1.1, s);
      t.rotation.y = i * 1.3 + seed;
      scene.add(t);
    }
    const cam = new THREE.PerspectiveCamera(30, 440 / 260, 0.1, 50);
    cam.position.set(0, 1.25, 4.3);
    cam.lookAt(0, 0.48, 0);
    r.render(scene, cam);
    geo.dispose();
    tg.dispose();
  });
}

/** 金色立体星星（带倒角） */
function renderStar() {
  return withRenderer(128, 128, (r) => {
    const scene = new THREE.Scene();
    lights(scene);
    const shape = new THREE.Shape();
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const rad = i % 2 === 0 ? 1 : 0.48;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.16, bevelSegments: 6 });
    g.center();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "#ffcf33", roughness: 0.32, metalness: 0.15, emissive: "#ff9d00", emissiveIntensity: 0.12 }));
    m.rotation.set(-0.25, 0.3, 0);
    scene.add(m);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    cam.position.set(0, 0, 4.4);
    r.render(scene, cam);
    g.dispose();
  });
}

export function rendered(kind: "bush0" | "bush1" | "bush2" | "star"): Promise<string> {
  let p = cache.get(kind);
  if (!p) {
    p = new Promise<string>((resolve, reject) => {
      // 放到空闲时渲染，不卡界面
      setTimeout(() => {
        try {
          resolve(kind === "star" ? renderStar() : renderBush(11 + Number(kind.slice(4)) * 29));
        } catch (e) {
          cache.delete(kind);
          reject(e);
        }
      }, 0);
    });
    cache.set(kind, p);
  }
  return p;
}
