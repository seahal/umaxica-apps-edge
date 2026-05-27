/// <reference types="vite-plus/test/globals" />
/// <reference types="node" />

declare module '@cloudflare/workers-types' {
  interface Env {
    BRAND_NAME?: string;
    DEV_CORE_URL?: string;
  }
}
