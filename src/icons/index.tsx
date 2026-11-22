import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ICON_ASSETS } from "./generated";

export { AVATARS } from "./avatars";

/** imagegen 绘制、按清单切图的透明 PNG。原 SVG 源稿保留供回溯。 */
export const ICONS = ICON_ASSETS;
export type IconName = keyof typeof ICONS;

const loadedIcons = new Set<string>();

/** Square icon picture. While it loads it shows a soft placeholder; if it fails it retries once, then falls back to a neutral face, so a slot is never blank or the wrong character. */
export function Icon({ name, size = 48, className = "", style, label }: { name: string; size?: number | string; className?: string; style?: CSSProperties; label?: string }) {
  const wanted = ICONS[name] ?? ICONS.star;
  const [state, setState] = useState<{ src: string; tries: number; loaded: boolean }>(() => ({ src: wanted, tries: 0, loaded: loadedIcons.has(wanted) }));
  const current = state.src.startsWith(wanted) || state.src === ICONS.face ? state : { src: wanted, tries: 0, loaded: loadedIcons.has(wanted) };
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth) {
      loadedIcons.add(current.src);
      setState(s => s.loaded ? s : { ...s, loaded: true });
    }
  }, [current.src]);
  const failed = () => setState(s => s.tries < 1 ? { src: `${wanted}?retry=1`, tries: 1, loaded: false } : { src: ICONS.face, tries: 2, loaded: loadedIcons.has(ICONS.face) });
  return (
    <img
      ref={ref}
      src={current.src}
      width={size}
      height={size}
      decoding="async"
      className={`icon ${current.loaded ? "" : "is-loading "}${className}`}
      style={style}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      onLoad={() => { loadedIcons.add(current.src); setState(s => s.loaded ? s : { ...s, loaded: true }); }}
      onError={failed}
    />
  );
}

/** 星级（稀有度） */
export function Stars({ n, size = 22 }: { n: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${n} 星`}>
      {Array.from({ length: n }, (_, i) => <Icon key={i} name="star" size={size} />)}
    </span>
  );
}

/** 爱心（亲密度） */
export function Hearts({ n, total = 5, size = 26 }: { n: number; total?: number; size?: number }) {
  return (
    <span className="hearts" aria-label={`亲密度 ${n}/${total}`}>
      {Array.from({ length: total }, (_, i) => <Icon key={i} name={i < n ? "heart" : "heart-empty"} size={size} />)}
    </span>
  );
}

/** 保留旧接口名；3D 场景加载与界面同源的 PNG。 */
export function iconDataUrl(name: string, _px = 128) {
  return ICONS[name] ?? ICONS.star;
}
