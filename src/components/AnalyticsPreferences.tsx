import {useState,useSyncExternalStore} from 'react';
import {analyticsAvailable,analyticsConsent,setAnalyticsConsent,subscribeAnalytics} from '../lib/analytics';
import './analytics-preferences.css';
export function AnalyticsPreferences(){
 const enabled=useSyncExternalStore(subscribeAnalytics,analyticsConsent,()=>false);
 const [parent,setParent]=useState(false),[status,setStatus]=useState('');
 const available=analyticsAvailable();
 const change=(next:boolean)=>{const saved=setAnalyticsConsent(next);setStatus(saved?(next?'已开启，可随时关闭。':'已关闭，将停止统计并清除本页可访问的统计 Cookie。'):'浏览器无法保存选择，未开启统计。');setParent(false);};
 return <div className="analytics-preferences" aria-label="可选访问统计">
  <h3>可选：帮助我们了解页面使用情况</h3>
  <p>家长同意后才加载 Google Analytics，统计页面访问、来源网站及基本设备信息；会使用会话 Cookie，Google 会接收网络请求信息。不会上传宝宝姓名、照片、录音、日记、答题或学习记录。</p>
  <p>不开启也能完整游玩。可在「家长中心 → 应用维护」或「隐私与数据」中关闭。<a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">Google 如何处理数据 ↗</a></p>
  {!available&&<p className="analytics-status">本地预览和非正式站点不运行统计。</p>}
  {enabled?<button type="button" onClick={()=>change(false)}>关闭访问统计</button>:<><label className="analytics-confirm"><input type="checkbox" checked={parent} onChange={e=>setParent(e.target.checked)}/><span>我是家长，了解并同意上述可选统计。</span></label><button type="button" disabled={!parent||!available} onClick={()=>change(true)}>开启访问统计</button></>}
  <p role="status" className="analytics-status">{status||`当前：${enabled?'已开启':'未开启'}`}</p>
 </div>;
}
