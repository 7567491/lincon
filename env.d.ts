/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LINODE_API_TOKEN?: string;
  readonly VITE_S3_ACCESS_KEY?: string;
  readonly VITE_S3_SECRET_KEY?: string;
  readonly VITE_S3_REGION?: string;
  readonly VITE_S3_ENDPOINT?: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
