import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig(({ mode }) => ({
  base:
    mode === 'production'
      ? '/Vibe_MosaicGame_TS-Vuetify-Vite_Cursor-GPT-5-6-Sol/'
      : '/',
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
}))
