/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORT?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_AI_API_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_REQUEST_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv & Record<string, string | boolean | undefined>;
}
