import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// THEMIS brightness-temperature files (PDS, static.mars.asu.edu) do not send CORS headers,
// so the browser reads them through this proxy: /asu-pds/... → https://static.mars.asu.edu/...
// Range requests are forwarded, so only the rows over Jezero are downloaded.
// Works with `npm run dev` and `npm run preview` (not in a static deploy).
const asuPdsProxy = {
  '/asu-pds': {
    target: 'https://static.mars.asu.edu',
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/asu-pds/, '')
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: asuPdsProxy },
  preview: { proxy: asuPdsProxy }
})
