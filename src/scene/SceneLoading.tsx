import { useProgress } from "@react-three/drei";

/** 3D 资源加载进度；加载完自动消失 */
export function SceneLoading() {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="scene-loading">
      <div className="sl-ball" />
      <div>正在布置家园… {Math.round(progress)}%</div>
    </div>
  );
}
