export const FEEDBACK_TOPICS = ['声音与配音', '页面与按钮', '学习与玩法', '进度与更新', '隐私、更正或删除', '其他建议'] as const;
export type FeedbackTopic = typeof FEEDBACK_TOPICS[number];

// Deliberately allowlisted: never serialize navigator, location, game state, errors or storage.
export function feedbackEnvironment(userAgent:string, width:number, online:boolean) {
  const match = userAgent.match(/(Edg|CriOS|Chrome|FxiOS|Firefox)\/(\d+)/);
  const safari = userAgent.match(/Version\/(\d+).*Safari/);
  const names:Record<string,string>={Edg:'Edge',CriOS:'Chrome',Chrome:'Chrome',FxiOS:'Firefox',Firefox:'Firefox'};
  const browser=match?`${names[match[1]]} ${match[2]}`:safari?`Safari ${safari[1]}`:'其他浏览器';
  return {browser, screen:width<600?'小屏':width<1100?'中屏':'大屏', network:online?'浏览器报告联网':'浏览器报告离线'};
}
export function makeFeedbackReport(input:{version:string;mode:string;topic:string;details:string;environment?:ReturnType<typeof feedbackEnvironment>}) {
  const topic=FEEDBACK_TOPICS.includes(input.topic as FeedbackTopic)?input.topic:'其他建议';
  const lines=['PokéPal 家长反馈',`页面版本：${input.version}`,`运行方式：${input.mode}`,`问题类型：${topic}`];
  if(input.environment)lines.push(`浏览器：${input.environment.browser}`,`屏幕：${input.environment.screen}`,`联网状态：${input.environment.network}`);
  lines.push('', '家长填写的说明：', input.details.trim().slice(0,1500)||'（请补充：在哪一步、发生了什么、希望怎样）', '', '此报告不自动附带孩子姓名、头像、录音、日记、存档、网址参数或设备标识。请在发送前检查手写内容。');
  return lines.join('\n');
}

// Keep long Chinese feedback out of mailto URLs; copying/downloading preserves the full report.
export function feedbackMailDraft(email:string,topic:string,report:string){
  const subject=`PokéPal 家长反馈：${topic}`;
  const base=`mailto:${email}?subject=${encodeURIComponent(subject)}`;
  const full=`${base}&body=${encodeURIComponent(report)}`;
  const needsPaste=full.length>1800;
  return {href:needsPaste?base:full,needsPaste};
}
