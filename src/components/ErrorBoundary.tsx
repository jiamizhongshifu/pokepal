import { Component, type ReactNode } from "react";
import { Icon } from "../icons";

/** 出错时给宝宝一个友好的画面和"回家"按钮，而不是白屏 */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[PokéPal]", error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen center-msg" style={{ background: "#fff8e1" }}>
        <Icon name="dizzy" size={120} />
        <div>哎呀，宝可梦摔了一跤</div>
        {import.meta.env.VITE_ONLINE ? <button className="btn-big" onClick={()=>location.reload()}><Icon name="home" size={40}/> 重新打开小岛</button> : <button className="btn-big" onClick={() => { this.setState({ error: null }); this.props.onReset(); }}><Icon name="home" size={40} /> 回家园</button>}
        <p className="muted">原来的进度不会因此被主动清空。若反复出现，请让家长帮忙。</p>
        <a href="/feedback/" target="_blank" rel="noopener noreferrer">家长联系与反馈</a>
      </div>
    );
  }
}
