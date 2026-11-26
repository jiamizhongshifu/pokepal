import { Component, type ReactNode } from "react";
import { Icon } from "../icons";

/** 出错时给孩子一个友好的画面和"回家"按钮，而不是白屏 */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[Bubbly Isle]", error);
    // A page that could not load for want of a network opens by itself once the network is back.
    if (!navigator.onLine) addEventListener("online", this.again, { once: true });
  }
  componentWillUnmount() { removeEventListener("online", this.again); }
  again = () => {
    if (!this.state.error) return;
    if (import.meta.env.VITE_ONLINE) location.reload(); else { this.setState({ error: null }); this.props.onReset(); }
  };
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen center-msg" style={{ background: "var(--page-bg)" }}>
        <Icon name="dizzy" size={120} />
        <div>{navigator.onLine ? "哎呀，小精灵摔了一跤" : "网络断了，这一页还没准备好"}</div>
        {!navigator.onLine && <p className="muted">连上网后会自动打开，也可以点下面的按钮。</p>}
        {import.meta.env.VITE_ONLINE ? <button className="btn-big" onClick={()=>location.reload()}><Icon name="home" size={40}/> 重新打开小岛</button> : <button className="btn-big" onClick={() => { this.setState({ error: null }); this.props.onReset(); }}><Icon name="home" size={40} /> 回家园</button>}
        <p className="muted">原来的进度不会因此被主动清空。若反复出现，请让家长帮忙。</p>
        <a href="/feedback/" target="_blank" rel="noopener noreferrer">家长联系与反馈</a>
      </div>
    );
  }
}
