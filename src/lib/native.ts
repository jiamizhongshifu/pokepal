import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useGame } from '../store';
import { stopSpeech } from './speech';
import { releaseMic } from './mic';

// Keep Android back navigation inside the child's current activity before leaving the app.
export function setupNative() {
  if(!Capacitor.isNativePlatform())return;
  void App.addListener('backButton',()=>{
    const {screen,go}=useGame.getState();
    stopSpeech();releaseMic();
    switch(screen.name){
      case 'welcome':case 'home':void App.exitApp();break;
      case 'story':go({name:'home'});break;
      case 'task':go(screen.practice?{name:'practice'}:{name:'home'});break;
      case 'dexDetail':go({name:'dex',picking:screen.picking,browse:screen.browse});break;
      case 'notebook':case 'review':go({name:screen.returnTo??'home'});break;
      default:go({name:'home'});
    }
  });
  void App.addListener('appStateChange',({isActive})=>{
    if(!isActive){stopSpeech();releaseMic();}
  });
}
