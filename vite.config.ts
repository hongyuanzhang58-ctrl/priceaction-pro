import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills({
    include: ['crypto', 'stream', 'events', 'util', 'buffer'],
    globals: {
      Buffer: true,
      global: true,
      process: true,
    },
  }), cloudflare()],
})