import * as THREE from "three";
import { iconDataUrl } from "../icons";

export interface SpriteInfo {
  texture: THREE.Texture;
  /** 宽 / 高（裁掉透明边之后） */
  aspect: number;
  /** 脚底（最下面 22% 的高度里）实际有像素的宽度，占整张图宽度的比例：接触影子按它缩放 */
  foot: number;
}

const spriteCache = new Map<string, Promise<SpriteInfo>>();

/** 加载宝可梦立绘并裁掉四周透明边，让脚正好落在地面上 */
export function loadSprite(url: string): Promise<SpriteInfo> {
  let p = spriteCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = 0, y1 = 0;
        for (let y = 0; y < h; y += 2)
          for (let x = 0; x < w; x += 2)
            if (data[(y * w + x) * 4 + 3] > 40) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
        if (x1 <= x0 || y1 <= y0) [x0, y0, x1, y1] = [0, 0, w, h];
        const cw = x1 - x0 + 2, ch = y1 - y0 + 2;
        const out = document.createElement("canvas");
        out.width = cw;
        out.height = ch;
        out.getContext("2d")!.drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
        const texture = new THREE.CanvasTexture(out);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        // 脚底宽度：只看最下面 22% 的行
        let fx0 = x1, fx1 = x0;
        for (let y = Math.floor(y1 - (y1 - y0) * 0.22); y <= y1; y += 2)
          for (let x = x0; x <= x1; x += 2)
            if (data[(y * w + x) * 4 + 3] > 60) {
              if (x < fx0) fx0 = x;
              if (x > fx1) fx1 = x;
            }
        const foot = fx1 > fx0 ? (fx1 - fx0) / cw : 0.6;
        resolve({ texture, aspect: cw / ch, foot });
      };
      img.onerror = () => reject(new Error(`sprite load failed: ${url}`));
      img.src = url;
    });
    // 失败的结果不缓存，下次重新加载
    p.catch(() => spriteCache.delete(url));
    spriteCache.set(url, p);
  }
  return p;
}

const iconCache = new Map<string, THREE.Texture>();
/**
 * 把统一的 PNG 图标画成贴图，用于头顶状态、互动特效和篝火火焰。
 * badge=true 时加白色圆底和靛蓝描边，远处也清晰。
 */
export function iconTexture(name: string, badge = false): THREE.Texture {
  const key = `${name}|${badge}`;
  let t = iconCache.get(key);
  if (!t) {
    const size = 256;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const img = new Image();
    img.onload = () => {
      const ctx = cv.getContext("2d")!;
      if (badge) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fill();
        ctx.lineWidth = 10;
        ctx.strokeStyle = "#7c8cff";
        ctx.stroke();
        ctx.drawImage(img, size * 0.18, size * 0.18, size * 0.64, size * 0.64);
      } else {
        ctx.drawImage(img, 0, 0, size, size);
      }
      tex.needsUpdate = true;
    };
    img.src = iconDataUrl(name, size);
    t = tex;
    iconCache.set(key, t);
  }
  return t;
}

let contactTex: THREE.Texture | null = null;
/**
 * 接触影子（动森式）：脚下一团带冷蓝色调的深色椭圆，中心实、边缘柔，让角色“站”在地上。
 */
export function contactShadowTexture(): THREE.Texture {
  if (!contactTex) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 63);
    g.addColorStop(0, "rgba(22,34,58,0.95)");
    g.addColorStop(0.4, "rgba(22,34,58,0.78)");
    g.addColorStop(0.72, "rgba(22,34,58,0.34)");
    g.addColorStop(1, "rgba(22,34,58,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    contactTex = new THREE.CanvasTexture(c);
    contactTex.colorSpace = THREE.SRGBColorSpace;
  }
  return contactTex;
}
