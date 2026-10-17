import { useState } from "react";
import { ICONS, Icon } from "./index";

/** 仅开发模式：生成图标总览，访问 /#icons。 */
export function IconSheet() {
  const [dark, setDark] = useState(false);
  return (
    <div className="screen" style={{ overflow: "auto", padding: 28, background: dark ? "#252b35" : "#f2f4f8", color: dark ? "#fff" : "#252b35", textShadow: "none" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div><h1 style={{ margin: 0, fontSize: 28 }}>PokéPal · 剑盾风格图标</h1><p style={{ margin: "8px 0 0", fontSize: 15 }}>{Object.keys(ICONS).length} 个透明 PNG · imagegen 绘制 · 256 / 128 / 64 px</p></div>
        <button className="btn-small" onClick={() => setDark(!dark)}>{dark ? "浅色背景" : "深色背景"}</button>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))", gap: 12 }}>
        {Object.keys(ICONS).map((name) => (
          <a key={name} href={ICONS[name]} download={`${name}.png`} style={{ borderRadius: 16, padding: "12px 4px", textAlign: "center", fontSize: 12, textDecoration: "none", color: "inherit", background: dark ? "#343d4b" : "white" }}>
            <Icon name={name} size={72} label={name} />
            <div style={{ marginTop: 8 }}>{name}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
