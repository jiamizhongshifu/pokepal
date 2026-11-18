import { ICONS, Stars } from "../icons";

/** 保留调用接口，草丛页使用统一生成的透明图标。 */
export function Bush3D({ variant = 0 }: { variant?: number }) {
  const index = ((variant % 3) + 3) % 3;
  return <img className="bush-3d" src={ICONS[`bush-${index}`]} alt="" draggable={false} />;
}

/** 草丛页与好朋友相册统一使用同一枚星级图标。 */
export function Stars3D({ n, size = 30 }: { n: number; size?: number }) {
  return <Stars n={n} size={size} />;
}
