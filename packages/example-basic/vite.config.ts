/// <reference types="vite/client" />
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    minify: false,
    rollupOptions: {
      plugins: [nodePolyfills()],
    },
  },
  define: {
    global: 'window',
  },
  preview: {
    port: 8000,
  },
  server: {
    port: 8000,
  },
});
