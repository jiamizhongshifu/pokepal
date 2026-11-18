import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pokepal.family',
  appName: '啵啵岛',
  webDir: '.build/android-web',
  server: { androidScheme: 'https', errorPath: 'device-unsupported.html' },
  android: { allowMixedContent: false, minWebViewVersion: 111 },
};
export default config;
