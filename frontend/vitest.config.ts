import { defineConfig } from 'vitest/config';
import path from 'path';

// Pure-function unit tests (no DOM) — drag math, date utils, dependency cycle
// guard. Mirrors the tsconfig `@/*` alias so test imports resolve.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
