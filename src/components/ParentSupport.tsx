import {useEffect, useRef, useState} from 'react';
import {PARENT_CONTACT, parentContactReady} from '../data/parentContact';
import {PARENT_NOTICE_VERSION, recordParentNotice} from '../lib/parentNotice';
import {FEEDBACK_TOPICS, feedbackEnvironment, makeFeedbackReport} from '../lib/parentFeedback';
import {useModalLayer} from '../lib/modalLayer';
import './parent-support.css';

export function ParentLinks() {
  return <nav className="parent-support-links" aria-label="家长须知与帮助">
    <a href="/terms/" target="_blank" rel="noopener noreferrer">试用须知<span className="ps-sr">（新标签页）</span></a>
    <a href="/privacy/" target="_blank" rel="noopener noreferrer">隐私与数据<span className="ps-sr">（新标签页）</span></a>
    <a href="/feedback/" target="_blank" rel="noopener noreferrer">联系与反馈<span className="ps-sr">（新标签页）</span></a>
  </nav>;
}

export function ParentNotice({onContinue,onClose}:{onContinue:()=>void;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [checked,setChecked]=useState(false);
  useModalLayer();
  useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
  return <dialog ref={dialog} className="parent-notice ps-surface" aria-labelledby="parent-notice-title" onCancel={onClose}>
    <header><div><small>给陪伴的大人</small><h2 id="parent-notice-title">先一起准备一下</h2></div><button onClick={onClose} aria-label="关闭试用须知">×</button></header>
    <p>3–6 岁英语启蒙试用，请家长先了解，再陪孩子探索。</p>
    <ul className="ps-notice-list">
      <li><span aria-hidden="true">🌱</span><div><strong>听一点，玩一会儿</strong><p>先玩一小组，随时休息。跟读只记录参与，不评分。</p></div></li>
      <li><span aria-hidden="true">📦</span><div><strong>小岛保存在这台设备</strong><p>无账号或云同步。换机、换网址或清理浏览器前，需分别备份游戏存档、日记与原声。</p></div></li>
      <li><span aria-hidden="true">🎙️</span><div><strong>照片和录音都可不提供</strong><p>可用预设头像；拒绝麦克风仍可听故事、认图片。{import.meta.env.VITE_ONLINE?'网页版无云端转写。':'另行选择日记转写才会上传录音。'}</p></div></li>
    </ul>
    <p className="ps-muted">联网加载会产生必要的请求信息。数据用途、保管、删除和反馈方式见下方说明。</p>
    <ParentLinks/>
    <label className="ps-confirm"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/><span>我是陪伴的家长，已阅读试用与隐私说明，了解上述限制。</span></label>
    <p className="ps-muted">仅保存本机阅读状态，不会开启麦克风、相机或上传。</p>
    <div className="ps-actions"><button onClick={onClose}>暂不开始</button><button className="ps-primary" disabled={!checked} onClick={()=>{try{recordParentNotice(localStorage);}catch{/* Continue only for this session if storage is blocked. */}onContinue();}}>了解了，一起开始</button></div>
  </dialog>;
}

export type ParentPage='privacy'|'terms'|'feedback';
const titles:Record<ParentPage,string>={privacy:'隐私与数据说明',terms:'家长试用须知',feedback:'联系与反馈'};
export function ParentInformation({page}:{page:ParentPage}) {
  return <div className="parent-information ps-surface">
    <header className="ps-page-head"><a href="/">← 回到小岛首页</a><span>给陪伴的大人</span></header>
    <nav className="ps-page-nav" aria-label="家长说明">{(['terms','privacy','feedback'] as const).map(p=><a key={p} href={`/${p}/`} aria-current={page===p?'page':undefined}>{titles[p]}</a>)}</nav>
    <main><h1>{titles[page]}</h1><p className="ps-muted">说明版本 {PARENT_NOTICE_VERSION} · {import.meta.env.VITE_ONLINE?'联网网页版':'本地家庭版'}</p>
      {!parentContactReady&&<p className="ps-config-note" role="status">本地准备中：运营者与私密联系方式尚待确认，本说明暂不作为对外试用的完整告知。</p>}
      {page==='privacy'?<Privacy/>:page==='terms'?<Trial/>:<Feedback/>}
    </main><footer>先让孩子感到安心、被陪伴，再慢慢发现英语。</footer>
  </div>;
}
function Contact() {
  return <div className="ps-contact"><p>运营及儿童隐私联系负责人：{PARENT_CONTACT.operator||'待确认'}</p>
    {PARENT_CONTACT.email&&<p>家长专用邮箱：<a href={`mailto:${PARENT_CONTACT.email}`}>{PARENT_CONTACT.email}</a></p>}
    {PARENT_CONTACT.wechat&&<p>家长私密联系微信：<strong>{PARENT_CONTACT.wechat}</strong></p>}
    <p>请由家长联系，勿让孩子公开留下联系方式。更正、删除及隐私问题也使用上述渠道；我们不需要孩子的身份证明、学校或住址。</p>
  </div>;
}
function Privacy() {
  return <>
    <p className="ps-lead">照片、学习记录和录音默认留在当前浏览器。我们把“设备内保存”和“联网请求”分别说明，不将它们笼统称作“全部不联网”。</p>
    <section><h2>谁提供这个试用</h2><Contact/><p>本说明面向家长及监护人。请使用昵称和预设头像，不必填写孩子真实姓名、生日、学校或其他身份信息。</p></section>
    <section><h2>哪些内容保存在本机</h2><dl className="ps-data-list">
      <div><dt>训练师与小岛进度</dt><dd>昵称、预设或自选头像、伙伴、能量、设置和学习记录，用于继续游玩、安排复习和展示家长记录，保存在浏览器 IndexedDB。</dd></div>
      <div><dt>跟读原声</dt><dd>主动开启麦克风后，在设备内检测发声并保存可回听录音；不做发音准确度评分。最多保留最近 60 段，新增时可能替换最早录音。</dd></div>
      <div><dt>小日记</dt><dd>孩子主动录制的声音、家长填写的文字及生成的故事页留在本机，直到主动删除或浏览器清理。{import.meta.env.VITE_ONLINE?'此网页版没有云端转写，不会把日记录音发给火山。':'本地家庭版只有在另行点击“上传录音，转成文字”时，才经家庭服务发送给火山；请先阅读该功能的上传提示。'}</dd></div>
      <div><dt>阅读确认与资源缓存</dt><dd>localStorage 保存已阅读的说明版本和公告已读状态，帮助避免重复提示；图片、配音和页面缓存用于再次加载。阅读确认不代表验证了家长身份，也不是上传授权。</dd></div>
    </dl><p>除跟读原声的 60 段上限外，本机进度和日记没有自动到期删除。清除网站数据、空间不足或浏览器策略可能导致丢失；持久保存请求不是备份保证。</p></section>
    <section><h2>联网时发生什么</h2><p>{import.meta.env.VITE_ONLINE?'网页版由 Cloudflare Pages 托管。':'此说明也覆盖使用 Cloudflare Pages 的联网体验。'}打开页面、播放已生成的配音、加载模型及检查更新时，会向托管服务请求文件；服务可能处理 IP 地址、请求路径、时间和浏览器信息，用于传输与安全防护。其服务可能在不同国家或地区处理请求。</p><p>应用当前不接入广告、行为回放或用于营销的用户画像；没有账号注册或跨设备自动同步。预先生成的火山配音是供播放的资源，不需要上传孩子声音来播放。</p><p>托管服务的日志保留和处理适用其服务安排，不等同于本机存档的保存规则。具体运营配置仍需在对外试用前核实；我们不承诺服务器完全不留日志。</p><a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">查看 Cloudflare 隐私说明（外部网站）</a></section>
    <section><h2>不提供照片或录音，也能体验</h2><p>相册和拍照仅在主动选择头像时调用；可以一直使用预设头像。麦克风仅在点击录音/跟读时请求，拒绝后可以继续听故事、选择图片，并使用页面上的替代确认或由家长填写文字。</p><p>可以在浏览器的网站权限中撤回相机或麦克风权限。系统键盘听写属于设备或输入法服务，是否联网由该服务决定；不希望使用时可手动输入。</p></section>
    <section><h2>查看、更正、备份和删除</h2><ol>
      <li>修改昵称：家长中心 → 陪伴设置 → 训练师名字。更换/移除照片：点击头像，选择预设训练师并保存。</li>
      <li>备份：家长中心 → 应用维护 → 备份与恢复。游戏存档不包含录音和日记，需另行“备份全部日记与原声”；需要保留的跟读原声在学习概况中另存。</li>
      <li>清空：家长中心 → 应用维护 → 清空本机数据。确认后删除当前本机的存档、跟读录音和小日记，无法撤销；先导出需要保留的内容。</li>
      <li>撤回阅读确认、停止试用：家长中心的“暂停试用”会回到首页，下次开始时重新展示须知，不删除进度。若要连同资源缓存清除，可使用浏览器“清除该网站数据”；已经下载的备份需自行删除。</li>
    </ol><p>没有云端存档副本，运营者不能远程找回或读取你的本机内容。收到隐私或数据处理请求时，会通过家长联系渠道核对具体问题；请勿直接发送孩子原声或完整备份。</p></section>
    <section><h2>反馈与说明更新</h2><p>反馈草稿在当前页面生成，不自动保存或上传。只有你主动复制、下载或用邮件/微信发送时，内容才离开该页面。发送后所用邮箱或通信服务也会处理内容；联系记录仅用于回复和排查问题，不用于孩子画像或营销。反馈渠道的保存期限需要在开放试用前确认。</p><p>若增加云端存储、转写或其他数据用途，会先更新说明，再按需要单独告知并征求家长决定；不会用本次阅读确认代替未来的新授权。</p><a href="/feedback/">联系家长支持</a></section>
  </>;
}
function Trial() {
  return <>
    <p className="ps-lead">和伙伴听一听、看一看，把一点英语带进日常生活。先由家长准备，再把探索交给孩子。</p>
    <section><h2>第一次只做三件事</h2><ol><li>在家长中心选择适合孩子的英语阶段和游玩时长，不用按年龄硬性升阶。</li><li>认识一个伙伴，在“学英语”完成一小组，累了随时返回或休息。</li><li>回到小岛，在玩耍中再遇见一句英语；不必完成所有任务、集满奖励。</li></ol><p>建议从 5–10 分钟的陪伴体验开始，应用默认每日游玩上限为 15 分钟，家长可调整。学习记录反映参与，不等于熟练掌握或教学效果保证。</p></section>
    <section><h2>这次试用提供什么</h2><p>当前不收费，无内购；能量与精灵球是游玩道具，不代表金钱。功能仍在迭代，可能出现加载、画面或声音异常；可以随时退出和反馈，不要求坚持完成。</p><p>本项目为独立试验项目，并非 Pokémon 官方产品。角色等第三方资源不因源码开源而获得授权；试用说明本身也不代表资源授权已完成。</p></section>
    <section><h2>设备、网络与声音</h2><p>网页版需要持续联网，暂不提供完整离线安装。可在现代浏览器中尝试；iPad Safari、安卓设备及不同地区网络仍需逐步验证，不保证所有设备流畅。遇到卡顿可在家长中心降低画质。</p><p>声音可能需要先轻点页面才能播放。没有声音时先检查设备音量、浏览器静音与网络，再点“再听一次”；无需反复刷新或清理网站数据。麦克风不可用时可选页面提供的替代方式。</p></section>
    <section><h2>请保管好小岛</h2><p>固定使用同一个网址、设备和浏览器。隐私/无痕模式、换网址、换机或清理网站数据都可能让原进度不可见；游戏存档和日记原声需分别备份。更新前备份重要内容；更新异常时保留页面提示并联系家长支持。</p></section>
    <section><h2>安心退出和反馈</h2><p>家长可调整时长、暂停试用或删除本机数据。请不要在公开群、评论区或 GitHub Issue 分享孩子照片、原声、姓名和日记。我们更想知道孩子在哪一步听不懂、找不到，而不是答对了多少题。</p><Contact/><a href="/feedback/">整理一条反馈</a></section>
  </>;
}
function Feedback() {
  const [topic,setTopic]=useState<string>(FEEDBACK_TOPICS[0]);
  const [details,setDetails]=useState(''),[includeDevice,setIncludeDevice]=useState(false),[status,setStatus]=useState('');
  const preview=useRef<HTMLTextAreaElement>(null);
  const report=makeFeedbackReport({version:import.meta.env.VITE_APP_BUILD_ID,mode:import.meta.env.VITE_ONLINE?'联网网页版':'本地家庭版',topic,details,environment:includeDevice?feedbackEnvironment(navigator.userAgent,innerWidth,navigator.onLine):undefined});
  const download=()=>{const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='pokepal-parent-feedback.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('已准备文本文件，请在下载中查看；尚未发送。');};
  return <><Contact/><p className="ps-lead">先在这里整理，再由家长决定是否发送。不会自动上传。</p>
    <section className="ps-feedback-form"><h2>1. 简单说说发生了什么</h2><label>问题类型<select value={topic} onChange={e=>{setTopic(e.target.value);setStatus('');}}>{FEEDBACK_TOPICS.map(t=><option key={t}>{t}</option>)}</select></label>
    <label>问题说明<textarea value={details} maxLength={1500} rows={5} onChange={e=>{setDetails(e.target.value);setStatus('');}} placeholder="例如：点了再听一次，没有声音。其他页面正常。" aria-describedby="feedback-private-hint"/></label>
    <p id="feedback-private-hint" className="ps-muted">请只描述操作步骤，不写孩子真实姓名、学校或日记内容；这里不接收照片、录音和存档附件。离开页面后草稿不会保留。</p>
    <label className="ps-confirm"><input type="checkbox" checked={includeDevice} onChange={e=>{setIncludeDevice(e.target.checked);setStatus('');}}/><span>附上简化设备信息（浏览器及主版本、屏幕档位、联网状态，可选）</span></label></section>
    <section><h2>2. 检查将要分享的文字</h2><textarea className="ps-report" ref={preview} readOnly rows={10} aria-label="反馈文本预览" value={report}/><p className="ps-muted">自动部分只包含本页版本、运行方式和你勾选的信息；不会读取游戏数据或附带错误堆栈。若从旧页面遇到问题，请补充当时“网页体验与更新”显示的版本。</p>
    <div className="ps-actions"><button onClick={async()=>{try{await navigator.clipboard.writeText(report);setStatus('已复制，尚未发送。请通过上方私密联系方式分享。');}catch{preview.current?.focus();preview.current?.select();setStatus('未能自动复制，已选中文字，可手动复制或下载文本。');}}}>复制反馈</button><button onClick={download}>下载文本</button>
    {PARENT_CONTACT.email&&<a className="ps-primary" href={`mailto:${PARENT_CONTACT.email}?subject=${encodeURIComponent(`PokéPal 家长反馈：${topic}`)}&body=${encodeURIComponent(report)}`} onClick={()=>setStatus('请在邮件应用中再次检查并自行发送。本页不能确认邮件是否发出。')}>用邮件联系</a>}</div><p role="status" className="ps-status">{status}</p></section>
    <section><h2>数据问题怎么处理</h2><p>本机进度的更正、导出、删除路径见<a href="/privacy/">隐私与数据说明</a>。若你曾通过邮箱或微信发送反馈，可通过同一渠道提出更正或删除请求；不要为证明身份发送孩子证件或原始录音。</p></section>
  </>;
}
