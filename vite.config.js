import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    proxy: {
      '/api': '${import.meta.env.VITE_API_URL}'
    }
  }
});
