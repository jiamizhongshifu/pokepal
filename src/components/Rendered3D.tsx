import { ICONS, Stars } from "../icons";

/** 保留调用接口，捕捉页草丛使用统一生成的透明图标。 */
export function Bush3D({ variant = 0 }: { variant?: number }) {
  const index = ((variant % 3) + 3) % 3;
  return <img className="bush-3d" src={ICONS[`bush-${index}`]} alt="" draggable={false} />;
}

/** 捕捉页与图鉴统一使用同一枚星级图标。 */
export function Stars3D({ n, size = 30 }: { n: number; size?: number }) {
  return <Stars n={n} size={size} />;
}
