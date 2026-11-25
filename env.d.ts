/// <reference types="vite/client" />

/**
 * Ambient typings for Vite + Vue SFCs.
 * - `*.vue` modules so TypeScript can import components
 * - `ImportMetaEnv` for `VITE_*` variables used in the app
 */

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_BASE_URL?: string;
  readonly BASE_URL: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
