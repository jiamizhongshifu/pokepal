import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { Icon } from "../icons";

/**
 * 小精灵图片：加载失败时不显示浏览器的裂图图标，而是先显示柔和的占位，
 * 并按 1s、2s、4s…（最长 15s）自动重试，成功后换回图片。
 */
export function CreatureImg({ src, className, alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setAttempt(0);
    setFailed(false);
  }, [src]);
  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => {
      setAttempt((a) => a + 1);
      setFailed(false);
    }, Math.min(15000, 1000 * 2 ** attempt));
    return () => clearTimeout(t);
  }, [failed, attempt]);
  const url = attempt ? `${src}?retry=${attempt}` : src;
  if (failed) {
    return (
      <span className={`poke-img-fallback ${className ?? ""}`} style={rest.style} aria-hidden>
        <Icon name="invite-berry" size={56} />
      </span>
    );
  }
  return <img decoding="async" {...rest} className={className} src={url} alt={alt} onError={() => setFailed(true)} />;
}
