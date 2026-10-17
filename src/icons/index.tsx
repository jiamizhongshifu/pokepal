import type { CSSProperties } from "react";
import { ICON_ASSETS } from "./generated";

export { TYPE_ICON } from "./nature";
export { AVATARS } from "./avatars";

/** imagegen 绘制、按清单切图的透明 PNG。原 SVG 源稿保留供回溯。 */
export const ICONS = ICON_ASSETS;
export type IconName = keyof typeof ICONS;

/** 统一正方形画布，保留所有调用方的尺寸、动画与无障碍接口。 */
export function Icon({ name, size = 48, className = "", style, label }: { name: string; size?: number | string; className?: string; style?: CSSProperties; label?: string }) {
  return (
    <img
      src={ICONS[name] ?? ICONS.star}
      width={size}
      height={size}
      className={`icon ${className}`}
      style={style}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
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
