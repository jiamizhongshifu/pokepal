interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_APP_BUILD_ID: string;
  readonly VITE_ONLINE: boolean;
  readonly VITE_VOICE_SHARDS: readonly string[];
  readonly VITE_VOICE_BASE?: string;
  readonly VITE_CHATWOOT_WEBSITE_TOKEN?: string;
}
