import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/Quick-quiz/' : '/',
  build: { sourcemap: false, target: 'es2022' },
}));
