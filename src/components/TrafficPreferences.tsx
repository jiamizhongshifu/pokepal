import {useState,useSyncExternalStore} from 'react';
import {aggregateAvailable,aggregateEnabled,setAggregateEnabled,subscribeAggregate} from '../lib/traffic';
import './analytics-preferences.css';
export function TrafficPreferences(){
 const enabled=useSyncExternalStore(subscribeAggregate,aggregateEnabled,()=>false);
 const [message,setMessage]=useState('');
 const available=aggregateAvailable();
 return <div className="analytics-preferences" aria-label="基础访问量统计">
  <h3>基础访问量</h3><p>默认只向本站发送固定页面名称和次数，按天汇总。不设置统计 Cookie 或访客标识，不读取宝宝的存档，不统计独立人数或个人轨迹。可随时关闭，不影响游玩。</p>
  <button type="button" disabled={!available} onClick={()=>{const ok=setAggregateEnabled(!enabled);setMessage(ok?'已保存选择。浏览器的“请勿跟踪”或隐私控制优先生效。':'无法保存选择，本页已停止汇总统计。');}}>{enabled?'关闭基础访问量统计':'开启基础访问量统计'}</button>
  <p className="analytics-status" role="status">{message||(!available?'本地预览和非正式站点不运行统计。':`当前：${enabled?'已开启':'已关闭（也可能受浏览器隐私设置限制）'}`)}</p>
 </div>;
}
