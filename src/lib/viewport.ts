/** A single viewport contract for fixed app screens, including iPad window resizing. */
export function installViewportSizing() {
  const root = document.documentElement;
  // Installed WebKit can report an innerHeight that excludes the status-bar inset.
  // Let CSS viewport units size this mode, including when the iPad window is resized.
  root.toggleAttribute('data-ipad-standalone', isInstalledIPad());
  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      // Use the app window, never screen.height: iPad can run in Split View or Stage Manager.
      if (isInstalledIPad()) root.style.removeProperty('--app-height');
      else root.style.setProperty('--app-height', `${window.innerHeight}px`);
    });
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('pageshow', update);
  document.addEventListener('visibilitychange', update);
  window.visualViewport?.addEventListener('resize', update);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', update);
    window.removeEventListener('pageshow', update);
    document.removeEventListener('visibilitychange', update);
    window.visualViewport?.removeEventListener('resize', update);
  };
}

export function viewportReport() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.append(probe);
  const css = getComputedStyle(probe);
  const safe = {top:parseFloat(css.paddingTop),bottom:parseFloat(css.paddingBottom),left:parseFloat(css.paddingLeft),right:parseFloat(css.paddingRight)};
  const fixed = probe.getBoundingClientRect().toJSON();
  const units = Object.fromEntries(['vh','svh','lvh','dvh'].map(unit => {
    probe.style.cssText = `position:absolute;top:0;left:0;width:1px;height:100${unit};visibility:hidden;pointer-events:none`;
    return [unit, probe.getBoundingClientRect().height];
  }));
  probe.remove();
  const rect = (selector:string) => Array.from(document.querySelectorAll(selector)).find(e=>e.getClientRects().length>0)?.getBoundingClientRect().toJSON() ?? null;
  return {
    version:'ipad-viewport-20261015-3',
    units, sizing:document.documentElement.hasAttribute('data-ipad-standalone')?'css-vh':'window',
    document:rect('html'),body:rect('body'),
    fullscreen:{supported:!!document.fullscreenEnabled,active:!!document.fullscreenElement},
    standalone:!!(navigator as Navigator & {standalone?:boolean}).standalone || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches,
    window:{width:innerWidth,height:innerHeight},
    screen:{width:screen.width,height:screen.height,availableWidth:screen.availWidth,availableHeight:screen.availHeight},
    visual:visualViewport ? {width:visualViewport.width,height:visualViewport.height,offsetTop:visualViewport.offsetTop,scale:visualViewport.scale} : null,
    safe,fixed,root:rect('#root'),page:rect('.screen'),canvas:rect('.home-canvas canvas'),
    scroll:{height:document.documentElement.scrollHeight,clientHeight:document.documentElement.clientHeight,y:scrollY},
    statusBar:document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content'),
  };
}

/** Invoked synchronously from a tap; unavailable/rejected fullscreen never blocks play. */
export async function requestGameFullscreen() {
  if (document.fullscreenElement) return true;
  if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) return false;
  try {
    await document.documentElement.requestFullscreen({navigationUI:'hide'});
    return !!document.fullscreenElement;
  } catch {return false;}
}

export function isInstalledIPad() {
  const ipad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ipad && (!!(navigator as Navigator & {standalone?:boolean}).standalone || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches);
}
