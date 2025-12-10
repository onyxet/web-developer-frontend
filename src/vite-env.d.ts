interface ImportMetaEnv {
  readonly VITE_ALCHEMY_KEY: string
  readonly VITE_PROJECT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
