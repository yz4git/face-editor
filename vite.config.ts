import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/client',
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    host: true,
    allowedHosts: ['terminal.local'],
  },
});
