import { useMemo, useState } from 'react';
import { useGame } from '../store';
import { Icon } from '../icons';
import { TRIAL_DAYS, ratioText, trialSummary, trialSummaryText } from '../lib/trialSummary';

/** The two-week recap for families in the trial. Nothing is sent: the grown-up copies it only if they want to. */
export function TrialSummaryCard() {
 const save = useGame(s => s.save);
 const t = useMemo(() => trialSummary(save), [save]);
 const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('');
 const copy = async () => {
  try { await navigator.clipboard.writeText(trialSummaryText(t)); setCopied('ok'); } catch { setCopied('fail'); }
 };
 return <details className="parent-fold trial-summary">
  <summary><Icon name="tasks" size={28}/><span>两周试用小结<small>最近 {TRIAL_DAYS} 天用了 {t.activeDays} 天 · 约 {t.minutes} 分钟</small></span></summary>
  <div className="parent-fold-content">
   <dl className="parent-record-definitions">
    <div><dt>用了几天</dt><dd>{t.activeDays} / {TRIAL_DAYS} 天</dd></div>
    <div><dt>合计时长</dt><dd>约 {t.minutes} 分钟</dd></div>
    <div><dt>这两周新走完</dt><dd>{t.lessons.length} 课</dd></div>
    <div><dt>课程里作答</dt><dd>{ratioText(t.lesson)}</dd></div>
    <div><dt>隔天复习</dt><dd>{ratioText(t.review)}</dd></div>
    <div><dt>小岛上听懂后去做</dt><dd>{ratioText(t.islandDid)}</dd></div>
    <div><dt>小岛上选对了要说的话</dt><dd>{ratioText(t.islandSaid)}</dd></div>
    <div><dt>在家试过的句子</dt><dd>{t.homeTried} 句</dd></div>
   </dl>
   <p>参加试用的家庭，可以把这份小结复制到“联系与反馈”里发给我们，再补充几句自己的观察。小结只有次数和课名，不含名字、录音、照片和日记；不复制就不会离开这台设备。</p>
   <button className="btn-small" onClick={copy}><Icon name="book" size={22}/>复制小结</button>
   {copied && <p role="status">{copied === 'ok' ? '已复制，可以粘贴到反馈里。' : '这个浏览器不允许复制，可以截图这一页，或照着上面的数字填写。'}</p>}
  </div>
 </details>;
}
