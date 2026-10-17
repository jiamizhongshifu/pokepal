import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pokepal.family',
  appName: '宝可梦小小训练师',
  webDir: '.build/android-web',
  server: { androidScheme: 'https', errorPath: 'device-unsupported.html' },
  android: { allowMixedContent: false, minWebViewVersion: 111 },
};
export default config;
