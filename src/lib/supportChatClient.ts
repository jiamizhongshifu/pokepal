type EnabledConfig = { baseUrl: string; websiteToken: string };
type Widget = {
  hasLoaded: boolean;
  isOpen: boolean;
  toggle: (state: 'open' | 'close') => void;
  setLocale: (locale: string) => void;
};
declare global {
  interface Window {
    chatwootSettings?: Record<string, unknown>;
    chatwootSDK?: { run: (config: { baseUrl: string; websiteToken: string }) => void };
    $chatwoot?: Widget;
  }
}
let pending: Promise<Widget> | undefined;
export const chatLocale = (locale: string) => locale === 'zh-CN' ? 'zh_CN' : 'en';

// Shared SDK adapter: one instance per document; no app login or API credentials.
export function loadSupport(config: EnabledConfig, locale: string): Promise<Widget> {
  if (window.$chatwoot?.hasLoaded) return Promise.resolve(window.$chatwoot);
  if (pending) return pending;
  pending = new Promise<Widget>((resolve, reject) => {
    const done = () => {
      if (!window.$chatwoot?.hasLoaded) return;
      cleanup();
      const frame = document.getElementById('chatwoot_live_chat_widget');
      frame?.setAttribute('title', locale === 'zh-CN' ? '客服对话' : 'Support conversation');
      resolve(window.$chatwoot);
    };
    const fail = () => {
      cleanup();
      if (!window.chatwootSDK) document.getElementById('support-chat-sdk')?.remove();
      reject(new Error('SUPPORT_UNAVAILABLE'));
    };
    const timer = window.setTimeout(fail, 15000);
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('chatwoot:ready', done);
    };
    window.addEventListener('chatwoot:ready', done);
    window.chatwootSettings = {
      hideMessageBubble: false, position: 'right', locale: chatLocale(locale),
      useBrowserLanguage: false, darkMode: 'light',
      showUnreadMessagesDialog: false, enableFileUpload: false
    };
    const run = () => {
      try { window.chatwootSDK!.run(config); } catch { fail(); }
    };
    if (window.$chatwoot) {
      // Retry an iframe whose first network load failed, without a second SDK.
      const frame = document.getElementById('chatwoot_live_chat_widget') as HTMLIFrameElement | null;
      if (frame) frame.src = frame.src;
      else fail();
    } else if (window.chatwootSDK) run();
    else {
      const script = document.createElement('script');
      script.id = 'support-chat-sdk';
      script.src = `${config.baseUrl}/packs/js/sdk.js`;
      script.async = true;
      script.onload = run;
      script.onerror = fail;
      document.head.appendChild(script);
    }
  }).catch((error) => { pending = undefined; throw error; });
  return pending;
}
